import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { mainQueue, queueEsp, queueRobots, addTaskToQueue, addTaskToQueueEsp } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;
// calculate poseArray and send to robot
async function calculatePoseArrayAndSend(orderPath, nameRobotWillCall) {
    let poseArray = [];
    poseArray = orderPath.map((task, index) => {
        return {
            ...GoalPoseArray[task.targetName]
        };
    });

    let lastEle = poseArray.pop();
    poseArray.push(GoalPoseArray['point_8']); // thêm điểm trung gian
    poseArray.push(lastEle);

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
async function createWorkerRobots() {
    for (const key in queueRobots) {
        await queueRobots[key].resume();
        myWorkerRobots[key] = new Worker(
            key,
            async (job) => {
                try {
                    // console.group('queueRobots' + key);
                    console.log(`🚀 ~  ~ ${key}~ jobRobot:`, job.data);
                    const taskId = job.data.taskId;
                    const nameRobotWillCall = job.data.nameRobotWillCall; // cập nhập task và lưu vào cơ sở dữ liệu
                    statusOfAllRobots[nameRobotWillCall] = 'Get new task';
                    socketIo.emit('statusOfAllRobots', statusOfAllRobots);
                    robotConfigs[nameRobotWillCall].taskQueue[0].taskId = taskId;
                    // const task = await Task.findOne({
                    //     where: { id: job.data.taskId }
                    // });
                    // if (!task) {
                    //     console.log('Task not found');
                    //     throw new Error('Task not found');
                    // }
                    // task.robotId = robotConfigs[nameRobotWillCall].id;
                    // task.statusTask = 'START';
                    // task.startTime = new Date();
                    // await task.save();

                    for (const subTask of job.data.subTaskList) {
                        // console.log('🚀 ~ file: worker.queueRobots.js:61 ~ subTask:', subTask);
                        await SubTask.create({
                            taskId: taskId,
                            robotId: robotConfigs[nameRobotWillCall].id,
                            cargoVolume: subTask.cargoVolume,
                            targetName: subTask.targetName,
                            isDone: subTask.status
                        });
                    }
                    // console.log('🚀 ~  order path after alogithm:', key, job.data.subTaskList);
                    robotConfigs[nameRobotWillCall].taskQueue.push(...job.data.subTaskList);
                    socketIo.emit(`updateTaskQueue`, {
                        robotName: nameRobotWillCall,
                        taskQueueUpdate: robotConfigs[nameRobotWillCall]['taskQueue']
                    });
                    // console.log('🚀 ~ file: worker.queueRobots.js:58 ~ robotConfigs:', robotConfigs[job.data.nameRobotWillCall].taskQueue);
                    await calculatePoseArrayAndSend(job.data.subTaskList, nameRobotWillCall);
                    await Task.updateFields(taskId, new Date(), `BEGIN`, '', false);
                    //console.groupEnd();
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
            Logging.info(`${key}: Completed job with jobId ${job.data.taskId}, ${value}`);
        });

        myWorkerRobots[key].on('failed', (job, err) => {
            Logging.warning(`${key}: Job ${job.taskId} failed with error: ${err.message} and retry with ${job.attemptsMade}`);
        });
        myWorkerRobots[key].on('error', (err) => {
            // log the error
            console.error(err.message);
        });
    }
}
createWorkerRobots();

export default myWorkerRobots;
