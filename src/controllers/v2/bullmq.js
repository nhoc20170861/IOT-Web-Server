import { Queue } from 'bullmq';
import Logging from '../../library/Logging';

// initialize queueRobots
const queueRobots = {};
for (let i = 1; i <= 3; i++) {
    queueRobots[`mir${i}`] = new Queue(`mir${i}`, {
        connection: {
            host: 'localhost',
            port: 6379
        }
    });
}

const mainQueue = new Queue('taskQueue', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});

const queueEsp = new Queue('taskQueueEsp', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});
const queueBacklog = new Queue('queueBacklog', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});
const addTaskToQueue = async function (data) {
    const { taskId } = data;
    const job = await mainQueue.add(`task_${taskId}`, data, {
        attempts: 0,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        delay: 5000
    });
    // Get the size of the mainQueue
    const sizeQueue = await mainQueue.count();
    Logging.info(`Size of the mainQueue: ${sizeQueue}`);

    return job;
};
const addTaskToQueueEsp = async function (data) {
    const { taskId } = data;
    const jobEsp = await queueEsp.add(`task_${taskId}`, data, {
        attempts: 6,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        delay: 3000
    });
    return jobEsp;
};

const addTaskToQueueBackLog = async function (data) {
    const { taskId } = data;
    const job = await queueBacklog.add(`queueBacklog_${taskId}`, data, {
        delay: 5000
    });
    // Get the size of the mainQueue
    const sizeQueue = await queueBacklog.count();
    Logging.info(`Size of the queueBacklog: ${sizeQueue}`);
    return job;
};

export { queueRobots, queueBacklog, mainQueue, queueEsp, addTaskToQueue, addTaskToQueueEsp, addTaskToQueueBackLog };
