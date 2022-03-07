const express = require('express');
const { verifySignUp } = require('../middleware');
const router = express.Router();

const registerController = require('../app/controllers/RegisterController');

// GET register form
router.get('/', registerController.index);

// POST request register
router.post(
    '/',
    [
        verifySignUp.checkDuplicateUsernameOrEmail,
        verifySignUp.checkRolesExisted,
    ],
    registerController.signup,
);

module.exports = router;
