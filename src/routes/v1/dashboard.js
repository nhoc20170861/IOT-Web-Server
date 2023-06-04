const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/v1/DashboardController');
const { authJwt } = require('../../middlewares');
import UploadController from '../../controllers/v1/UploadController';
const uploadMulter = require('../../models/ModelMulter');
// Show dashboard interface for user role

// get page view data_sensor
router.get('/data', [authJwt.verifyToken], dashboardController.getDataSelect);
router.get('/data/:slug', [authJwt.verifyToken], dashboardController.getDataDetail);

router.get('/product', [authJwt.verifyToken], dashboardController.getProduct);
router.get('/knowledge', [authJwt.verifyToken], dashboardController.getKnowledge);
// router.get('/team', [authJwt.verifyToken], dashboardController.getTeam);
router.get('/robot', [authJwt.verifyToken], dashboardController.getRobotGui);
router.get('/controller', [authJwt.verifyToken], dashboardController.getController);
router.post('/weather/show', dashboardController.getWeather);

router.get('/showquiz', [authJwt.verifyToken], dashboardController.showQuiz);
router.post('/saveAnswer', dashboardController.saveAnswer);
router.post('/submitAnswer', dashboardController.submitAnswer);

// Handling request upload file
router.post('/upload/photo', [authJwt.verifyToken, uploadMulter.single('myImage')], UploadController.uploadSingleFile);
//upload nhiều files ví dụ như hình ảnh của sản phẩm
router.post('/uploadMultiple', [authJwt.verifyToken, uploadMulter.array('myFiles', 12)], UploadController.uploadMultipleFiles);

// router for admin role
router.get('/admin/quiz', [authJwt.verifyToken, authJwt.isAdmin], dashboardController.show_admindashBoard);

router.post('/admin/createquestion', dashboardController.createQuestion);
router.post('/admin/resetquestion', dashboardController.resetQuestion);
router.post('/admin/resetDataSensor', dashboardController.resetDataSensor); // truncate tabel data_sensor in mysql
module.exports = router;
