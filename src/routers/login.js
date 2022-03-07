const express = require('express');
const { verify } = require('jsonwebtoken');
const router = express.Router();
const loginController = require('../app/controllers/LoginController');
const { authJwt } = require('../middleware');

// GET login form
router.get('/login', loginController.index);

// logout  quiz
router.post('/logout', loginController.signout);

// POST resquest login
router.post('/process_login', loginController.signin);

// GET refresh token
router.get(
    '/refreshtoken',
    [authJwt.verify_refreshToken],
    loginController.refreshToken,
);

module.exports = router;
