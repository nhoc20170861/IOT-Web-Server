import { Queue } from 'bullmq';
import Logging from '../../library/Logging';

// initialize queueRobots
export const queueRobots = {};
for (let i = 1; i <= 3; i++) {
    queueRobots[`taskQueue_mir${i}`] = new Queue(`taskQueue_mir${i}`, {
        connection: {
            host: 'localhost',
            port: 6379
        }
    });
}

export const queue = new Queue('taskQueue', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});

export const queueEsp = new Queue('taskQueueEsp', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});

export const addTaskToQueue = async function (data) {
    const { taskId } = data;
    const job = await queue.add(`task_${taskId}`, data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        delay: 5000
    });
    // Get the size of the queue
    const sizeQueue = await queue.count();
    Logging.info(`Size of the queue: ${sizeQueue}`);

    return job;
};
export const addTaskToQueueEsp = async function (data) {
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
