import Logging from '../../library/Logging';
import { queueRobots } from './bullmq';
import path from 'path';
const jsonfile = require('jsonfile');
// Required ROSlib and Ros API Dependencies
global.ROSLIB = require('roslib');

// import module handle database
const db = require('../../models');
const PositionGoal = db.position_goals;
const Robot = db.robot;
const SubTask = db.SubTask;
const Task = db.Task;

var totalCountTargetPoint = 0;
// robot models
global.GoalPoseArray = {};
global.robotConfigs = {};
// currentPose of all robot
global.currentPose = {};
// monitor status of all robots
global.statusOfAllRobots = {};
// setTimeout(async function () {

/**
 * @brief bộ dữ liệu cho Mir
 */
const allPositionGoals = [
    {
        pointName: 'point_1',
        pointType: 'Goal point',
        xCoordinate: 5.0,
        yCoordinate: -10.0,
        theta: -1.57
    },
    {
        pointName: 'point_2',
        pointType: 'Goal Point',
        xCoordinate: 5.0,
        yCoordinate: -23.0,
        theta: -1.57
    },
    {
        pointName: 'point_3',
        pointType: 'Goal Point',
        xCoordinate: -5.0,
        yCoordinate: -23.0,
        theta: -1.57
    },
    {
        pointName: 'point_4',
        pointType: 'Goal Point',
        xCoordinate: -5.0,
        yCoordinate: -10.0,
        theta: -1.57
    },
    {
        pointName: 'point_5',
        pointType: 'Goal Point',
        xCoordinate: -5.0,
        yCoordinate: 7.8,
        theta: -1.57
    },
    {
        pointName: 'home_1',
        pointType: 'Home Point',
        xCoordinate: 5.03,
        yCoordinate: 9.94,
        theta: 0
    },
    {
        pointName: 'home_2',
        pointType: 'Home Point',
        xCoordinate: 0.0,
        yCoordinate: 9.96,
        theta: 0
    },
    {
        pointName: 'home_3',
        pointType: 'Home Point',
        xCoordinate: 0.01,
        yCoordinate: 7.87,
        theta: 0
    }
];
(async function () {
    // Lấy toàn bộ bản ghi từ cơ sở dữ liệu
    // await PositionGoal.findAll().then((allPositionGoals) => {
    //     // Phân loại bản ghi theo pointType
    //     allPositionGoals.forEach((positionGoal) => {
    //         const { pointName } = positionGoal;
    //         if (!GoalPoseArray.hasOwnProperty(pointName)) {
    //             GoalPoseArray[pointName] = {
    //                 position: {
    //                     x: positionGoal.xCoordinate,
    //                     y: positionGoal.yCoordinate,
    //                     z: 0
    //                 },
    //                 orientation: {
    //                     x: 0,
    //                     y: 0,
    //                     z: ParseFloat(Math.sin(positionGoal.theta / 2.0), 2),
    //                     w: ParseFloat(Math.cos(positionGoal.theta / 2.0), 2)
    //                 }
    //             };
    //         } else {
    //         }
    //     });
    // });
    // ==================================
    allPositionGoals.forEach((positionGoal) => {
        const { pointName } = positionGoal;
        if (!GoalPoseArray.hasOwnProperty(pointName)) {
            GoalPoseArray[pointName] = {
                position: {
                    x: positionGoal.xCoordinate,
                    y: positionGoal.yCoordinate,
                    z: 0
                },
                orientation: {
                    x: 0,
                    y: 0,
                    z: ParseFloat(Math.sin(positionGoal.theta / 2.0), 2),
                    w: ParseFloat(Math.cos(positionGoal.theta / 2.0), 2)
                }
            };
        } else {
        }
    });
    totalCountTargetPoint = Object.keys(GoalPoseArray).length;

    await Robot.findAll().then((allRobot) => {
        // Phân loại bản ghi theo robotName
        allRobot.forEach((robot) => {
            const { robotName, initPoint } = robot;
            // create object to store status of all robots
            if (!statusOfAllRobots.hasOwnProperty(robotName)) {
                statusOfAllRobots[robotName] = 'free';
            }

            if (!robotConfigs.hasOwnProperty(robotName)) {
                robotConfigs[robotName] = {
                    ...robot.dataValues,
                    topicSubNav: '/move_base_sequence/statusNav',
                    currentGoal: robot.initPoint,
                    taskQueue: [{ indexActiveTask: 0, taskId: '', robotName: robotName }],
                    currentStatus: 'free'
                };
                currentPose[robotName] = GoalPoseArray[initPoint];
            } else {
            }
        });
        console.log(robotConfigs);
        //console.log(currentPose);
    });

    Logging.info(`Start connect to each robot`);
    Object.keys(robotConfigs).forEach((key, index) => {
        // khởi tạo websocket
        const websocket = `ws://${robotConfigs[key].ip}:${robotConfigs[key].portWebSocket}`;
        robotConfigs[key].rosWebsocket = new ROSLIB.Ros({ encoding: 'ascii' });
        // xử lý event khi ros connected
        robotConfigs[key].rosWebsocket.on('connection', function () {
            Logging.info(`Connected to websocket ros ${robotConfigs[key].robotName} server`);
        });

        robotConfigs[key].rosWebsocket.on('close', function (e) {
            Logging.info(`Try to connect to robot ${robotConfigs[key].robotName} through websocket`);
        });

        robotConfigs[key].rosWebsocket.on('error', function (error) {
            Logging.error(`Server can not connect to ros, ${error.message}`);
        });
        robotConfigs[key].rosWebsocket.connect(websocket);

        // Khởi tạo node subcribe topic
        robotConfigs[key]['statusNav'] = new ROSLIB.Topic({
            ros: robotConfigs[key].rosWebsocket,
            name: '/' + robotConfigs[key].robotName + robotConfigs[key].topicSubNav,
            messageType: 'std_msgs/String'
        });

        robotConfigs[key]['poseTopic'] = new ROSLIB.Topic({
            ros: robotConfigs[key].rosWebsocket,
            name: '/' + robotConfigs[key].robotName + '/amcl_pose',
            messageType: 'geometry_msgs/PoseWithCovarianceStamped'
        });

        // handle when new message from topic subcribe
        robotConfigs[key]['statusNav'].subscribe(async function (response) {
            const { data } = response;
            statusOfAllRobots[key] = data;
            if (data !== 'navigation finish' && data != 'Waiting for goals') {
                const headerPayload = data.split('_')[0];
                const currentTargetPoint = Number(data.split('_')[1]) + 1;
                if (headerPayload === 'navigation to') {
                    robotConfigs[key]['taskQueue'][0].indexActiveTask = currentTargetPoint;
                } else if (headerPayload === 'Goal done' && currentTargetPoint === robotConfigs[key]['taskQueue'][0].indexActiveTask) {
                    const indexTaskFinish = robotConfigs[key]['taskQueue'][0].indexActiveTask;
                    try {
                        robotConfigs[key]['taskQueue'][indexTaskFinish].isDone = true;
                        robotConfigs[key].currentGoal = robotConfigs[key]['taskQueue'][indexTaskFinish].targetName;
                    } catch (error) {}
                }
            } else {
                // robotConfigs[key]['taskQueue'][0].indexActiveTask = 0;
                await Task.updateFields(robotConfigs[key].taskQueue[0].taskId, new Date(), 'FINISH');
                await SubTask.updateSubtasksStatusByTaskId(robotConfigs[key].taskQueue[0].taskId, true);
                queueRobots[`taskQueue_${key}`].resume();
            }
            socketIo.emit(`updateTaskQueue`, {
                robotName: key,
                taskQueueUpdate: robotConfigs[key]['taskQueue']
            });

            socketIo.emit('statusOfAllRobots', statusOfAllRobots);
        });
        robotConfigs[key]['poseTopic'].subscribe(function (response) {
            const x = ParseFloat(response.pose.pose.position.x, 2);
            const y = ParseFloat(response.pose.pose.position.y, 2);
            Logging.debug(`${robotConfigs[key].robotName} positionX: ${x} positionY: ${y}`);

            currentPose[key] = response.pose.pose;
            socketIo.emit(`currentPose`, { robotId: key, currentPose });
        });
        //Auto Reconnection for roslibjsx
        // setInterval(function () {
        //     robotConfigs[key].rosWebsocket.connect(websocket);
        // }, 4000);
    });
})();
// }, 4000);

