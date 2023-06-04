const express = require('express');
const router = express.Router();
const { authJwt } = require('../../middlewares');
const changePasswordController = require('../../controllers/v1/ChangePassController');

router.get('/', [authJwt.verifyToken], changePasswordController.getForm);
router.post('/change_process', changePasswordController.changePassword);

module.exports = router;
