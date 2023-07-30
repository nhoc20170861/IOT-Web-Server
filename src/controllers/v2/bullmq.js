import { Worker, Queue } from 'bullmq';
const ROSLIB = require('roslib');
import { socketIo } from '../../app';
import Logging from '../../library/Logging';
import clientMqtt from '../../configs';
// import module handle database
const db = require('../../models');
const Task = db.Task;
// initialize queue
export const queue = new Queue('taskQueue', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});

export const queueEsp = new Queue('taskQueueEsp', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});

export const myWorker = new Worker(
    'taskQueue',
    async (job) => {
        // console.log(`wroker process job `, job.data);
        let nameRobotWillCall = '';

        for (const key in statusOfAllRobots) {
            if (statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals') {
                nameRobotWillCall = key;
                break;
            }
        }
        Logging.info(`🚀 ~ nameRobotWillCall: ${nameRobotWillCall}`);

        if (nameRobotWillCall !== '') {
            let poseArray = [];
            const subTaskList = job.data.subTaskList;
            console.log('🚀 ~ original~ subTaskList:', subTaskList);
            // cập nhập task và lưu vào cơ sở dữ liệu
            try {
                const task = await Task.findByPk(job.data.taskId);
                if (!task) {
                    console.log('Task not found');
                    return;
                }
                task.robotId = robotConfigs[nameRobotWillCall].id;
                task.status = 'START';
                task.startTime = new Date();
                await task.save();
            } catch (error) {
                console.log(' ~ error:', error);
            }

            if (job.data.pathOptimization) {
                const tspMatrix = createTSPMatrix(subTaskList, nameRobotWillCall);

                const optimalPath = findOptimalPath(tspMatrix);

                // console.log('Đường đi tối ưu: ' + optimalPath.join(' -> '));
                const optimalOrder = createOptimalOrder(subTaskList, optimalPath);

                console.log('TargetPointList optimal', optimalOrder);

                const firstEleOfArray = optimalOrder.shift();
                if (robotConfigs[nameRobotWillCall].currentGoal !== robotConfigs[nameRobotWillCall].initPoint) {
                    Logging.warning(`current pose ${robotConfigs[nameRobotWillCall].currentGoal} is different from init pose`);
                } else {
                    optimalOrder.push(firstEleOfArray);
                }

                const previousTaskQueue = robotConfigs[nameRobotWillCall].taskQueue;
                robotConfigs[nameRobotWillCall].taskQueue = [...previousTaskQueue, ...optimalOrder];

                console.log('🚀new GoalPoseList:', optimalOrder);

                poseArray = optimalOrder.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });
            } else {
                poseArray = subTaskList.map((task, index) => {
                    return {
                        ...GoalPoseArray[task.targetName]
                    };
                });
            }

            const TargetGoal = new ROSLIB.Topic({
                ros: robotConfigs[nameRobotWillCall].rosWebsocket,
                name: `/${nameRobotWillCall}/move_base_sequence/wayposes`,
                messageType: 'geometry_msgs/PoseArray'
            });

            const targetGoalMessage = new ROSLIB.Message({
                header: {
                    frame_id: 'map'
                },
                poses: poseArray
            });

            TargetGoal.publish(targetGoalMessage);
            return nameRobotWillCall;
        } else {
            console.log("🚀 queue.process ~  'All robot are busy!");
            throw new Error('Job failed');
        }
    },
    {
        connection: {
            host: 'localhost',
            port: 6379
        },
        autorun: false
    }
);
myWorker.on('completed', (job, robotName) => {
    // console.log('🚀 ~ file: ros.controller.js:246 ~ myWorker.on ~ job:', job);
    socketIo.emit('WorkerNotify', {
        type: 'AssignTask',
        success: true,
        message: `TaskId ${job.data.taskId} assign to ${robotName}`
    });
    if (robotConfigs.hasOwnProperty(robotName)) {
        robotConfigs[robotName].taskQueue[0].taskId = job.data.taskId;
        Logging.info(`Completed job with jobId ${job.id}`);
    }
});
// Cấu hình retry cho job thất bại
myWorker.on('failed', (job, err) => {
    socketIo.emit('WorkerNotify', {
        type: 'AssignTask',
        success: false,
        retry: job.attemptsMade,
        message: `All robots are busy! Waiting`
    });
    Logging.warning(`Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
    // if (job.attemptsMade < 3) {
    //     // Retry lại job sau 5, 10 và 15 giây (tăng dần theo cấp số nhân)
    //     job.backoff('exponential', { delay: 5000 * job.attemptsMade });
    // }
});
myWorker.on('error', (err) => {
    // log the error
    console.error(err);
});

export const myWorkerEsp = new Worker(
    'taskQueueEsp',
    async (job) => {
        // console.log(`wroker process job `, job.data);
        let nameRobotWillCall = '';
        console.log('🚀 taskQueueEsp~ statusOfAllRobots:', statusOfAllRobots);
        for (const key in statusOfAllRobots) {
            if (statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals') {
                nameRobotWillCall = key;
                break;
            }
        }
        Logging.info(`🚀taskQueueEsp ~ nameRobotWillCall: ${nameRobotWillCall}`);

        if (nameRobotWillCall !== '') {
            let poseArray = [];
            const subTaskList = job.data.subTaskList;
            console.log('🚀 ~ original~ subTaskList:', subTaskList);
            // cập nhập task và lưu vào cơ sở dữ liệu
            try {
                const task = await Task.findByPk(job.data.taskId);
                if (!task) {
                    console.log('Task not found');
                    return;
                }
                task.robotId = robotConfigs[nameRobotWillCall].id;
                task.status = 'START';
                task.startTime = new Date();
                await task.save();
            } catch (error) {
                console.log(' ~ error:', error);
            }

            poseArray = subTaskList.map((task, index) => {
                return {
                    ...GoalPoseArray[task.targetName]
                };
            });

            const TargetGoal = new ROSLIB.Topic({
                ros: robotConfigs[nameRobotWillCall].rosWebsocket,
                name: `/${nameRobotWillCall}/move_base_sequence/wayposes`,
                messageType: 'geometry_msgs/PoseArray'
            });

            const targetGoalMessage = new ROSLIB.Message({
                header: {
                    frame_id: 'map'
                },
                poses: poseArray
            });

            TargetGoal.publish(targetGoalMessage);
            return nameRobotWillCall;
        } else {
            console.log("🚀 queue.process ~  'All robot are busy!");
            throw new Error('Job failed');
        }
    },
    {
        connection: {
            host: 'localhost',
            port: 6379
        },
        autorun: false
    }
);
// Cấu hình retry cho job thành công
myWorkerEsp.on('completed', (job, robotName) => {
    // console.log('🚀 ~ file: ros.controller.js:246 ~ myWorker.on ~ job:', job);
    const topicPub = 'nhoc20170861/Esp/WokerNotify';
    const msgNotify = {
        type: 'AssignTask',
        success: true,
        robotName: robotName,
        message: `TaskId ${job.data.taskId} assign to ${robotName}`
    };
    clientMqtt.publish(topicPub, JSON.stringify(msgNotify), { qos: 2, retain: false }, (error) => {
        if (error) {
            console.error(error);
        }
    });
    if (robotConfigs.hasOwnProperty(robotName)) {
        robotConfigs[robotName].taskQueue[0].taskId = job.data.taskId;
        Logging.info(`Completed jobEsp with jobId ${job.id}`);
    }
});
// Cấu hình retry cho job thất bại
myWorkerEsp.on('failed', (job, err) => {
    const topicPub = 'nhoc20170861/Esp/WokerNotify';
    const msgNotify = {
        type: 'AssignTask',
        success: false,
        retry: job.attemptsMade,
        message: `All robots are busy! Waiting`
    };
    clientMqtt.publish(topicPub, JSON.stringify(msgNotify), { qos: 2, retain: false }, (error) => {
        if (error) {
            console.error(error);
        }
    });
    Logging.warning(`JobEsp ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
    // if (job.attemptsMade < 3) {
    //     // Retry lại job sau 5, 10 và 15 giây (tăng dần theo cấp số nhân)
    //     job.backoff('exponential', { delay: 5000 * job.attemptsMade });
    // }
});
myWorkerEsp.on('error', (err) => {
    // log the error
    console.error(err);
});

export const addTaskToQueue = async function (data) {
    const { taskId } = data;
    const job = await queue.add(`task_${taskId}`, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        delay: 5000
    });
    return job;
};
export const addTaskToQueueEsp = async function (data) {
    const { taskId } = data;
    const jobEsp = await queueEsp.add(`task_${taskId}`, data, {
        attempts: 6,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        delay: 3000
    });
    return jobEsp;
};

// utils function
// Create TSP Matrix
function createTSPMatrix(goalTargetList, robotId) {
    if (robotConfigs.hasOwnProperty(robotId)) {
        if (robotConfigs[robotId].currentGoal === robotConfigs[robotId].initPoint) {
            // Robot chua nhan nhiem vu dang o vi tri home
            goalTargetList.unshift({ targetName: robotConfigs[robotId].initPoint, cargoVolume: 0, isDone: false });
        } else {
            goalTargetList.unshift({ targetName: robotConfigs[robotId].currentGoal, cargoVolume: 0, isDone: false });
        }
    }

    const n = goalTargetList.length;

    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    for (let i = 0; i < n; i++) {
        let firstPoint = GoalPoseArray[goalTargetList[i].targetName].position;
        // if ((i = 0 && robotConfigs[robotId].currentGoal !== robotConfigs[robotId].initPoint))
        // firstPoint = currentPose[robotId];
        for (let j = 0; j < n; j++) {
            const secondPoint = GoalPoseArray[goalTargetList[j].targetName].position;
            tspMatrix[i][j] = calculateDistance(firstPoint, secondPoint);
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

// calculate distance between two point
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
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