// import worker
import { addTaskToQueueEsp, addTaskToQueue } from './bullmq';
import { myWorker } from './worker.mainQueue';
import { myWorkerEsp } from './worker.esp32';
import { myWorkerRobot1, myWorkerRobot2, myWorkerRobot3 } from './worker.queueRobots';

myWorker.run();
myWorkerEsp.run();
// myWorkerRobot1.run();
// myWorkerRobot2.run();
// myWorkerRobot3.run();

// Initialize Ros API
class RobotController {
    constructor() {}
    /**
     * @breif api for edit or get map
     */

    getConfigMap = async function (req, res) {
        const fileName = req.params.fileName;

        const filePath = path.join(__dirname, `../../configs/maps/${fileName}`);
        jsonfile.readFile(filePath, (err, data) => {
            if (err) {
                console.log(err);
                return res.status(200).json({
                    success: false,
                    message: err.message
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Get Map config successfully',
                mapConfig: data
            });
        });
    };
    /**
     * @breif api for esp32
     */
    // [POST] /robot/setTargetPoint
    setTargetPoint = async function (req, res) {
        const { stationId, firstPoint, secondPoint } = req.query;
        let subTaskList = [];

        if (stationId && firstPoint && secondPoint) {
            subTaskList = [
                { targetName: firstPoint, cargoVolume: 0, isDone: false },
                { targetName: secondPoint, cargoVolume: 0, isDone: false }
            ];

            // Tạo task và lưu vào cơ sở dữ liệu

            const { id: taskId } = await Task.create({
                taskName: `task_${stationId}`,
                taskDescription: `task_${stationId}`,
                pathOptimization: false,
                status: 'INITIALIZE',
                startTime: new Date()
            });
            for (const subTask of subTaskList) {
                await SubTask.create({
                    taskId: taskId,
                    cargo: subTask.cargoVolume,
                    targetName: subTask.targetName,
                    isDone: subTask.status
                });
            }
            // const jobEsp = await addTaskToQueueEsp({
            //     taskId,
            //     taskName: `task_${stationId}`,
            //     taskDescription: `task_${stationId}`,
            //     pathOptimization: false,
            //     subTaskList
            // });

            const jobEsp = await addTaskToQueue({
                taskId,
                taskName: `task_${stationId}`,
                taskDescription: `task_${stationId}`,
                pathOptimization: false,
                autoGoHome: false,
                subTaskList
            });

            return res.status(200).json({
                success: true,
                targetPointFirst: firstPoint,
                targetPointSecondd: secondPoint,
                jobId: jobEsp.id,
                taskId: taskId,
                message: 'Send target goal to robot success'
            });
        } else {
            return res.json({
                success: false,
                errorCoe: 403,
                message: 'Bad request'
            });
        }
    };
    // [POST] /robot/getStatusOfAllRobots
    getStatusOfAllRobots = function (req, res) {
        Logging.info('🚀 ~ ~ getStatusOfAllRobots');
        return res.status(200).json({
            success: true,
            message: 'get status of all robots success',
            statusOfAllRobots: statusOfAllRobots
        });
    };

    /**
     * @breif gerenal api
     * @param {*} req
     * @param {*} res
     * @returns
     */
    // [POST] /robot/resetAllTaskQueue
    resetAllTaskQueue = function (req, res) {
        Logging.info('🚀 ~ ~ resetAllTaskQueue');

        let allTaskQueues = {};
        Object.keys(robotConfigs).forEach((key) => {
            robotConfigs[key].taskQueue = [{ indexActiveTask: 0, taskId: '', robotName: key }];
            allTaskQueues[key] = robotConfigs[key].taskQueue;
        });
        Object.keys(statusOfAllRobots).forEach((key) => {
            statusOfAllRobots[key] = 'free';
        });

        return res.status(200).json({
            success: true,
            message: 'Reset all task queue succes',
            allTaskQueues: allTaskQueues,
            statusOfAllRobots: statusOfAllRobots
        });
    };
    // [GET] /robot/getTaskQueueFromAllRobots
    getTaskQueueFromAllRobots = function (req, res) {
        Logging.info('🚀 ~ ~ getTaskQueueFromAllRobots');
        let allTaskQueues = {};
        Object.keys(robotConfigs).forEach((key) => {
            if (!allTaskQueues.hasOwnProperty(key)) {
                allTaskQueues[key] = robotConfigs[key].taskQueue;
            }
        });
        console.log('🚀 RobotController ~ allTaskQueues:', allTaskQueues);
        return res.status(200).json({
            success: true,
            message: 'Get all task queues successfully',
            allTaskQueues: allTaskQueues,
            statusOfAllRobots: statusOfAllRobots
        });
    };
    // [GET] /robot/getCurrentPose
    getCurrentPose = function (req, res) {
        console.log('🚀 ~ ~ getCurrentPose');
        return res.status(200).json({
            success: true,
            message: 'Get currentPose successfully',
            currentPose: currentPose
        });
    };
    // [GET] /robot/getRobotConfigs
    getRobotConfigs = function (req, res) {
        console.log('🚀 ~ ~ getRobotConfigs');
        const robotConfigsFilter = {};
        Object.keys(robotConfigs).forEach((key) => {
            robotConfigsFilter[key] = { robotName: key };
        });

        return res.status(200).json({
            success: true,
            message: 'Get Robot Configs successfully',
            robotConfigs: robotConfigsFilter
        });
    };
    // [POST] /robot/sendTaskList
    createNewTask = async function (req, res) {
        Logging.info('__autoPickRobotAndSendTaskList:');

        const { taskName, taskDescription, pathOptimization, autoGoHome, targetPointList: subTaskList } = req.body;
        console.log('🚀 ~ file: ros.controller.js:274 ~ RobotController ~ body:', req.body);

        if (!taskName || !subTaskList) {
            return res.json({
                success: false,
                errorCoe: 403,
                message: 'Bad request'
            });
        }
        console.log('🚀~ RobotController ~ subTaskList:', subTaskList);

        if (subTaskList && subTaskList.length > 0) {
            // Tạo task và lưu vào cơ sở dữ liệu
            const { id: taskId } = await Task.create({
                taskName: taskName,
                taskDescription: taskDescription || 'new task',
                pathOptimization: pathOptimization,
                autoGoHome: autoGoHome,
                status: 'INITIALIZE',
                startTime: new Date()
            });

            const job = await addTaskToQueue({
                taskId,
                taskName,
                taskDescription,
                pathOptimization,
                autoGoHome,
                subTaskList
            });

            return res.status(200).json({
                success: true,
                jobId: job.id,
                taskId: taskId,
                message: 'Create a new task success'
            });
        } else {
            return res.json({
                success: false,
                message: 'taskList is null'
            });
        }
    };
    // [POST] /robot/createNewTargetPoint
    createNewTargetPoint = async function (req, res) {
        try {
            const { pointName, pointType, xCoordinate, yCoordinate, theta } = req.body.newTargetPoint;
            // Validate the input using Sequelize validation
            const positionGoal = await PositionGoal.build({
                pointName,
                pointType,
                xCoordinate,
                yCoordinate,
                theta
            });

            await positionGoal.validate();

            // Create the record
            const newPositionGoal = await PositionGoal.create({
                pointName,
                pointType,
                xCoordinate,
                yCoordinate,
                theta
            });
            // Count the total number of records
            totalCountTargetPoint = await PositionGoal.count();
            return res.status(200).json({
                success: true,
                message: 'Create new target point success',
                newPositionGoal: newPositionGoal,
                totalCountTargetPoint: totalCountTargetPoint
            });
        } catch (error) {
            console.error(error.message);
            return res.status(200).json({
                errorCode: 403,
                success: false,
                message: error.message
            });
        }
    };

    // [GET] /robot/getAllTargetPoint
    getAllTargetPoint = async function (req, res) {
        if (totalCountTargetPoint === 0 || Object.keys(GoalPoseArray).length != totalCountTargetPoint) {
            Logging.info('get getAllTargetPoint');
            try {
                // Lấy toàn bộ bản ghi từ cơ sở dữ liệu
                const allPositionGoals = await PositionGoal.findAll();

                // Phân loại bản ghi theo pointType
                totalCountTargetPoint = allPositionGoals.length;
                allPositionGoals.forEach((positionGoal) => {
                    const { pointName } = positionGoal;
                    if (!GoalPoseArray.hasOwnProperty(pointName)) {
                        GoalPoseArray[pointName] = {
                            position: {
                                x: positionGoal.xCoordinate,
                                y: positionGoal.yCoordinate,
                                z: 0
                            },
                            orientation: {
                                x: 0,
                                y: 0,
                                z: ParseFloat(Math.sin(positionGoal.theta / 2.0), 2),
                                w: ParseFloat(Math.cos(positionGoal.theta / 2.0), 2)
                            }
                        };
                    } else {
                    }
                });

                return res.status(200).json({
                    success: true,
                    message: 'Get all target point successly',
                    totalCountTargetPoint: totalCountTargetPoint,
                    GoalPoseArray: GoalPoseArray
                });
            } catch (error) {
                res.status(200).json({ errorCode: 500, success: false, message: 'Internal server error' });
            }
        } else {
            Logging.info('API getAllTargetPoint: get data from ram');
            return res.status(200).json({
                success: true,
                message: 'Get all target point successly',
                totalCountTargetPoint: totalCountTargetPoint,
                GoalPoseArray: GoalPoseArray
            });
        }
    };

    /**
     * @breif api remote to a robot
     * @param {*} req
     * @param {*} res
     * @returns
     */
    // router.post('/robot/:id/add-new-goal', rosController.addNewGoalToTaskList);
    addNewGoalToTaskList = function (req, res) {
        const robotId = req.params.robotId;
        const { newGoal } = req.body;

        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            if (GoalPoseArray.hasOwnProperty(newGoal)) {
                if (robotConfigs.hasOwnProperty(robotId)) {
                    robotConfigs[robotId].taskQueue.push({ targetName: newGoal, cargoVolume: 0, isDone: false });
                }
                const newPose = GoalPoseArray[newGoal];
                console.log('🚀 ~ file: ros.controller.js:425 ~ RobotController ~ newPose:', newPose);

                const TargetGoal = new ROSLIB.Topic({
                    ros: robotConfigs[robotId].rosWebsocket,
                    name: '/' + robotConfigs[key].robotName + '/move_base_sequence/corner_pose',
                    messageType: 'geometry_msgs/PoseStamped'
                });

                const targetGoalMessage = new ROSLIB.Message({
                    header: {
                        frame_id: 'map'
                    },
                    pose: newPose
                });

                TargetGoal.publish(targetGoalMessage);
                return res.status(200).json({
                    success: true,
                    message: 'add new goal to the task list success',
                    robotId: robotId,
                    taskQueue: robotConfigs[robotId].taskQueue
                });
            } else {
                return res.json({
                    success: false,
                    message: 'can not add new goal'
                });
            }
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };
    // [POST] /robot/:id/send-task-list
    createNewTaskForOneRobot = function (req, res) {
        const robotId = req.params.robotId;
        const { taskList } = req.body;

        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            if (taskList && taskList.length > 0) {
                const tspMatrix = createTSPMatrix(taskList, robotId);

                const optimalPath = findOptimalPath(tspMatrix);

                // console.log('Đường đi tối ưu: ' + optimalPath.join(' -> '));
                const optimalOrder = createOptimalOrder(taskList, optimalPath);

                console.log('Mảng đã sắp xếp theo thứ tự tối ưu:', optimalOrder);

                const firstEleOfArray = optimalOrder.shift();
                if (robotConfigs[robotId].currentGoal !== robotConfigs[robotId].initPoint) {
                    Logging.warning('current pose is different from init pose');
                } else {
                    optimalOrder.push(firstEleOfArray);
                }
                if (robotConfigs.hasOwnProperty(robotId)) {
                    const previousTaskQueue = robotConfigs[robotId].taskQueue;
                    robotConfigs[robotId].taskQueue = [...previousTaskQueue, ...optimalOrder];
                }

                const poseArray = optimalOrder.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });

                console.log('🚀 ~ file: ros.controller.js:195 ~ RobotController ~ poseArray:', poseArray);

                const TargetGoal = new ROSLIB.Topic({
                    ros: robotConfigs[robotId].rosWebsocket,
                    name: '/' + robotConfigs[key].robotName + '/move_base_sequence/wayposes',
                    messageType: 'geometry_msgs/PoseArray'
                });

                const targetGoalMessage = new ROSLIB.Message({
                    header: {
                        frame_id: 'map'
                    },
                    poses: poseArray
                });

                TargetGoal.publish(targetGoalMessage);
                return res.status(200).json({
                    success: true,
                    message: poseArray
                });
            } else {
                return res.json({
                    success: false,
                    message: 'taskList is null'
                });
            }
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };
    // [POST] /robot/:id/reset-all-goals
    callServiceResetAllGoals(req, res) {
        console.log('🚀 ~ file: ros.controller.js:56 ~ RobotController ~ callServiceResetAllGoals ~ req:', req.params.robotId);
        const robotName = req.params.robotId;
        if (robotName && robotConfigs.hasOwnProperty(robotName)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotName].rosWebsocket,
                name: `/${robotName}/move_base_sequence/reset`,
                serviceType: 'move_base_sequence/reset'
            });

            const request = new ROSLIB.ServiceRequest({});

            serviceClient.callService(request, function (result) {
                console.log('Result for service call ' + robotName + ' on ' + serviceClient.name + ': ' + JSON.stringify(result));
                let taskQueueReset = [];

                if (robotConfigs.hasOwnProperty(robotName)) {
                    robotConfigs[robotName].taskQueue = [{ indexActiveTask: 0, taskId: '', robotName: robotName }];
                    taskQueueReset = robotConfigs[robotName].taskQueue;
                }
                statusOfAllRobots[robotName] = 'free';

                return res.status(200).json({
                    success: result['success'],
                    serviceClient: serviceClient.name,
                    message: 'Reset all goals successfully',
                    robotName,
                    taskQueueReset,
                    statusOfAllRobots
                });
            });
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    }

    // [POST] /robot/:id/get-current-status
    callServiceGetCurrentStatus = function (req, res) {
        const robotId = req.params.robotId;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: robotId ? `/${robotId}/move_base_sequence/get_currentStatus` : '/move_base_sequence/get_currentStatus',
                serviceType: 'move_base_sequence/get_currentStatus'
            });
            const request = new ROSLIB.ServiceRequest({});

            serviceClient.callService(request, function (result) {
                console.log('Result for service call on ' + serviceClient.name + ': ' + JSON.stringify(result));
                return res.status(200).json({
                    success: true,
                    serviceClient: serviceClient.name,
                    message: result
                });
            });
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };
    // [POST] /robot/:id/state/toggle-state
    callServiceToggleState = function (req, res) {
        Logging.info('callServiceToggleState success');
        const robotId = req.params.robotId;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: `/${robotId}/move_base_sequence/toggle_state`,
                serviceType: 'move_base_sequence/toggle_state'
            });

            const request = new ROSLIB.ServiceRequest({});

            serviceClient.callService(request, function (result) {
                console.log('Result for service call on ' + serviceClient.name + ': ' + JSON.stringify(result));
                const nextPoint = robotConfigs[robotId].taskQueue.length > 1 ? robotConfigs[robotId].taskQueue[robotConfigs[robotId].taskQueue[0].indexActiveTask + 1].targetName : 'undefine';
                return res.status(200).json({
                    success: true,
                    serviceClient: serviceClient.name,
                    message: 'toggle state success'
                    // nextPoint: nextPoint
                });
            });
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };
    // [POST] /robot/:id/state/set-state
    callServiceSetState = function (req, res) {
        Logging.debug(`callServiceSetState___`);
        const { state } = req.body;
        const robotId = req.params.id;
        if (state && robotId && robotConfigs.hasOwnProperty(robotId)) {
            try {
                const serviceClient = new ROSLIB.Service({
                    ros: robotConfigs[robotId].rosWebsocket,
                    name: robotId ? `/${robotId}/move_base_sequence/set_state` : '/move_base_sequence/set_state',
                    serviceType: 'move_base_sequence/set_state'
                });
                console.log('🚀 ~ file: ros.controller.js:754 ~ RobotController ~ serviceClient:', serviceClient);

                const request = new ROSLIB.ServiceRequest({ state });

                serviceClient.callService(request, function (result) {
                    let message = '';
                    if (result.success) {
                        message: 'Robot is operating, now.';
                    } else {
                        message: 'Robot is operating,';
                    }
                    return res.status(200).json({
                        success: true,
                        serviceClient: serviceClient.name,
                        message: message
                    });
                });
            } catch (error) {
                console.log('callServiceSetState ~ error:', error.message);
            }
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };

    // [GET]  /robot/:id/state/get-state
    callServiceGetState = function (req, res) {
        const robotId = req.params.robotId;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: robotId ? `/${robotId}/move_base_sequence/get_state` : '/move_base_sequence/get_state',
                serviceType: 'move_base_sequence/get_state'
            });

            const request = new ROSLIB.ServiceRequest({});

            serviceClient.callService(request, function (result) {
                console.log('Result for service call on ' + serviceClient.name + ': ' + JSON.stringify(result));
                return res.status(200).json({
                    success: true,
                    serviceClient: serviceClient.name,
                    message: result
                });
            });
        } else {
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });
        }
    };

    subcribeTopic() {
        Object.keys(robotConfigs).forEach((key, index) => {
            robotConfigs[key]['statusNav'] = new ROSLIB.Topic({
                ros: robotConfigs[key].rosWebsocket,
                name: '/' + robotConfigs[key].robotName + '/move_base_sequence/statusNav',
                messageType: 'std_msgs/String'
            });
            robotConfigs[key]['statusNav'].subscribe(function (response) {
                const { data } = response;
                console.log(`🚀 ${robotConfigs[i]} data: `, data);
            });
        });
    }
}

export default RobotController;

//-----------------

const rosQuaternionToGlobalTheta = function (orientation) {
    // See https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles#Rotation_matrices
    // here we use [x y z] = R * [1 0 0]
    let q0 = orientation.w;
    let q1 = orientation.x;
    let q2 = orientation.y;
    let q3 = orientation.z;
    // Canvas rotation is clock wise and in degrees
    return (-Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3)) * 180.0) / Math.PI;
};

// ParseFloat
export function ParseFloat(str, val = 0) {
    str = str.toString();
    str = str.slice(0, str.indexOf('.') + val + 1);
    return Number(str);
}
