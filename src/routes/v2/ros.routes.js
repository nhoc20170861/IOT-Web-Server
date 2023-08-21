import { Router } from 'express';
import { verifyTokenInHeaderReq } from '../../middlewares/handleJwt';
const router = Router();

import RosController from '../../controllers/v2/ros.controller';
const rosController = new RosController();

router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
});

router.get('/robot/getConfigMap/:fileName', rosController.getConfigMap);
/**
 * @brief Api is used to setTargetPointFromCallStation from call station esp32
 *
 * */
router.post('/robot/setTargetPoint', rosController.setTargetPoint);
router.get('/robot/getStatusOfAllRobots', rosController.getStatusOfAllRobots);
/**
 * @brief Api used to create and get targetPoint list
 *
 * */
router.post('/robot/createNewTargetPoint', rosController.createNewTargetPoint);
router.get('/robot/getAllTargetPoint', rosController.getAllTargetPoint);
/**
 * @brief Api used to auto pick robot to execute taskList
 *
 * */
router.get('/robot/getTaskQueueFromAllRobots', rosController.getTaskQueueFromAllRobots);
router.post('/robot/resetAllTaskQueue', rosController.resetAllTaskQueue);
router.post('/robot/createNewTask', rosController.createNewTask);
/**
 * @brief Api used to tracking path of the robots
 *
 * */
router.get('/robot/getCurrentPose', rosController.getCurrentPose);
router.get('/robot/getRobotConfigs', rosController.getRobotConfigs);

/**
 * @brief Api remote to a robot through server
 *
 * */
router.post('/robot/:robotId/add-new-goal', rosController.addNewGoalToTaskList);
router.post('/robot/:robotId/create-new-task', rosController.createNewTaskForOneRobot);
router.post('/robot/:robotId/reset-all-goals', rosController.callServiceResetAllGoals);
router.get('/robot/:robotId/get-current-status', rosController.callServiceGetCurrentStatus);

router.post('/robot/:robotId/state/toggle-state', rosController.callServiceToggleState);
router.post('/robot/:robotId/state/set-state', rosController.callServiceSetState);
router.get('/robot/:robotId/state/get-state', rosController.callServiceGetState);

export default router;
