# Authentication API Service

A secure authentication service built with Node.js, Express, and MySQL, featuring JWT-based authentication with refresh tokens and account security measures.

## Features

- User registration and authentication
- JWT-based access tokens with refresh token rotation
- Account security with login attempt limiting
- MySQL database with Sequelize ORM
- Express.js REST API

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a MySQL database
4. Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

## Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aira
DB_USER=root
DB_PASSWORD=your_password

JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

## Running the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securepassword"
}
```

#### Refresh Token
```
POST /api/auth/refresh
```

#### Logout
```
POST /api/auth/logout
```

## Security Features

- Password hashing with bcrypt
- JWT token rotation
- Account locking after 5 failed attempts
- HTTP-only cookies for refresh tokens
- CORS protection
- Helmet security headers

## Database Schema

### Users Table
- id (UUID, Primary Key)
- email (String, Unique)
- passwordHash (String)
- roles (JSON)
- refreshTokenHash (String, Nullable)
- failedLoginAttempts (Integer)
- lockUntil (DateTime, Nullable)
- createdAt (DateTime)
- updatedAt (DateTime)

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 409: Conflict
- 423: Locked
- 500: Internal Server Error

## License

MIT
