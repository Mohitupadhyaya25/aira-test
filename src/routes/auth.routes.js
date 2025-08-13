const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');


router.post('/register', authController.Register);
router.post('/login', authController.Login);
router.post('/refresh', authController.Refresh);
router.post('/logout', authController.Logout);

module.exports = router;