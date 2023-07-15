import Logging from '../../library/Logging';
import { socketIo } from '../../app';
// import modules
const db = require('../../models');
const PositionGoal = db.position_goals;
// Initialize Ros API
// Required ROSlib and Ros API Dependencies
const ROSLIB = require('roslib');

//
var taskQueueTb3_0 = [{ indexActiveTask: 0 }];
var taskQueueTb3_1 = [{ indexActiveTask: 0 }];
var taskQueueTb3_2 = [{ indexActiveTask: 0 }];

// monitor status of all robots
let statusOfAllRobots = {
    tb3_0: 'free',
    tb3_1: 'free',
    tb3_2: 'free'
};

// robot models
export const GoalPoseArray = {};
export const currentPose = {};
export const robotConfigs = {
    tb3_0: {
        rosName: 'tb3_0',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav',
        initPose: 'home_0'
    },
    tb3_1: {
        rosName: 'tb3_1',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav',
        initPose: 'home_1'
    },
    tb3_2: {
        rosName: 'tb3_2',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav',
        initPose: 'home_2'
    }
};

Object.keys(robotConfigs).forEach((key, index) => {
    const websocket = `ws://${robotConfigs[key].ip}:${robotConfigs[key].portWebsocket}`;
    robotConfigs[key].rosWebsocket = new ROSLIB.Ros({ encoding: 'ascii' });

    robotConfigs[key]['statusNav'] = new ROSLIB.Topic({
        ros: robotConfigs[key].rosWebsocket,
        name: '/' + robotConfigs[key].rosName + robotConfigs[key].topicSubNav,
        messageType: 'std_msgs/String'
    });

    robotConfigs[key]['poseTopic'] = new ROSLIB.Topic({
        ros: robotConfigs[key].rosWebsocket,
        name: '/' + robotConfigs[key].rosName + '/amcl_pose',
        messageType: 'geometry_msgs/PoseWithCovarianceStamped'
    });

    robotConfigs[key].rosWebsocket.on('error', function (error) {
        Logging.error(`Server can not connect to ros, ${error.message}`);
    });
    // ros connected
    robotConfigs[key].rosWebsocket.on('connection', function () {
        Logging.info(`Connected to websocket ros ${robotConfigs[key].rosName} server`);
        robotConfigs[key]['statusNav'].subscribe(function (response) {
            const { data } = response;

            if (key == 'tb3_0') {
                statusOfAllRobots['tb3_0'] = data;
                if (data !== 'navigation finish' && data != 'Waiting for goals') {
                    const headerPayload = data.split('_')[0];

                    const currentTargetPoint = Number(data.split('_')[1]) + 1;
                    if (headerPayload === 'navigation to') {
                        taskQueueTb3_0[0].indexActiveTask = currentTargetPoint;
                    } else if (headerPayload === 'Goal done' && currentTargetPoint === taskQueueTb3_0[0].indexActiveTask) {
                        taskQueueTb3_0[taskQueueTb3_0[0].indexActiveTask].statusTask = true;
                    }
                } else {
                    taskQueueTb3_0[0].indexActiveTask = 0;
                }
                socketIo.emit(`statusNav_${key}`, taskQueueTb3_0);
            } else if (key == 'tb3_1' && data != 'Waiting for goals') {
                statusOfAllRobots['tb3_1'] = data;
                if (data !== 'navigation finish') {
                    const headerPayload = data.split('_')[0];

                    const currentTargetPoint = Number(data.split('_')[1]) + 1;
                    if (headerPayload === 'navigation to') {
                        taskQueueTb3_1[0].indexActiveTask = currentTargetPoint;
                    } else if (headerPayload === 'Goal done' && currentTargetPoint === taskQueueTb3_1[0].indexActiveTask) {
                        taskQueueTb3_1[taskQueueTb3_1[0].indexActiveTask].statusTask = true;
                    }
                } else {
                    taskQueueTb3_1[0].indexActiveTask = 0;
                }
                socketIo.emit(`statusNav_${key}`, taskQueueTb3_1);
            } else if (key == 'tb3_2' && data != 'Waiting for goals') {
                statusOfAllRobots['tb3_2'] = data;
                if (data !== 'navigation finish') {
                    const headerPayload = data.split('_')[0];

                    const currentTargetPoint = Number(data.split('_')[1]) + 1;
                    if (headerPayload === 'navigation to') {
                        taskQueueTb3_2[0].indexActiveTask = currentTargetPoint;
                    } else if (headerPayload === 'Goal done' && currentTargetPoint === taskQueueTb3_2[0].indexActiveTask) {
                        taskQueueTb3_2[taskQueueTb3_2[0].indexActiveTask].statusTask = true;
                    }
                } else {
                    taskQueueTb3_2[0].indexActiveTask = 0;
                }
                socketIo.emit(`statusNav_${key}`, taskQueueTb3_2);
            }

            socketIo.emit('statusOfAllRobots', statusOfAllRobots);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_0:', taskQueueTb3_0);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_1:', taskQueueTb3_1);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_2:', taskQueueTb3_2);
        });

        robotConfigs[key]['poseTopic'].subscribe(function (response) {
            const x = ParseFloat(response.pose.pose.position.x, 2);
            const y = ParseFloat(response.pose.pose.position.y, 2);
            Logging.info(`${robotConfigs[key].rosName} positionX: ${x} positionY: ${y}`);

            currentPose[key] = response.pose.pose;
            socketIo.emit(`currentPose`, { robotId: key, currentPose });
        });
    });

    robotConfigs[key].rosWebsocket.on('close', function (e) {
        Logging.info(`Try to connect to robot ${robotConfigs[key].rosName} through websocket`);
    });

    //Auto Reconnection for roslibjs
    // setInterval(function () {
    //     // socketIo.emit("statusNav", `hello world ${Date.now()}`);
    //     robotConfigs[key].rosWebsocket.connect(websocket);
    // }, 4000);
});

