import { Queue, Worker } from 'bullmq';
import Logging from '../../library/Logging';

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

const addTaskToQueue = async function (data, delay = 5000, delayBackoff = 5000) {
    const { taskId } = data;
    const job = await mainQueue.add(`task_${taskId}`, data, {
        attempts: 0,
        backoff: {
            type: 'exponential',
            delay: delayBackoff
        },
        delay: delay
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

const addtaskToQueueMessage = async function (data) {
    const { robotId, activeGoalAgain, indexCurrentGoal } = data;
    const job = await queueMessage.add(`${indexCurrentGoal}_${robotId}_${Math.random(0, 1)}`, data, {
        attempts: 0,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        delay: 8000
    });
    return job;
};

// Handler trigger again detect obstacle feature
const queueMessage = new Queue('queueMessage', {
    connection: {
        host: 'localhost',
        port: 6379
    }
});
export const myWorkerQueueMessage = new Worker(
    'queueMessage',
    async (job) => {
        console.log(`wroker process job `, job.data);
        const robotKey = job.data.robotId;
        const serviceClient = new ROSLIB.Service({
            ros: robotConfigs[robotKey].rosWebsocket,
            name: `/${robotKey}/move_base_sequence/activeGoalAgain`,
            serviceType: 'move_base_sequence/activeGoalAgain'
        });

        const request = new ROSLIB.ServiceRequest({ activeGoalAgain: false });
        try {
            serviceClient.callService(
                request,
                function (result) {
                    console.log('Result for service call on ' + serviceClient.name + ': ' + JSON.stringify(result));
                    if (result.goalIndex == job.data.indexCurrentGoal) {
                        return result;
                    }
                },
                (error) => {
                    console.log('🚀 ~ file: bullmq.js:117 ~ error:', error.message);
                    throw new Error(error.message);
                }
            );
        } catch (error) {
            throw new Error('Error Active Goal Again');
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
myWorkerQueueMessage.on('completed', (job, value) => {
    Logging.info(`${job.data.robotId}: Completed job with jobId ${job.id}, ${JSON.stringify(value)}`);
});

myWorkerQueueMessage.on('failed', (job, err) => {
    Logging.warning(`${job.data.robotId}: Job ${job.id} failided with error: ${err.message} and retry with ${job.attemptsMade}`);
});
myWorkerQueueMessage.on('error', (err) => {
    // log the error
    console.error(err.message);
});
export { queueBacklog, mainQueue, queueEsp, queueMessage, addTaskToQueue, addTaskToQueueEsp, addTaskToQueueBackLog, addtaskToQueueMessage };
