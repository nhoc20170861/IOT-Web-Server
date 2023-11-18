import { Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { queueRobots, mainQueue, addTaskToQueue, queueBacklog } from './bullmq';
import utilsFunction from './utils.function';
import { delay } from 'lodash';
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
    let totalVolume = jobs_to_process[0].data.totalVolume;
    let index_cut = 0;
    for (let i = 1; i < jobs_to_process.length; i++) {
        totalVolume += jobs_to_process[i].data.totalVolume;
        if (totalVolume <= queueRobotsFree.length * 100) {
            index_cut = i; // Next job can be merged
        } else {
            totalVolume -= jobs_to_process[i].data.totalVolume;
            break;
        }
    }

    Logging.info('🚀 active taskId: ' + actual_active_job.data.taskId + ' totalVolume: ' + totalVolume + ' index_cut: ' + index_cut);
    if (queueRobotsFree.length > 0 && queueRobotsFree.length * 100 >= totalVolume) {
        let actual_job_process = [];
        if (index_cut == 0) {
            actual_job_process.push(actual_active_job);
        } else {
            for (let i = 0; i < jobs_to_process.length; i++) {
                actual_job_process.push(jobs_to_process[i]);
                if (i > index_cut) {
                    break;
                }
            }
        }

        return { actual_job_process, delayedJob, totalVolume };
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
        const { actual_job_process, delayedJob, totalVolume } = await batch_jobs({
            job: job,
            batch_size: 5,
            max_timeout: 60 * 1000
        });
        //  console.log('🚀 ~ file: worker.queueBacklog.js:74 ~ actual_job_process:', actual_job_process);
        console.log('🚀  ~ totalVolume after batch:', totalVolume);

        console.log(`> Processing ${actual_job_process.length} jobs`);
        let datas = actual_job_process.map((x) => x.data);

        try {
            let returnJobToMainQueue = {};
            if (actual_job_process.length >= 2) {
                const mergedTask = utilsFunction.mergeTask(datas);
                console.log('🚀 ~ file: worker.queueBacklog.js:56 ~ getMergedTask:', mergedTask);
                await Task.updateFields(actual_job_process[0].data.taskId, new Date(), `CHANGE`, 'MERGE TASK');
                for (let i = 1; i < actual_job_process.length; i++) {
                    // cập nhập task và lưu vào cơ sở dữ liệu
                    await Task.updateFields(actual_job_process[i].data.taskId, new Date(), `MERGE to taskId ${mergedTask.taskId}`);
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
                    await actual_job_process[i].remove();
                }
                returnJobToMainQueue = { ...mergedTask, title: 'mergedTask' };
            } else {
                returnJobToMainQueue = actual_job_process[0].data;
            }
            const mergeJob = await addTaskToQueue(returnJobToMainQueue, 100);
            await utilsFunction.waitforme(5000);
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
