import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, addTaskToQueueBackLog } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;
global.maxCapacityEachRobot = 100;
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
        console.group();
        console.log(`main wroker process job `, job.data);
        const taskId = job.data.taskId;
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
        console.log('🚀listRobotFree ~ listRobotFree:', queueRobotsFree);
        const robotFreeNumber = queueRobotsFree.length;
        const totalVolume = utilsFunction.calculateVolume(job.data.subTaskList);
        const maxVolumeCarry = maxCapacityEachRobot * robotFreeNumber;
        const orginSubTaskList = job.data.subTaskList;

        if (totalVolume <= maxCapacityEachRobot) {
            if (queueRobotsFree.length > 0 || robotFreeNumber >= 1) {
                console.group('totalVolume <= maxCapacityEachRobot');
                let nameRobotWillCall = '';
                let newSubTaskList = [];
                let minTotalDistance = Infinity;
                let totalDistance = 0;
                let optimalOrderPathOfRobotWillCall = [];
                let routePath = [];

                const originOrderPath = Array.from({ length: orginSubTaskList.length + 1 }, (_, index) => index);
                if (job.data.autoGoHome) originOrderPath.push(0);
                Logging.debug(`🚀 before algorithm, orderPath: ` + originOrderPath.join(' -> '));

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
                    await Task.setRobots(taskId, [robotConfigs[nameRobotWillCall].id]);
                    job.data.subTaskList = newSubTaskList;
                    const jobAssignToRobot = await queueRobots[nameRobotWillCall].add(
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
                console.groupEnd();

                return nameRobotWillCall;
            } else {
                addTaskToQueueBackLog(job.data);
                throw new Error('All robots are busy');
            }
        } else if (totalVolume > maxCapacityEachRobot && totalVolume <= maxVolumeCarry) {
            console.group('totalVolume > maxCapacityEachRobot');
            try {
                const routePath = utilsFunction.createRoutePath(orginSubTaskList, queueRobotsFree[robotFreeNumber - 1]);
                const tspDistanceMatrix = utilsFunction.createTSPMatrix(routePath, queueRobotsFree[robotFreeNumber - 1]);
                // distanceMatrix: [
                //     [0, 2232, 1026, 3294, 3443, 1994, 741, 2571],
                //     [2232, 0, 1780, 1640, 1300, 1000, 2366, 698],
                //     [1026, 1780, 0, 3238, 3080, 2042, 659, 2347],
                //     [3294, 1640, 3238, 0, 1000, 1300, 3698, 946],
                //     [3443, 1300, 3080, 1000, 0, 1640, 3657, 908],
                //     [1994, 1000, 2042, 1300, 1640, 0, 2429, 746],
                //     [741, 2366, 659, 3698, 3657, 2429, 0, 2862],
                //     [2571, 698, 2347, 946, 908, 746, 2862, 0]
                // ],
                const demanLoads = orginSubTaskList.map((item, index) => {
                    return item.cargoVolume;
                });
                const data = {
                    distanceMatrix: tspDistanceMatrix,
                    demands: [0, ...demanLoads],
                    vehicleCapacities: new Array(robotFreeNumber).fill(maxCapacityEachRobot),
                    vehicleNumber: robotFreeNumber,
                    depot: 0
                };
                const response = await fetch('http://localhost:8080/vehicleCapacity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                // console.log('🚀 ~ response:', result);
                if (!result.error) {
                    const robotArray = [];
                    Object.keys(result.vehicleLoads).forEach((key, index) => {
                        if (result.vehicleLoads[key] !== 0) {
                            robotArray.push(+key);
                        }
                    });
                    console.log('🚀 ~ robotArray ~ robotArray:', robotArray);
                    const createNewMultiJob = {};

                    Object.keys(result.vehicleLoads).forEach((key) => {
                        const nameRobot = 'mir' + key;
                        if (result.vehicleLoads[key] !== 0 && !createNewMultiJob.hasOwnProperty(nameRobot)) {
                            createNewMultiJob[nameRobot] = {};
                            createNewMultiJob[nameRobot]['subTaskList'] = [];
                            const length = result.vehicleRoutes[key].length;
                            result.vehicleRoutes[key].forEach((destinationInfo, index) => {
                                if (index !== 0 && index !== length - 1) {
                                    createNewMultiJob[nameRobot]['subTaskList'].push(orginSubTaskList[destinationInfo.destination - 1]);
                                }
                            });
                            createNewMultiJob[nameRobot]['taskId'] = taskId;
                            createNewMultiJob[nameRobot]['nameRobotWillCall'] = nameRobot;
                        }
                    });
                    Task.setRobots(taskId, robotArray);
                    console.log('🚀 ~ createNewJob:', createNewMultiJob);

                    for (const key in createNewMultiJob) {
                        const jobAssignToMultiRobot = await queueRobots[key].add(`task_${taskId}_${key}`, createNewMultiJob[key], {
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 5000
                            },
                            delay: 1000
                        });
                    }
                    return Object.keys(createNewMultiJob);
                } else {
                    throw new Error('Can not find solution');
                }
            } catch (error) {
                console.log('🚀 worker.mainQueue.js:230 ~ error:', error.message);
            }
            console.groupEnd();
        } else {
            addTaskToQueueBackLog(job.data);
            throw new Error('OverCapacity');
        }
        console.groupEnd();
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
    let message = `TaskId ${job.data.taskId} task performed by `;
    if (typeof robotName === 'string') {
        message += robotName;
    } else if (Array.isArray(robotName)) {
        message += robotName.join(', ');
    }
    socketIo.emit('WorkerNotify', {
        type: 'AssignTask',
        success: true,
        message: message
    });

    Logging.info(`myWorker Completed job with jobId ${job.data.taskId}`);
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
