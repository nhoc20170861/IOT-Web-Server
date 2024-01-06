import { Queue, Worker } from 'bullmq';
import Logging from '../../library/Logging';
import { removeQueueRobot } from './worker.queueRobots';
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
    const robotId = data.robotId;
    console.log('🚀 ~ file: bullmq.js:66 ~ addtaskToQueueMessage ~ data:', data);
    const job = await queueMessage.add(`${robotId}_${Math.random(0, 1)}`, data, {
        attempts: 0,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        delay: 5000
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
        const { robotId, messageType } = job.data;
        if (messageType === '1') {
            const serviceClient = new ROSLIB.Service({
                ros: robotConfigs[robotId].rosWebsocket,
                name: `/${robotId}/move_base_sequence/activeGoalAgain`,
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
                        const msg = error.message || 'Call service fail';
                        console.log(': bullmq.js:108 ~ msg:', msg);
                    }
                );
            } catch (error) {
                throw new Error('Error Active Goal Again');
            }
        } else {
            try {
                if (robotConfigs.hasOwnProperty(robotId)) {
                    robotConfigs[robotId] = null;
                    delete robotConfigs[robotId];
                }
                if (queueRobots.hasOwnProperty(robotId)) removeQueueRobot(robotId);
            } catch (error) {
                console.log('robotController ~ .then ~ error:', error.message);
            }
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
    Logging.info(`myWorkerQueueMessage: Completed job with jobId ${job.id} with ${job.data.robotId}`);
});

myWorkerQueueMessage.on('failed', (job, err) => {
    Logging.warning(`myWorkerQueueMessage: Job ${job.id} failided with error: ${err.message} and retry with ${job.attemptsMade}`);
});
myWorkerQueueMessage.on('error', (err) => {
    // log the error
    console.error(err.message);
});
export { queueBacklog, mainQueue, queueEsp, queueMessage, addTaskToQueue, addTaskToQueueEsp, addTaskToQueueBackLog, addtaskToQueueMessage };