// GoalPoseArray
var totalCountTargetPoint = 0;

class RobotController {
    constructor() {}
    // [POST] /robot/setTargetPoint
    setTargetPoint = function (req, res) {
        const { args } = req.query;
        Logging.info(`🚀 ~ file: ros.controller.js:157 ~ RobotController ~ args:' + ${JSON.stringify(args)}`);
        let robotIdWillCall = '';
        for (const key in statusOfAllRobots) {
            if (statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals') {
                robotIdWillCall = key;
                break;
            }
        }
        Logging.info(`🚀 ~ file: ros.controller.js:252~ robotIdWillCall: ${robotIdWillCall}`);

        if (robotIdWillCall !== '' && GoalPoseArray.hasOwnProperty(args[0])) {
            switch (robotIdWillCall) {
                case 'tb3_0': {
                    taskQueueTb3_0.push(GoalPoseArray[args[0]]);
                    break;
                }
                case 'tb3_1': {
                    taskQueueTb3_1 = taskQueueTb3_1.push(GoalPoseArray[args[0]]);
                    break;
                }
                case 'tb3_2': {
                    taskQueueTb3_2.push(GoalPoseArray[args[0]]);
                    break;
                }
                default:
                    break;
            }

            const TargetGoal = new ROSLIB.Topic({
                ros: robotConfigs[robotIdWillCall].rosWebsocket,
                name: `/${robotIdWillCall}/move_base_sequence/corner_pose`,
                messageType: 'geometry_msgs/Pose'
            });

            const targetGoalMessage = new ROSLIB.Message({
                header: {
                    frame_id: 'map'
                },
                poses: GoalPoseArray[args[0]]
            });

            TargetGoal.publish(targetGoalMessage);
            return res.status(200).json({
                success: true,
                robotId: robotIdWillCall,
                targetPoint: args[0],
                message: 'Send target goal to robot success'
            });
        } else {
            return res.json({
                success: false,
                message: 'All robot are busy!'
            });
        }
    };
    resetAllTaskQueue = function (req, res) {
        Logging.info('🚀 ~ ~ resetAllTaskQueue');
        taskQueueTb3_0 = [{ indexActiveTask: 0 }];
        taskQueueTb3_1 = [{ indexActiveTask: 0 }];
        taskQueueTb3_2 = [{ indexActiveTask: 0 }];
        statusOfAllRobots = {
            tb3_0: 'free',
            tb3_1: 'free',
            tb3_2: 'free'
        };
        return res.status(200).json({
            success: true,
            message: {
                tb3_0: taskQueueTb3_0,
                tb3_1: taskQueueTb3_1,
                tb3_2: taskQueueTb3_2,
                statusOfAllRobots: statusOfAllRobots
            }
        });
    };
    getTaskQueueFromAllRobots = function (req, res) {
        Logging.info('🚀 ~ ~ getTaskQueueFromAllRobots');
        return res.status(200).json({
            success: true,
            message: {
                tb3_0: taskQueueTb3_0,
                tb3_1: taskQueueTb3_1,
                tb3_2: taskQueueTb3_2,
                statusOfAllRobots: statusOfAllRobots
            }
        });
    };
    getCurrentPose = function (req, res) {
        console.log('🚀 ~ ~ getCurrentPose');
        return res.status(200).json({
            success: true,
            message: {
                currentPose
            }
        });
    };

