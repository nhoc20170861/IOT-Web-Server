import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, queue, addTaskToQueue, addTaskToQueueEsp } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;
export const myWorker = new Worker(
    'taskQueue',
    async (job) => {
        console.log(`main wroker process job `, job.data);
        let nameRobotWillCall = '';

        // Filler all robot is available to get new task
        // for (const key in statusOfAllRobots) {
        //     if (statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals') {
        //         nameRobotWillCall = key;
        //         break;
        //     }
        // }

        let orderPath = job.data.subTaskList;
        let minTotalDistance = Infinity;
        let totalDistance = 0;
        let optimalRoutePathOfRobotWillCall = [];

        let routePath = [];

        const originRoutePath = Array.from({ length: orderPath.length + 1 }, (_, index) => index);
        console.log('🚀 ~ file: worker.mainQueue.js:44 ~ .map ~ originRoutePath:', originRoutePath);
        Object.keys(statusOfAllRobots)
            .filter((key) => {
                return statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals';
            })
            .map((key) => {
                routePath = utilsFunction.createRoutePath(orderPath, key);
                const tspMatrix = utilsFunction.createTSPMatrix(routePath, key);
                // console.log('🚀 ~ file: worker.mainQueue.js:29 ~ .map ~ tspMatrix:', tspMatrix);
                let optimalRoutePath = [];
                if (job.data.pathOptimization) {
                    optimalRoutePath = utilsFunction.findOptimalPath(tspMatrix);
                    console.log('Đường đi tối ưu: ' + optimalRoutePath.join(' -> '));
                    totalDistance = utilsFunction.calculateTotalDistance(tspMatrix, optimalRoutePath);
                } else {
                    totalDistance = utilsFunction.calculateTotalDistance(tspMatrix, originRoutePath);
                }
                // Logging.info(`🚀 map ~ min totalDistance:  ${totalDistance}`);
                if (minTotalDistance > totalDistance) {
                    optimalRoutePathOfRobotWillCall = optimalRoutePath;
                    minTotalDistance = totalDistance;
                    nameRobotWillCall = key;
                }
            });
        Logging.info(`🚀 map ~ min totalDistance:  ${minTotalDistance}`);
        Logging.info(`🚀 ~ nameRobotWillCall: ${nameRobotWillCall}`);

        if (nameRobotWillCall !== '') {
            if (job.data.pathOptimization) {
                orderPath = utilsFunction.createOptimalPath(routePath, optimalRoutePathOfRobotWillCall);
                const firstEleOfArray = orderPath.shift();
                console.log('🚀 ~ file: worker.mainQueue.js:48 ~ orderPath after alogithm:', orderPath);
            }

            if (job.data.autoGoHome) {
                orderPath.push({ targetName: robotConfigs[nameRobotWillCall].initPoint, cargoVolume: 0, isDone: false });
            }
            let taskId = job.data.taskId;
            for (const subTask of orderPath) {
                await SubTask.create({
                    taskId: taskId,
                    cargo: subTask.cargoVolume,
                    targetName: subTask.targetName,
                    isDone: subTask.status
                });
            }
            // cập nhập task và lưu vào cơ sở dữ liệu
            try {
                // const task = await Task.findOne({
                //     where: { id: taskId }
                // });
                // if (!task) {
                //     console.log('Task not found');
                //     return;
                // }
                // task.robotId = robotConfigs[nameRobotWillCall].id;
                // task.status = 'START';
                // task.startTime = new Date();
                // await task.save();
                // console.log('🚀 ~ file: worker.js:38 ~ task:', task.dataValues);

                job.data.subTaskList = orderPath;
                const jobAssignToRobot = await queueRobots[`taskQueueRobot_${robotConfigs[nameRobotWillCall].id}`].add(
                    `task_${taskId}_${nameRobotWillCall}`,
                    { nameRobotWillCall, ...job.data },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000
                        },
                        delay: 5000
                    }
                );
            } catch (error) {
                console.log(' ~ error:', error);
            }

            // let orderPath = job.data.subTaskList;
            // console.log('🚀 ~ original~ subTaskList:', orderPath);
            // if (job.data.pathOptimization) {
            //     const tspMatrix = createTSPMatrix(orderPath, nameRobotWillCall);

            //     const optimalPath = findOptimalPath(tspMatrix);

            //     console.log('Đường đi tối ưu: ' + optimalPath.join(' -> '));
            //     const optimalOrder = createOptimalOrder(orderPath, optimalPath);

            //     console.log('TargetPointList optimal', optimalOrder);

            //     const firstEleOfArray = optimalOrder.shift();

            //     const previousTaskQueue = robotConfigs[nameRobotWillCall].taskQueue;
            //     robotConfigs[nameRobotWillCall].taskQueue = [...previousTaskQueue, ...optimalOrder];
            //     orderPath = optimalOrder;
            //     console.log('🚀new GoalPoseList after optimal:', optimalOrder);

            // } else {
            // }

            // if (job.data.autoGoHome) {
            //     orderPath.push({ targetName: robotConfigs[nameRobotWillCall].initPoint, cargoVolume: 0, isDone: false });
            // }

            // console.log('🚀  robot will follow path', orderPath);
            // poseArray = orderPath.map((task, index) => {
            //     return {
            //         ...GoalPoseArray[task.targetName]
            //     };
            // });

            // const TargetGoal = new ROSLIB.Topic({
            //     ros: robotConfigs[nameRobotWillCall].rosWebsocket,
            //     name: `/${nameRobotWillCall}/move_base_sequence/wayposes`,
            //     messageType: 'geometry_msgs/PoseArray'
            // });

            // const targetGoalMessage = new ROSLIB.Message({
            //     header: {
            //         frame_id: 'map'
            //     },
            //     poses: poseArray
            // });

            // TargetGoal.publish(targetGoalMessage);
            return nameRobotWillCall;
        } else {
            // queue.pause();
            // setTimeout(() => {
            //     queue.resume();
            // }, 10000);
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
    statusOfAllRobots[robotName] = 'Get new task';
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
    Logging.warning(`Main worker, Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
    // if (job.attemptsMade < 3) {
    //     // Retry lại job sau 5, 10 và 15 giây (tăng dần theo cấp số nhân)
    //     job.backoff('exponential', { delay: 5000 * job.attemptsMade });
    // }
});
myWorker.on('error', (err) => {
    // log the error
    console.error(err);
});
