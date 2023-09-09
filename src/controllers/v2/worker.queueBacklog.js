import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, mainQueue, addTaskToQueue, queueBacklog } from './bullmq';
import utilsFunction from './utils.function';
// import module handle database
const db = require('../../models');
const Task = db.Task;
const SubTask = db.SubTask;

const batch_jobs = async ({
    job: actual_active_job,
    max_timeout,
    poll_time = 5 * 1000 // I default to checking every 5 seconds.. I know polling is mostly bad but eh
}) => {
    let delayedJob = await queueBacklog.getDelayed();
    // console.log('🚀 ~ file:  queueBacklog delayed:', delayedJob);
    let jobs_to_process = [actual_active_job, ...delayedJob];

    Logging.debug(`queueBacklog getDelayCount ${await queueBacklog.getDelayedCount()}`);
    let queueRobotsFree = [];
    for (const key in queueRobots) {
        const checkkQueue = await queueRobots[key].isPaused();
        // console.log('🚀 ~~ checkkQueue pause:', key, checkkQueue);
        if (!checkkQueue) {
            queueRobotsFree.push(key);
            // break;
        }
    }
    console.log('🚀 ~ queueRobotsFree:', queueRobotsFree);
    let totalVolume = 0;
    jobs_to_process.forEach((item) => {
        totalVolume += item.data.totalVolume;
    });
    Logging.info('🚀 current ~ totalVolume: ' + totalVolume);
    if (queueRobotsFree.length > 0 && queueRobotsFree.length * 100 >= totalVolume) {
        return { jobs_to_process, delayedJob, totalVolume };
    } else {
        await utilsFunction.waitforme(poll_time);
        return await batch_jobs({
            job: actual_active_job,
            max_timeout: poll_time
        });
    }
};

export const workerBacklog = new Worker(
    'queueBacklog',
    async (job) => {
        console.log(`queueBacklog process job `, job.data);
        let { jobs_to_process, delayedJob, totalVolume } = await batch_jobs({
            job: job,
            batch_size: 5,
            max_timeout: 60 * 1000
        });

        let datas = jobs_to_process.map((x) => x.data);
        console.log(`> Processing ${datas.length} jobs`);

        const mergedTask = utilsFunction.mergeTask(datas);
        try {
            console.log('🚀 ~ file: worker.queueBacklog.js:56 ~ getMergedTask:', mergedTask);

            if (jobs_to_process.length >= 2) {
                await Task.updateFields(jobs_to_process[0].data.taskId, new Date(), `CHANGE`, 'MERGE TASK');
                for (let i = 1; i < jobs_to_process.length; i++) {
                    console.log(jobs_to_process.length);
                    // cập nhập task và lưu vào cơ sở dữ liệu
                    await Task.updateFields(jobs_to_process[i].data.taskId, new Date(), `MERGE to taskId ${mergedTask.taskId}`);
                    // const taskRemove = await Task.findOne({
                    //     where: { id: delayedJob[i].data.taskId }
                    // });
                    // if (!taskRemove) {
                    //     console.log('Task not found');
                    //     throw new Error('Task not found');
                    // }
                    // taskRemove.statusTask = `MERGE to taskId ${mergedTask.taskId}`;
                    // taskRemove.endTime = new Date();
                    // await taskRemove.save();
                    await jobs_to_process[i].remove();
                }
            }
            const mergeJob = await addTaskToQueue({ ...mergedTask, title: 'mergedTask', totalVolume });
        } catch (error) {
            // console.log('🚀 ~ file: worker.queueBacklog.js:78 ~ error:', error.message);
            throw new Error(error.message);
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

workerBacklog.on('completed', (job, robotName) => {
    // console.log('🚀 ~ file: ros.controller.js:246 ~ myWorker.on ~ job:', job);
    Logging.info(`workerBacklog Completed job with jobId ${job.id}`);
});
// Cấu hình retry cho job thất bại
workerBacklog.on('failed', (job, err) => {
    Logging.warning(`workerBacklog Job ${job.id} failed with error: ${err.message}`);
});
workerBacklog.on('error', (err) => {
    // log the error
    console.error(err);
});
