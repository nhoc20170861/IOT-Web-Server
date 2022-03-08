const express = require('express');
const router = express.Router();
const { authJwt } = require('../middleware');
const changePasswordController = require('../app/controllers/ChangePassController');

router.get('/', [authJwt.verifyToken], changePasswordController.getForm);
router.post('/change_process', changePasswordController.changePassword);

module.exports = router;