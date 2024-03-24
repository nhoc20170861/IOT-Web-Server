const express = require('express');
const router = express.Router();
const { dashboardController, iotDevicesController, AdminApiHandle } = require('../../controllers/v1/DashboardController');
const { authJwt } = require('../../middlewares');
import UploadController from '../../controllers/v1/UploadController';
const uploadMulter = require('../../models/ModelMulter');
// Show dashboard interface for user role

// get page view data_sensor
router.get('/device-list', [authJwt.verifyToken], dashboardController.getDeviceList);
router.get('/data/:deviceId', [authJwt.verifyToken], dashboardController.getDataDetail);

router.get('/product', [authJwt.verifyToken], dashboardController.getProduct);
router.get('/knowledge', [authJwt.verifyToken], dashboardController.getKnowledge);
router.get('/controller', [authJwt.verifyToken], dashboardController.getController);
// router.get('/team', [authJwt.verifyToken], dashboardController.getTeam);
// router.get('/robot', [authJwt.verifyToken], dashboardController.getRobotGui);
router.get('/weather-data', dashboardController.getWeather);

// router.get('/showquiz', [authJwt.verifyToken], dashboardController.showQuiz);
router.post('/saveAnswer', dashboardController.saveAnswer);
router.post('/submitAnswer', dashboardController.submitAnswer);

// Handling request upload file
router.post('/upload/photo', [authJwt.verifyToken, uploadMulter.single('myImage')], UploadController.uploadSingleFile);
//upload nhiều files ví dụ như hình ảnh của sản phẩm
router.post('/uploadMultiple', [authJwt.verifyToken, uploadMulter.array('myFiles', 12)], UploadController.uploadMultipleFiles);

// router for admin role
router.get('/admin', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.show_admindashBoard);
router.post('/admin/createquestion', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.createQuestion);
router.post('/admin/resetquestion', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.resetQuestion);
router.post('/admin/resetDataSensor', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.resetDataSensor); // truncate tabel data_sensor in mysql
router.post('/admin/createDevice', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.createDevice);
router.post('/admin/deleteDevice', [authJwt.verifyToken, authJwt.isAdmin], AdminApiHandle.deleteDevice);

// url for controll IOT devices from dashboard
router.post('/controller/lamp_timer', [authJwt.verifyToken], iotDevicesController.setLampTimer);
router.post('/controller/lamp', [authJwt.verifyToken], iotDevicesController.controlLamp);
router.get('/controller/lamp_status', [authJwt.verifyToken], iotDevicesController.getLampStatus);
router.get('/fetchDataSensor/:slug', [authJwt.verifyToken], iotDevicesController.fetchDataSensor);
router.get('/controller/lamp_status', [authJwt.verifyToken], iotDevicesController.getLampStatus);
router.get('/testDataSensor/:slug', [authJwt.verifyToken], iotDevicesController.testDataSensor);
// IOT devices online event
router.post('/device-connect/:deviceId', iotDevicesController.initDevice);
module.exports = router;
