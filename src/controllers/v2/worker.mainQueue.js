import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, addTaskToQueueBackLog } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;
global.maxCapacityEachRobot = 100;

export const myWorker = new Worker(
    'taskQueue',
    async (job) => {
        console.log(`main wroker process job `, job.data);
        const taskId = job.data.taskId;
        let tspDistanceMatrix = [];

        const listRobotFree = Object.keys(statusOfAllRobots).filter((key) => {
            return statusOfAllRobots[key] === 'navigation finish' || statusOfAllRobots[key] === 'free' || statusOfAllRobots[key] === 'Waiting for goals';
        });
        console.log('🚀 ~ file: worker.mainQueue.js:23 ~ listRobotFree:', listRobotFree);
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
        console.log('🚀 ~ file: worker.mainQueue.js:59 ~ maxVolumeCarry:', maxVolumeCarry);
        const orginSubTaskList = job.data.subTaskList;

        if (totalVolume <= maxCapacityEachRobot) {
            if (robotFreeNumber >= 1) {
                // console.group('totalVolume <= maxCapacityEachRobot');
                let nameRobotWillCall = '';
                let newSubTaskList = [];
                let minTotalDistance = Infinity;
                let totalDistance = 0;
                let optimalOrderPathOfRobotWillCall = [];
                let routePath = [];

                const originOrderPath = Array.from({ length: orginSubTaskList.length + 1 }, (_, index) => index);
                if (job.data.autoGoHome) originOrderPath.push(0);

                // Logging.debug(`🚀 before algorithm, orderPath: ` + originOrderPath.join(' -> '));
                const orderPathWithtargetName = job.data.subTaskList.map((item) => item.targetName);
                Logging.debug(`🚀 before algorithm, orderPath: ` + orderPathWithtargetName.join(' -> '));

                queueRobotsFree.map((key) => {
                    routePath = utilsFunction.createRoutePath(orginSubTaskList, key);
                    tspDistanceMatrix = utilsFunction.createTSPMatrix(routePath, key);
                    // console.log('🚀 ~ file: worker.mainQueue.js:81 ~ queueRobotsFree.map ~ tspDistanceMatrix:', tspDistanceMatrix);

                    let optimalOrderPath = [];

                    if (job.data.pathOptimization) {
                        console.time('Execution time');
                        if (orginSubTaskList.length < 7) {
                            const result = utilsFunction.tspGreedyAlgorithm(tspDistanceMatrix);
                            optimalOrderPath = result.path;
                            totalDistance = result.totalDistance;
                        } else {
                            const result = utilsFunction.tspDynamicProgramming(tspDistanceMatrix);
                            optimalOrderPath = result.path;
                            totalDistance = result.totalDistance;
                        }
                        console.timeEnd('Execution time');
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
                    newSubTaskList = utilsFunction.createOptimalOrderPath(routePath, optimalOrderPathOfRobotWillCall);

                    const orderPathOptimalWithtargetName = newSubTaskList.map((item) => item.targetName);
                    Logging.debug(`🚀 after algorithm, orderPath for ${nameRobotWillCall}: ` + orderPathOptimalWithtargetName.join(' -> '));

                    const firstEleOfArray = newSubTaskList.shift();
                    if (!job.data.autoGoHome) {
                        const lastEleOfArray = newSubTaskList.pop();
                    }
                    console.log('🚀  newSubTaskList after alogithm:', newSubTaskList);
                } else {
                    newSubTaskList = utilsFunction.createOptimalOrderPath(routePath, originOrderPath);
                    Logging.debug(`NotOptimal path ${nameRobotWillCall}: ` + originOrderPath.join(' -> '));
                    const firstEleOfArray = newSubTaskList.shift();
                    console.log('🚀 newSubTaskList without alogithm:', newSubTaskList);
                }
                //console.groupEnd();
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

                return nameRobotWillCall;
            } else {
                addTaskToQueueBackLog(job.data);
                throw new Error('All robots are busy');
            }
        } else if (totalVolume > maxCapacityEachRobot && totalVolume <= maxVolumeCarry) {
            try {
                //console.group('maxVolumeCarry > totalVolume > maxCapacityEachRobot');
                // one depots
                // const routePath = utilsFunction.createRoutePath(orginSubTaskList, queueRobotsFree[robotFreeNumber - 1]);
                // console.log('🚀 ~ file: worker.mainQueue.js:158 ~ routePath:', routePath);
                // const tspDistanceMatrix = utilsFunction.createTSPMatrix(routePath, queueRobotsFree[robotFreeNumber - 1]);
                // console.log('🚀 ~ file: worker.mainQueue.js:167 ~ tspDistanceMatrix:', tspDistanceMatrix);

                const routePath = utilsFunction.createRoutePathForMultiDepot(orginSubTaskList, queueRobotsFree);
                console.log('🚀 ~ file: worker.mainQueue.js:158 ~ routePath:', routePath);
                const tspDistanceMatrix = utilsFunction.createTSPMatrixForMultiDepot(routePath);

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
                const demanLoads = routePath.map((item, index) => {
                    return item.cargoVolume;
                });
                const postitionDepotList = queueRobotsFree.map((item, index) => {
                    return index;
                });
                console.log('🚀 ~ file: worker.mainQueue.js:179 ~ postitionDepotList:', postitionDepotList);
                const data = {
                    distanceMatrix: tspDistanceMatrix,
                    demands: demanLoads,
                    vehicleCapacities: new Array(robotFreeNumber).fill(maxCapacityEachRobot),
                    vehicleNumber: robotFreeNumber,
                    startPoints: postitionDepotList,
                    endPoints: postitionDepotList,
                    depot: 0,
                    multiDepots: true
                };
                const response = await fetch('http://localhost:8080/vehicleCapacity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                console.log('🚀 ~ file: worker.mainQueue.js:188 ~ result:', result);
                //console.groupEnd();
                if (!result.error) {
                    const robotArray = [];
                    const createNewMultiJob = {};

                    Object.keys(result.vehicleLoads).forEach((key) => {
                        const indexArray = key - 1;
                        const nameRobot = queueRobotsFree[indexArray];
                        console.log('🚀 ~ file: worker.mainQueue.js:196 ~ Object.keys ~ nameRobot:', nameRobot);
                        if (result.vehicleLoads[key] !== 0 && !createNewMultiJob.hasOwnProperty(nameRobot)) {
                            robotArray.push(+key);
                            createNewMultiJob[nameRobot] = {};
                            createNewMultiJob[nameRobot]['subTaskList'] = [];
                            const length = result.vehicleRoutes[key].length;
                            result.vehicleRoutes[key].forEach((destinationInfo, index) => {
                                if (index !== 0 && index !== length - 1) {
                                    createNewMultiJob[nameRobot]['subTaskList'].push(routePath[destinationInfo.destination]);
                                }
                            });
                            if (job.data.autoGoHome) {
                                // createNewMultiJob[nameRobot]['subTaskList'].push(routePath[+key - 1]);
                                // createNewMultiJob[nameRobot]['subTaskList'].push(routePath[0]);
                                createNewMultiJob[nameRobot]['subTaskList'].push({ targetName: robotConfigs[nameRobot].initPoint, cargoVolume: 0, isDone: false });
                            }
                            createNewMultiJob[nameRobot]['taskId'] = taskId;
                            createNewMultiJob[nameRobot]['nameRobotWillCall'] = nameRobot;
                            console.log('🚀 ~ file: worker.mainQueue.js:223 ~', createNewMultiJob[nameRobot]['subTaskList']);
                        }
                    });
                    Task.setRobots(taskId, robotArray);
                    // console.log('🚀 ~ createNewJob:', createNewMultiJob);

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
                    throw new Error(500);
                }
            } catch (error) {
                console.log('🚀totalVolume > maxCapacityEachRobot ~ error:', error.message);
                throw new Error(500);
            }
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
myWorker.on('failed', async (job, err) => {
    //console.log('🚀 ~ file: worker.mainQueue.js:283 ~ myWorker.on ~ job:', job.data);
    let messageErr = '';
    if (err.message === '500') {
        messageErr = 'Can not find solution, cancel taskId ' + job.data.taskId;
        await Task.updateFields(job.data.taskId, new Date(), `CANCEL`, 'CAN NOT FOUNT SOLUTION');
    } else {
        messageErr = err.message + ` Job ${job.data.taskId} will be moved to backlog`;
    }

    socketIo.emit('WorkerNotify', {
        type: 'AssignTask',
        success: false,
        retry: job.attemptsMade,
        message: messageErr
    });
    Logging.warning(`Main worker, Job ${job.data.taskId}: ${messageErr}`);

    // if (job.attemptsMade < 3) {
    //     // Retry lại job sau 5, 10 và 15 giây (tăng dần theo cấp số nhân)
    //     job.backoff('exponential', { delay: 5000 * job.attemptsMade });
    // }
});
myWorker.on('error', (err) => {
    // log the error
    console.error(err);
});
