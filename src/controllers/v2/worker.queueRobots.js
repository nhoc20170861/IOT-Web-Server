import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queue, queueEsp, queueRobots, addTaskToQueue, addTaskToQueueEsp } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;

// calculate poseArray and send to robot
function calculatePoseArrayAndSend(orderPath, nameRobotWillCall) {
    let poseArray = [];
    poseArray = orderPath.map((task, index) => {
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
}
const myWorkerRobots = {};
Object.keys(queueRobots).forEach((key) => {
    myWorkerRobots[key] = new Worker(
        key,
        async (job) => {
            try {
                console.log(`🚀 ~  ~ ${key}~ jobRobot:`, job.data);
                const nameRobotWillCall = job.data.nameRobotWillCall;
                // cập nhập task và lưu vào cơ sở dữ liệu
                const task = await Task.findOne({
                    where: { id: job.data.taskId }
                });
                if (!task) {
                    console.log('Task not found');
                    throw new Error('Task not found');
                }
                task.robotId = robotConfigs[nameRobotWillCall].id;
                task.status = 'START';
                task.startTime = new Date();
                await task.save();
                console.log('🚀 ~ file: worker.js:38 ~ task:', task.dataValues);
                console.log('🚀 ~  order path after alogithm:', key, job.data.subTaskList);

                // const orderPath = utilsFunction.calculateTaskPath(job.data);
                // console.log(`🚀 ~ ~ ${key}~ orderPath:`, orderPath);
                robotConfigs[nameRobotWillCall].taskQueue.push(...job.data.subTaskList);
                socketIo.emit(`updateTaskQueue`, {
                    robotName: nameRobotWillCall,
                    taskQueueUpdate: robotConfigs[nameRobotWillCall]['taskQueue']
                });
                // console.log('🚀 ~ file: worker.queueRobots.js:58 ~ robotConfigs:', robotConfigs[job.data.nameRobotWillCall].taskQueue);
                calculatePoseArrayAndSend(job.data.subTaskList, job.data.nameRobotWillCall);
                return 'success';
            } catch (error) {
                console.log(`🚀 ~ ~ ${key}~ error:`, error);
                return 'failure';
            }
        },
        {
            connection: {
                host: 'localhost',
                port: 6379
            },
            autorun: true
        }
    );
    myWorkerRobots[key].on('completed', (job, value) => {
        queueRobots[key].pause();
        Logging.info(`robot1: Completed job with jobId ${job.id}, ${value}`);
    });
    // Cấu hình retry cho job thất bại
    myWorkerRobots[key].on('failed', (job, err) => {
        Logging.warning(`robot1: Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
    });
    myWorkerRobots[key].on('error', (err) => {
        // log the error
        console.error(err);
    });
});
// worket for taskQueueRobot1

export const myWorkerRobot1 = new Worker(
    'taskQueueRobot_1',
    async (job) => {
        try {
            console.log('🚀 ~ file: worker.js:155 ~ myWorkerRobot1 ~ jobRobot:', job.data);
            const orderPath = utilsFunction.calculateTaskPath(job.data);
            console.log('🚀 ~ file: worker.queueRobots.js:16 ~ orderPath:', orderPath);
            calculatePoseArrayAndSend(orderPath, job.data.nameRobotWillCall);
            return 'success';
        } catch (error) {
            console.log('🚀 ~ file: worker.queueRobots.js:42 ~ error:', error);
            return 'failure';
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

myWorkerRobot1.on('completed', (job, value) => {
    Logging.info(`robot1: Completed job with jobId ${job.id}, ${value}`);
});
// Cấu hình retry cho job thất bại
myWorkerRobot1.on('failed', (job, err) => {
    Logging.warning(`robot1: Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
});
myWorkerRobot1.on('error', (err) => {
    // log the error
    console.error(err);
});

// worker for taskQueueRobot2
export const myWorkerRobot2 = new Worker(
    'taskQueueRobot_2',
    async (job) => {
        try {
            console.log('🚀 ~ myWorkerRobot2 ~ jobRobot:', job.data);
            const orderPath = utilsFunction.calculateTaskPath(job.data);
            console.log('🚀 ~ myWorkerRobot2 orderPath:', orderPath);
            calculatePoseArrayAndSend(orderPath, job.data.nameRobotWillCall);
            return 'success';
        } catch (error) {
            console.log('🚀  ~ error:', error);
            return 'failure';
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
myWorkerRobot2.on('completed', (job, value) => {
    Logging.info(`robot2: Completed job with jobId ${job.id}, ${value}`);
});
// Cấu hình retry cho job thất bại
myWorkerRobot2.on('failed', (job, err) => {
    Logging.warning(`robot2: Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
});
myWorkerRobot2.on('error', (err) => {
    // log the error
    console.error(err);
});
// worker for taskQueueRobot3
export const myWorkerRobot3 = new Worker(
    'taskQueueRobot_3',
    async (job) => {
        try {
            console.log('🚀 ~  myWorkerRobot3 ~ jobRobot:', job.data);
            const orderPath = utilsFunction.calculateTaskPath(job.data);
            console.log('🚀 ~  myWorkerRobot3 ~ orderPath:', orderPath);
            calculatePoseArrayAndSend(orderPath, job.data.nameRobotWillCall);
            return 'success';
        } catch (error) {
            console.log('🚀  error:', error);
            return 'failure';
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
myWorkerRobot3.on('completed', (job, value) => {
    Logging.info(`robot3: Completed job with jobId ${job.id}, ${value}`);
});
// Cấu hình retry cho job thất bại
myWorkerRobot3.on('failed', (job, err) => {
    Logging.warning(`robot3: Job ${job.id} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
});
myWorkerRobot3.on('error', (err) => {
    // log the error
    console.error(err);
});