    getStatusOfAllRobots = function (req, res) {
        Logging.info('🚀 ~ ~ getStatusOfAllRobots');
        return res.status(200).json({
            success: true,
            message: 'get status of all robots success',
            statusOfAllRobots: statusOfAllRobots
        });
    };

    sendTaskListToOneRobot = function (req, res) {
        const robotId = req.params.id;
        const { taskList } = req.body;

        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            if (taskList && taskList.length > 0) {
                const tspMatrix = createTSPMatrix(taskList, robotId);

                const optimalPath = findOptimalPath(tspMatrix);

                console.log('Đường đi tối ưu: ' + optimalPath.join(' -> '));
                const optimalOrder = createOptimalOrder(taskList, optimalPath);

                console.log('Mảng đã sắp xếp theo thứ tự tối ưu:', optimalOrder);

                const firstEleOfArray = optimalOrder.shift();
                optimalOrder.push(firstEleOfArray);
                switch (robotId) {
                    case 'tb3_0': {
                        taskQueueTb3_0 = [...taskQueueTb3_0, ...optimalOrder];
                        break;
                    }
                    case 'tb3_1': {
                        taskQueueTb3_1 = [...taskQueueTb3_1, ...optimalOrder];
                        break;
                    }
                    case 'tb3_2': {
                        taskQueueTb3_2 = [...taskQueueTb3_2, ...optimalOrder];
                        break;
                    }
                    default:
                        break;
                }

                const poseArray = optimalOrder.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });

                console.log('🚀 ~ file: ros.controller.js:195 ~ RobotController ~ poseArray:', poseArray);

                const TargetGoal = new ROSLIB.Topic({
                    ros: robotConfigs[robotId].rosWebsocket,
                    name: robotId ? `/${robotId}/move_base_sequence/wayposes` : '/move_base_sequence/wayposes',
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

    autoPickRobotAndSendTaskList = function (req, res) {
        console.log(' autoPickRobotAndSendTaskList:');
        const { taskList } = req.body;
        console.log('🚀 ~ file: ros.controller.js:246 ~ RobotController ~ taskList:', taskList);
        let robotIdWillCall = '';
        if (taskList && taskList.length > 0) {
            console.log('🚀 ~ file: ros.controller.js:249 ~ RobotController ~ statusOfAllRobots:', statusOfAllRobots);
            for (const key in statusOfAllRobots) {
                if (statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals') {
                    robotIdWillCall = key;
                    break;
                }
            }
            Logging.info(`🚀 ~ file: ros.controller.js:252~ robotIdWillCall: ${robotIdWillCall}`);

            if (robotIdWillCall !== '') {
                const tspMatrix = createTSPMatrix(taskList, robotIdWillCall);

                const optimalPath = findOptimalPath(tspMatrix);

                console.log('Đường đi tối ưu: ' + optimalPath.join(' -> '));
                const optimalOrder = createOptimalOrder(taskList, optimalPath);

                console.log('Mảng đã sắp xếp theo thứ tự tối ưu:', optimalOrder);

                const firstEleOfArray = optimalOrder.shift();
                optimalOrder.push(firstEleOfArray);
                switch (robotIdWillCall) {
                    case 'tb3_0': {
                        taskQueueTb3_0 = [...taskQueueTb3_0, ...optimalOrder];
                        break;
                    }
                    case 'tb3_1': {
                        taskQueueTb3_1 = [...taskQueueTb3_1, ...optimalOrder];
                        break;
                    }
                    case 'tb3_2': {
                        taskQueueTb3_2 = [...taskQueueTb3_2, ...optimalOrder];
                        break;
                    }
                    default:
                        break;
                }

                const poseArray = optimalOrder.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });

                const TargetGoal = new ROSLIB.Topic({
                    ros: robotConfigs[robotIdWillCall].rosWebsocket,
                    name: `/${robotIdWillCall}/move_base_sequence/wayposes`,
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
                    robotId: robotIdWillCall,
                    message: poseArray
                });
            } else
                return res.json({
                    success: false,
                    message: 'All robot are busy!'
                });
        } else {
            return res.json({
                success: false,
                message: 'taskList is null'
            });
        }
    };

