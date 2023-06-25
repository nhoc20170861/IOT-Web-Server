import Logging from '../../library/Logging';
import { socketIo } from '../../app';
// Initialize Ros API
// Required ROSlib and Ros API Dependencies
const ROSLIB = require('roslib');

//
var taskQueueTb3_0 = [{ indexActiveTask: 0 }];
var taskQueueTb3_1 = [{ indexActiveTask: 0 }];
var taskQueueTb3_2 = [{ indexActiveTask: 0 }];

const robotConfigs = {
    tb3_0: {
        rosName: 'tb3_0',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav'
    },
    tb3_1: {
        rosName: 'tb3_1',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav'
    },
    tb3_2: {
        rosName: 'tb3_2',
        ip: '0.0.0.0',
        portWebsocket: 9090,
        rosWebsocket: {},
        topicSubNav: '/move_base_sequence/statusNav'
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

    robotConfigs[key].rosWebsocket.on('error', function (error) {
        Logging.error(`Server can not connect to ros, ${error.message}`);
    });
    // ros connected
    robotConfigs[key].rosWebsocket.on('connection', function () {
        Logging.info(`Connected to websocket ros ${robotConfigs[key].rosName} server`);
        robotConfigs[key]['statusNav'].subscribe(function (response) {
            const { data } = response;
            if (data !== 'navigation finish') {
                const headerPayload = data.split('_')[0];

                const currentTargetPoint = Number(data.split('_')[1]) + 1;
                if (headerPayload === 'navigation to') {
                    if (key == 'tb3_0') {
                        taskQueueTb3_0[0].indexActiveTask = currentTargetPoint;
                    }
                    if (key == 'tb3_1') taskQueueTb3_1[0].indexActiveTask = currentTargetPoint;
                    if (key == 'tb3_2') taskQueueTb3_2[0].indexActiveTask = currentTargetPoint;
                } else if (headerPayload === 'Goal done') {
                    if (key == 'tb3_0' && currentTargetPoint === taskQueueTb3_0[0].indexActiveTask) taskQueueTb3_0[taskQueueTb3_0[0].indexActiveTask].statusTask = true;

                    if (key == 'tb3_1' && currentTargetPoint === taskQueueTb3_1[0].indexActiveTask) taskQueueTb3_1[taskQueueTb3_1[0].indexActiveTask].statusTask = true;
                    if (key == 'tb3_2' && currentTargetPoint === taskQueueTb3_2[0].indexActiveTask) taskQueueTb3_2[taskQueueTb3_2[0].indexActiveTask].statusTask = true;
                }
            }
            if (key == 'tb3_0') {
                socketIo.emit(`statusNav_${key}`, taskQueueTb3_0);
            }
            if (key == 'tb3_1') socketIo.emit(`statusNav_${key}`, taskQueueTb3_1);
            if (key == 'tb3_2') socketIo.emit(`statusNav_${key}`, taskQueueTb3_2);

            console.log(`🚀 ${robotConfigs[key].rosName} data: `, data);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_0:', taskQueueTb3_0);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_1:', taskQueueTb3_1);
            console.log('🚀 ~ file: ros.controller.js:58 ~ taskQueueTb3_2:', taskQueueTb3_2);
        });
    });

    robotConfigs[key].rosWebsocket.on('close', function (e) {
        Logging.info(`Try to connect to robot ${robotConfigs[key].rosName} through websocket`);
    });

    //Auto Reconnection for roslibjs
    setInterval(function () {
        // socketIo.emit("statusNav", `hello world ${Date.now()}`);
        robotConfigs[key].rosWebsocket.connect(websocket);
    }, 4000);
});

// console.log("🚀 ~ file: ros.controller.js:58 ~ robotConfigs:", robotConfigs)
class RobotController {
    constructor() {
        // this.subcribeTopic();
    }
    resetAllTaskQueue = function (req, res) {
        console.log('🚀 ~ ~ resetAllTaskQueue');
        taskQueueTb3_0 = [{ indexActiveTask: 0 }];
        taskQueueTb3_1 = [{ indexActiveTask: 0 }];
        taskQueueTb3_2 = [{ indexActiveTask: 0 }];
        return res.status(200).json({
            success: true,
            message: {
                tb3_0: taskQueueTb3_0,
                tb3_1: taskQueueTb3_1,
                tb3_2: taskQueueTb3_2
            }
        });
    };
    getTaskQueueFromAllRobots = function (req, res) {
        console.log('🚀 ~ ~ getTaskQueueFromAllRobots');
        return res.status(200).json({
            success: true,
            message: {
                tb3_0: taskQueueTb3_0,
                tb3_1: taskQueueTb3_1,
                tb3_2: taskQueueTb3_2
            }
        });
    };

