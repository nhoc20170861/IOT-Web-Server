import { Router } from 'express';
import { verifyTokenInHeaderReq } from '../../middlewares/handleJwt';
const router = Router();

import RosController from '../../controllers/v2/ros.controller';
const rosController = new RosController();


router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
});


/**
 * @brief Api used to auto pick robot to execute taskList
 * 
 * */
router.get('/robot/getTaskQueueFromAllRobots',rosController.getTaskQueueFromAllRobots);
router.post('/robot/resetAllTaskQueue',rosController.resetAllTaskQueue);
router.post('/robot/send-task-list', rosController.sendTaskListToOneRobot);
/**
 * @brief Api remote to a robot through server 
 * 
 * */
router.post('/robot/:id/send-task-list', rosController.sendTaskListToOneRobot);
router.post('/robot/:id/resetAllGoals', rosController.callServiceResetAllGoals);
router.get('/robot/:id/get-current-status', rosController.callServiceGetCurrentStatus);


router.post('/robot/:id/state/toggle-state', rosController.callServiceToggleState);
router.post('/robot/:id/state/set-state', rosController.callServiceSetState);
router.get('/robot/:id/state/get-state', rosController.callServiceGetState);

export default router;
