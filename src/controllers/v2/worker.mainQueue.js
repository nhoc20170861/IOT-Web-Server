import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, addTaskToQueueBackLog } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;

class QueueJS {
    constructor() {
        this.items = {};
        this.frontIndex = 0;
        this.backIndex = 0;
    }
    enqueue(item) {
        this.items[this.backIndex] = item;
        this.backIndex++;
        return item + ' inserted';
    }
    dequeue() {
        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex];
        this.frontIndex++;
        return item;
    }
    peek() {
        return this.items[this.frontIndex];
    }
    get printQueue() {
        return this.items;
    }
}

export const myWorker = new Worker(
    'taskQueue',
    async (job) => {
        console.log(`main wroker process job `, job.data);
        let tspDistanceMatrix = [];

        const listRobotFree = Object.keys(statusOfAllRobots).filter((key) => {
            return statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals';
        });
        let queueRobotsFree = [];
        for (const key in queueRobots) {
            // console.log(key);
            const checkkQueue = await queueRobots[key].isPaused();
            if (!checkkQueue) {
                queueRobotsFree.push(key);
                //break;
            }
        }
        console.log('🚀 ~ file: worker.mainQueue.js:80 ~ listRobotFree ~ listRobotFree:', listRobotFree);
        const robotFreeNumber = listRobotFree.length;
        const totalVolume = utilsFunction.calculateVolume(job.data.subTaskList);
        const maxVolumeCarry = 100 * robotFreeNumber;
        if (totalVolume <= 100) {
            if (queueRobotsFree.length > 0 || robotFreeNumber >= 1) {
                let nameRobotWillCall = '';
                let orginSubTaskList = job.data.subTaskList;
                let newSubTaskList = [];
                let minTotalDistance = Infinity;
                let totalDistance = 0;
                let optimalOrderPathOfRobotWillCall = [];
                let routePath = [];

                const originOrderPath = Array.from({ length: orginSubTaskList.length + 1 }, (_, index) => index);
                if (job.data.autoGoHome) originOrderPath.push(0);
                Logging.debug(`🚀 before algorithm,orderPath:` + originOrderPath.join(' -> '));

                queueRobotsFree.map((key) => {
                    routePath = utilsFunction.createRoutePath(orginSubTaskList, key);
                    tspDistanceMatrix = utilsFunction.createTSPMatrix(routePath, key);
                    // console.log('🚀 ~ file: worker.mainQueue.js:29 ~ .map ~ tspDistanceMatrix:', tspDistanceMatrix);
                    let optimalOrderPath = [];
                    if (job.data.pathOptimization) {
                        if (orginSubTaskList.length < 7) {
                            const result = utilsFunction.tspGreedyAlgorithm(tspDistanceMatrix);
                            optimalOrderPath = result.path;
                            totalDistance = result.totalDistance;
                        } else {
                            const result = utilsFunction.tspDynamicProgramming(tspDistanceMatrix);
                            optimalOrderPath = result.path;
                            totalDistance = result.totalDistance;
                        }
                        // Logging.debug(`Optimal path for ${key} ` + optimalOrderPath.join(' -> '));
                    } else {
                        totalDistance = utilsFunction.calculateTotalDistance(tspDistanceMatrix, originOrderPath);
                    }
                    // Logging.info(`🚀 map ~ min totalDistance:  ${totalDistance}`);
                    if (minTotalDistance > totalDistance) {
                        optimalOrderPathOfRobotWillCall = optimalOrderPath;
                        minTotalDistance = totalDistance;
                        nameRobotWillCall = key;
                    }
                });

                Logging.info(`🚀 map ~ min totalDistance:  ${minTotalDistance}`);
                Logging.info(`🚀 ~ nameRobotWillCall: ${nameRobotWillCall}`);

                if (job.data.pathOptimization) {
                    Logging.debug(`Optimal path ${nameRobotWillCall}: ` + optimalOrderPathOfRobotWillCall.join(' -> '));
                    newSubTaskList = utilsFunction.createOptimalOrderPath(routePath, optimalOrderPathOfRobotWillCall);
                    const firstEleOfArray = newSubTaskList.shift();
                    if (!job.data.autoGoHome) {
                        const lastEleOfArray = newSubTaskList.pop();
                    }
                    console.log('🚀  newSubTaskList after alogithm:', newSubTaskList);
                } else {
                    Logging.debug(`NotOptimal path ${nameRobotWillCall}: ` + originOrderPath.join(' -> '));
                    newSubTaskList = utilsFunction.createOptimalOrderPath(routePath, originOrderPath);
                    const firstEleOfArray = newSubTaskList.shift();
                    console.log('🚀 newSubTaskList without alogithm:', newSubTaskList);
                }

                try {
                    // Tạo task và lưu vào cơ sở dữ liệu
                    // const { id: taskId } = await Task.create({
                    //     taskName: job.data.taskName,
                    //     taskDescription: job.data.taskDescription || 'new task',
                    //     pathOptimization: job.data.pathOptimization,
                    //     autoGoHome: job.data.autoGoHome,
                    //     status: 'INITIALIZE',
                    //     startTime: new Date()
                    // });
                    const taskId = job.data.taskId;
                    for (const subTask of newSubTaskList) {
                        await SubTask.create({
                            taskId: taskId,
                            cargo: subTask.cargoVolume,
                            targetName: subTask.targetName,
                            isDone: subTask.status
                        });
                    }

                    job.data.subTaskList = newSubTaskList;
                    // job.data.taskId = taskId;

                    const jobAssignToRobot = await queueRobots[`mir${robotConfigs[nameRobotWillCall].id}`].add(
                        `task_${taskId}_${nameRobotWillCall}`,
                        { nameRobotWillCall, ...job.data },
                        {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 5000
                            },
                            delay: 1000
                        }
                    );
                } catch (error) {
                    console.log(' ~ error:', error);
                }

                // let orderPath = job.data.subTaskList;
                // console.log('🚀 ~ original~ subTaskList:', orderPath);
                // if (job.data.pathOptimization) {
                //     const tspDistanceMatrix = createTSPMatrix(orderPath, nameRobotWillCall);

                //     const optimalPath = findOptimalPath(tspDistanceMatrix);

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
                addTaskToQueueBackLog(job.data);
                throw new Error('All robots are busy');
            }
        } else if (totalVolume > 100 && totalVolume <= maxVolumeCarry) {
            const data = {
                distanceMatrix: [
                    [0, 2232, 1026, 3294, 3443, 1994, 741, 2571],
                    [2232, 0, 1780, 1640, 1300, 1000, 2366, 698],
                    [1026, 1780, 0, 3238, 3080, 2042, 659, 2347],
                    [3294, 1640, 3238, 0, 1000, 1300, 3698, 946],
                    [3443, 1300, 3080, 1000, 0, 1640, 3657, 908],
                    [1994, 1000, 2042, 1300, 1640, 0, 2429, 746],
                    [741, 2366, 659, 3698, 3657, 2429, 0, 2862],
                    [2571, 698, 2347, 946, 908, 746, 2862, 0]
                ],
                demands: [0, 20, 20, 20, 20, 20, 20, 20],
                vehicleCapacities: new Array(robotFreeNumber).fill(100),
                vehicleNumber: robotFreeNumber,
                depot: 0
            };
            const response = await fetch('http://localhost:8080/vehicleCapacity', { method: 'POST', body: data });
            console.log('🚀 ~ file: worker.mainQueue.js:225 ~ response:', response);
            throw new Error('Need more than a robot');
        } else {
            addTaskToQueueBackLog(job.data);
            throw new Error('OverCapacity');
        }
    },
    {
        connection: {
            host: 'localhost',
            port: 6379
        },
        limiter: {
            max: 10,
            duration: 1000
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
        Logging.info(`myWorker Completed job with jobId ${job.data.taskId}`);
    }
});
// Cấu hình retry cho job thất bại
myWorker.on('failed', (job, err) => {
    let messageErr = err.message + ` Job ${job.id} will be moved to backlog`;

    socketIo.emit('WorkerNotify', {
        type: 'AssignTask',
        success: false,
        retry: job.attemptsMade,
        message: messageErr
    });
    Logging.warning(`Main worker, Job ${job.id}: ${err.message} and retry with ${job.attemptsMade}`);

    // if (job.attemptsMade < 3) {
    //     // Retry lại job sau 5, 10 và 15 giây (tăng dần theo cấp số nhân)
    //     job.backoff('exponential', { delay: 5000 * job.attemptsMade });
    // }
});
myWorker.on('error', (err) => {
    // log the error
    console.error(err);
});
