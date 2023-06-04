const express = require('express');
const { verifySignUp } = require('../../middlewares');
const router = express.Router();

const registerController = require('../../controllers/v1/RegisterController');

// GET register form
router.get('/', registerController.index);

// POST request register
router.post('/', [verifySignUp.checkDuplicateUsernameOrEmail, verifySignUp.checkRolesExisted], registerController.signup);

module.exports = router;