    sendTaskListToOneRobot = function (req, res) {
        const robotId = req.params.id;
        const { taskList } = req.body;

        if (robotId && robotConfigs.hasOwnProperty(robotId)) {
            if (taskList && taskList.length > 0) {
                const poseArray = taskList.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });
                switch (robotId) {
                    case 'tb3_0': {
                        taskQueueTb3_0 = [...taskQueueTb3_0, ...taskList, { targetName: 'home_0', cargoVolume: 0, statusTask: false }];
                        console.log('🚀 ~ file: ros.controller.js:124 ~ RobotController ~ taskQueueTb3_0:', taskQueueTb3_0);
                        poseArray.push(GoalPoseArray['home_0']);
                        break;
                    }
                    case 'tb3_1': {
                        taskQueueTb3_1 = [...taskQueueTb3_1, ...taskList, { targetName: 'home_1', cargoVolume: 0, statusTask: false }];
                        poseArray.push(GoalPoseArray['home_1']);
                        break;
                    }
                    case 'tb3_2': {
                        taskQueueTb3_2 = [...taskQueueTb3_2, ...taskList, { targetName: 'home_2', cargoVolume: 0, statusTask: false }];
                        poseArray.push(GoalPoseArray['home_2']);
                        break;
                    }
                    default:
                        break;
                }

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

                // robotList[i]['robotStatus'] = result.currentStatus;
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

export const TargetPointList = [
    {
        pointName: 'point_1',
        pointType: 'Goal point',
        xCoordinate: -4.06,
        yCoordinate: 3.5,
        theta: 0
    },
    {
        pointName: 'point_2',
        pointType: 'Goal Point',
        xCoordinate: -4.048,
        yCoordinate: 1.09,
        theta: 0
    },
    {
        pointName: 'point_3',
        pointType: 'Goal Point',
        xCoordinate: 0.47,
        yCoordinate: 0.32,
        theta: 0
    },
    {
        pointName: 'point_4',
        pointType: 'Goal Point',
        xCoordinate: 4.63,
        yCoordinate: 3.7,
        theta: 0
    },
    {
        pointName: 'point_5',
        pointType: 'Goal Point',
        xCoordinate: 4.55,
        yCoordinate: 0.74,
        theta: 0
    }
];

export const HomePointList = [
    {
        pointName: 'home_0',
        pointType: 'Home Point',
        xCoordinate: -6.62,
        yCoordinate: 4.0,
        theta: 0
    },
    {
        pointName: 'home_1',
        pointType: 'Home Point',
        xCoordinate: -6.2,
        yCoordinate: 3.25,
        theta: 0
    },
    {
        pointName: 'home_2',
        pointType: 'Home Point',
        xCoordinate: -6.2,
        yCoordinate: 2.5,
        theta: 0
    }
];

const GoalPoseArray = {};
function ParseFloat(str, val) {
    str = str.toString();
    str = str.slice(0, str.indexOf('.') + val + 1);
    return Number(str);
}
for (let i = 0; i < TargetPointList.length; i++) {
    GoalPoseArray[TargetPointList[i].pointName] = {
        position: {
            x: TargetPointList[i].xCoordinate,
            y: TargetPointList[i].yCoordinate,
            z: 0
        },
        orientation: {
            x: 0,
            y: 0,
            z: ParseFloat(Math.sin(TargetPointList[i].theta / 2.0), 2),
            w: ParseFloat(Math.cos(TargetPointList[i].theta / 2.0), 2)
        }
    };
}

for (let i = 0; i < HomePointList.length; i++) {
    GoalPoseArray[HomePointList[i].pointName] = {
        position: {
            x: HomePointList[i].xCoordinate,
            y: HomePointList[i].yCoordinate,
            z: 0
        },
        orientation: {
            x: 0,
            y: 0,
            z: ParseFloat(Math.sin(HomePointList[i].theta / 2.0), 2),
            w: ParseFloat(Math.cos(HomePointList[i].theta / 2.0), 2)
        }
    };
}
// console.log('🚀 ~ file: ros.controller.js:374 ~ GoalPoseArray:', GoalPoseArray);