    callServiceResetAllGoals(req, res) {
        console.log('🚀 ~ file: ros.controller.js:56 ~ RobotController ~ callServiceResetAllGoals ~ req:', req.params.id);
        const robotId = req.params.id;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: `/${robotId}/move_base_sequence/reset`,
                serviceType: 'move_base_sequence/reset'
            });

            const request = new ROSLIB.ServiceRequest({});

            serviceClient.callService(request, function (result) {
                console.log('Result for service call ' + robotId + ' on ' + serviceClient.name + ': ' + JSON.stringify(result));
                let taskQueueReset = [];
                if (robotId == 'tb3_0') {
                    taskQueueTb3_0 = [{ indexActiveTask: 0 }];
                    taskQueueReset = taskQueueTb3_0;
                }
                if (robotId == 'tb3_1') {
                    taskQueueTb3_1 = [{ indexActiveTask: 0 }];
                    taskQueueReset = taskQueueTb3_1;
                }
                if (robotId == 'tb3_2') {
                    taskQueueTb3_2 = [{ indexActiveTask: 0 }];
                    taskQueueReset = taskQueueTb3_0;
                }

                return res.status(200).json({
                    success: result['success'],
                    serviceClient: serviceClient.name,
                    message: { robotId, taskQueueReset }
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

    callServiceToggleState = function (req, res) {
        const robotId = req.params.id;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: `/${robotId}/move_base_sequence/toggle_state`,
                serviceType: 'move_base_sequence/toggle_state'
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

    callServiceSetState = function (req, res) {
        const { state } = req.body;
        const robotId = req.params.id;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].robotWebsocket,
                name: robotId ? `/${robotId}/move_base_sequence/set_state` : '/move_base_sequence/set_state',
                serviceType: 'move_base_sequence/set_state'
            });

            const request = new ROSLIB.ServiceRequest({ state: state });

            serviceClient.callService(request, function (result) {
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

    callServiceGetState = function (req, res) {
        const robotId = req.params.id;
        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].robotWebsocket,
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

    callServiceGetCurrentStatus = function (req, res) {
        const robotId = req.params.id;
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

    // [POST] /robot/createNewTargetPoint
    createNewTargetPoint = async function (req, res) {
        try {
            const { pointName, pointType, xCoordinate, yCoordinate, theta } = req.body;
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
                errorCode: 500,
                success: false,
                message: 'Internal server error'
            });
        }
    };

    // [GET] /robot/getAllTargetPoint
    getAllTargetPoint = async function (req, res) {
        if (totalCountTargetPoint === 0 || Object.keys(GoalPoseArray).length != totalCountTargetPoint) {
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
                countTargetPoint: countTargetPoint,
                GoalPoseArray: GoalPoseArray
            });
        }
    };

    subcribeTopic() {
        Object.keys(robotConfigs).forEach((key, index) => {
            robotConfigs[key]['statusNav'] = new ROSLIB.Topic({
                ros: robotConfigs[key].rosWebsocket,
                name: '/' + robotConfigs[key].rosName + '/move_base_sequence/statusNav',
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

// calculate distance between two point
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
// Create TSP Matrix
function createTSPMatrix(pointList, robotId) {
    if (robotId === 'tb3_0') {
        pointList.unshift({ targetName: 'home_0', cargoVolume: 0, statusTask: false });
    } else if (robotId === 'tb3_1') {
        pointList.unshift({ targetName: 'home_1', cargoVolume: 0, statusTask: false });
    } else if (robotId === 'tb3_2') {
        pointList.unshift({ targetName: 'home_2', cargoVolume: 0, statusTask: false });
    }
    const n = pointList.length;
    console.log('🚀 ~ file: ros.controller.js:516 ~ createTSPMatrix ~ pointList:', pointList);
    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            tspMatrix[i][j] = calculateDistance(GoalPoseArray[pointList[i].targetName].position, GoalPoseArray[pointList[j].targetName].position);
        }
    }

    return tspMatrix;
}
function findOptimalPath(tspMatrix) {
    const n = tspMatrix.length;
    const path = [0]; // Bắt đầu từ điểm xuất phát (điểm 0)
    let currentNode = 0;

    while (path.length < n) {
        let minDistance = Infinity;
        let nextNode = -1;

        for (let i = 0; i < n; i++) {
            if (!path.includes(i) && tspMatrix[currentNode][i] < minDistance) {
                minDistance = tspMatrix[currentNode][i];
                nextNode = i;
            }
        }

        path.push(nextNode);
        currentNode = nextNode;
    }

    return path;
}

function createOptimalOrder(originalArray, optimalPath) {
    const optimalOrder = [];
    for (const index of optimalPath) {
        optimalOrder.push(originalArray[index]);
    }
    return optimalOrder;
}

function calculateTotalCost(tspMatrix, optimalPath) {
    let totalCost = 0;

    for (let i = 0; i < optimalPath.length - 1; i++) {
        const currentNode = optimalPath[i];
        const nextNode = optimalPath[i + 1];
        totalCost += tspMatrix[currentNode][nextNode];
    }

    return totalCost;
}
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
