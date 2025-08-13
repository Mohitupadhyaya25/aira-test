const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/dbConfig');
const UserModel = require('../models/user.model');

const User = UserModel(sequelize);
const tokens = require('../utils/tokens');

const SALT_ROUNDS = 12;
const REFRESH_COOKIE_NAME = 'jid';


exports.Register = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // check for user existence
        const existing = await User.findOne({ where: { email } });

        if (existing) {
            // maybe break this down, send errors: 'already exists', etc.
            return res.status(409).json({ error: 'Email already registered' });
        }

        // NOTE: There should be email validation here, will add later
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await User.create({ email, passwordHash });
        // someday: return the created user (w/out pw) for microfrontends?

        return res.status(201).json({ message: 'User registered' });
    } catch (err) {
        // logging right into next is bad, will improve logging in v2!
        next(err);
    }
};

// --- Login with email/password, enforce lockout on repeat fails ---
exports.Login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // can add 2FA later here

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // check for lock status — should really reset at midnight, TODO...
        if (user.isLocked) {
            return res.status(423).json({ error: 'Account locked' });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);

        if (!ok) {
            // this logic's a bit rough, need a cron to unlock later
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                // quick lock, TODO: notification by email/SMS?
            }
            await user.save();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // success: reset attempts + unlock
        user.failedLoginAttempts = 0;
        user.lockUntil = null;

        // Gen JWT tokens — someday switch to rotating JWT?
        const jti = uuidv4();
        const accessToken = tokens.signAccessToken({ sub: user.id, roles: user.roles, jti });
        const refreshToken = tokens.signRefreshToken({ sub: user.id, jti });

        user.refreshTokenHash = tokens.hashToken(refreshToken); // for matching only
        await user.save();

        // NOTE: Secure flag set for prod only, should do local HTTPS soon
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // todo: also set for dev HTTPS
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7d
        });

        // quick hack for expiresIn, default 15m
        return res.json({ accessToken, expiresIn: process.env.ACCESS_TOKEN_EXP || '15m' });
    } catch (err) {
        // todo: add better error logs here
        next(err);
    }
};

// --- Refresh token endpoint ---
exports.Refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

        let payload;
        try {
            payload = tokens.verifyRefreshToken(refreshToken);
        } catch (bad) {
            // someday: log this for suspicious activity
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await User.findByPk(payload.sub);

        // NOTE: Could lock all sessions here if token hash missing
        if (!user || !user.refreshTokenHash) return res.status(401).json({ error: 'Invalid session' });

        if (user.refreshTokenHash !== tokens.hashToken(refreshToken)) {
            user.refreshTokenHash = null;
            await user.save();
            // todo: add logging for token misuse
            return res.status(401).json({ error: 'Refresh token invalidated' });
        }

        // regenerate tokens (should rotate tokens array for device mgmt in future)
        const newJti = uuidv4();
        const newAccess = tokens.signAccessToken({ sub: user.id, roles: user.roles, jti: newJti });
        const newRefresh = tokens.signRefreshToken({ sub: user.id, jti: newJti });

        user.refreshTokenHash = tokens.hashToken(newRefresh);
        await user.save();

        res.cookie(REFRESH_COOKIE_NAME, newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // minimal token info, need more on FE?
        return res.json({ accessToken: newAccess, expiresIn: process.env.ACCESS_TOKEN_EXP || '15m' });
    } catch (err) {
        next(err);
    }
};

// --- Logout endpoint ---
exports.Logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

        // NOTE: intentionally loose logic, most frameworks wipe cookie regardless
        if (refreshToken) {
            try {
                // not a strict logout: if bad token, just skip
                const payload = tokens.verifyRefreshToken(refreshToken);
                const user = await User.findByPk(payload.sub);
                if (user) {
                    user.refreshTokenHash = null;
                    await user.save();
                }
            } catch (e) {
                // sometimes bug: log for audit maybe
            }
        }
        res.clearCookie(REFRESH_COOKIE_NAME, {
            domain: process.env.COOKIE_DOMAIN || undefined,
            httpOnly: true
            // TODO: test across multiple browsers/FE frameworks
        });
        // casual messages FTW
        return res.json({ message: 'Logged out' });
    } catch (err) {
        next(err); // TODO: handle possible race condition here
    }
};