import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { addTaskToQueueBackLog } from './bullmq';
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

        console.log('🚀 ~ file: worker.mainQueue.js:25 ~ queueRobots:', Object.keys(queueRobots));
        for (const key in queueRobots) {
            // console.log(key);
            const checkQueue = await queueRobots[key].isPaused();
            //if (!checkkQueue && robotConfigs[key].isConnected) {
            if (!checkQueue) {
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
                // one depots
                const routePath = utilsFunction.createRoutePath(orginSubTaskList, queueRobotsFree[robotFreeNumber - 1]);
                const tspDistanceMatrix = utilsFunction.createTSPMatrix(routePath, queueRobotsFree[robotFreeNumber - 1]);

                // multi depots
                // const routePath = utilsFunction.createRoutePathForMultiDepot(orginSubTaskList, queueRobotsFree);
                // const tspDistanceMatrix = utilsFunction.createTSPMatrixForMultiDepot(routePath);

                // console.log('🚀 ~ file: worker.mainQueue.js:158 ~ routePath:', routePath);
                // console.log('🚀 ~ file: worker.mainQueue.js:167 ~ tspDistanceMatrix:', tspDistanceMatrix);
                const demanLoads = routePath.map((item, index) => {
                    return item.cargoVolume;
                });
                const data = {
                    distanceMatrix: tspDistanceMatrix,
                    demands: demanLoads,
                    vehicleCapacities: new Array(robotFreeNumber).fill(maxCapacityEachRobot),
                    vehicleNumber: robotFreeNumber,
                    depot: 0,
                    multiDepots: false
                };
                /**
                 * @desc data example for testing
                 */
                // const data = {
                //     distanceMatrix: [
                //         [0, 393, 557, 515, 418, 196, 378, 139, 242, 139, 463, 378, 279, 266, 331, 557, 468],
                //         [393, 0, 684, 242, 139, 378, 592, 266, 515, 526, 792, 493, 480, 571, 722, 679, 857],
                //         [557, 684, 0, 916, 802, 378, 196, 618, 331, 526, 400, 931, 836, 799, 605, 1114, 650],
                //         [515, 242, 916, 0, 114, 576, 802, 378, 702, 654, 967, 416, 460, 589, 836, 560, 975],
                //         [418, 139, 802, 114, 0, 463, 689, 279, 592, 557, 860, 400, 416, 531, 745, 571, 884],
                //         [196, 378, 378, 576, 463, 0, 228, 242, 139, 240, 418, 557, 468, 460, 416, 745, 531],
                //         [378, 592, 196, 802, 689, 228, 0, 463, 139, 331, 266, 755, 654, 607, 416, 931, 480],
                //         [139, 266, 618, 378, 279, 242, 463, 0, 342, 279, 592, 331, 266, 320, 468, 526, 607],
                //         [242, 515, 331, 702, 592, 139, 139, 342, 0, 196, 279, 618, 515, 468, 320, 792, 416],
                //         [139, 526, 526, 654, 557, 240, 331, 279, 196, 0, 342, 463, 351, 279, 196, 618, 331],
                //         [463, 792, 400, 967, 860, 418, 266, 592, 279, 342, 0, 802, 689, 592, 279, 943, 266],
                //         [378, 493, 931, 416, 400, 557, 755, 331, 618, 463, 802, 0, 114, 242, 576, 196, 702],
                //         [279, 480, 836, 460, 416, 468, 654, 266, 515, 351, 689, 114, 0, 139, 463, 279, 592],
                //         [266, 571, 799, 589, 531, 460, 607, 320, 468, 279, 592, 242, 139, 0, 342, 351, 463],
                //         [331, 722, 605, 836, 745, 416, 416, 468, 320, 196, 279, 576, 463, 342, 0, 689, 139],
                //         [557, 679, 1114, 560, 571, 745, 931, 526, 792, 618, 943, 196, 279, 351, 689, 0, 798],
                //         [468, 857, 650, 975, 884, 531, 480, 607, 416, 331, 266, 702, 592, 463, 139, 798, 0]
                //     ],
                //     demands: [0, 1, 1, 2, 4, 2, 4, 8, 8, 1, 2, 1, 2, 4, 4, 8, 8],
                //     vehicleCapacities: [15, 15, 15, 15],
                //     vehicleNumber: 4,
                //     depot: 0,
                //     multiDepots: false
                // };

                const originOrderPath = Array.from({ length: routePath.length }, (_, index) => index);
                console.log('🚀 ~ file: worker.mainQueue.js:149 ~ originOrderPath:', originOrderPath);

                const postitionDepotList = queueRobotsFree.map((item, index) => {
                    return index;
                });
                console.log('🚀 ~ file: worker.mainQueue.js:179 ~ postitionDepotList:', postitionDepotList);

                if (data.multiDepots == true) {
                    data.startPoints = postitionDepotList;
                    data.endPoints = postitionDepotList;
                }

                /**
                 *  Algorthm nCar
                 */
                // const result = utilsFunction.nCar(originOrderPath, maxCapacityEachRobot, data);

                /**
                 *  Google Or-tools API for JAVA
                 */
                const response = await fetch('http://localhost:8080/vehicleCapacity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                console.log('🚀result CVRP:', result);

                if (!result.error) {
                    const robotArray = [];
                    const createNewMultiJob = {};

                    Object.keys(result.vehicleLoads).forEach((key) => {
                        const indexArray = key - 1;
                        const nameRobot = queueRobotsFree[indexArray];
                        console.log('🚀 ~ nameRobot assigned:', nameRobot);
                        if (result.vehicleLoads[key] !== 0 && !createNewMultiJob.hasOwnProperty(nameRobot)) {
                            robotArray.push(+key);
                            createNewMultiJob[nameRobot] = {};
                            createNewMultiJob[nameRobot]['subTaskList'] = [];
                            const length = result.vehicleRoutes[key].length;
                            result.vehicleRoutes[key].forEach((destinationInfo, index) => {
                                console.log('🚀 ~ file: worker.mainQueue.js:207 ~ result.vehicleRoutes[key].forEach ~ destinationInfo:', destinationInfo);
                                if (index !== 0 && index !== length - 1) {
                                    createNewMultiJob[nameRobot]['subTaskList'].push(routePath[destinationInfo.destination]);
                                }
                            });
                            if (job.data.autoGoHome) {
                                // multi depot with google or-tools
                                // createNewMultiJob[nameRobot]['subTaskList'].push(routePath[+key - 1]);

                                // algorithm nCar for one depot
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
