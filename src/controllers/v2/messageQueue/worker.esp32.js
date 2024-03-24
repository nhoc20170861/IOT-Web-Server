import { Worker } from 'bullmq';
import clientMqtt from '../../../configs';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../../models');
const Task = db.Task;
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
            console.log("🚀 mainQueue.process ~  'All robot are busy!");
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
