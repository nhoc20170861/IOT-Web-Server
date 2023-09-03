// utils function

import Logging from '../../library/Logging';

// calculate total volume of task
function calculateVolume(previousSubTaskList) {
    let totalVolume = 0;
    previousSubTaskList.forEach((item) => {
        totalVolume += item.cargoVolume;
    });
    return totalVolume;
}
// merge task
function mergeTask(taskArray) {
    const mergedTask = {
        taskName: 'Merged_Task',
        taskDescription: 'merged_task',
        pathOptimization: true,
        autoGoHome: true,
        taskId: taskArray[0].taskId,
        subTaskList: []
    };
    const mergedTargetMap = new Map();
    taskArray.forEach((task) => {
        // console.log(task)
        task.subTaskList.forEach((subTask, index) => {
            const targetName = subTask.targetName;
            if (mergedTargetMap.has(targetName)) {
                // Nếu targetName đã tồn tại, cộng thêm giá trị cargoVolume
                const existingSubTask = mergedTargetMap.get(targetName);
                existingSubTask.cargoVolume += subTask.cargoVolume;
            } else {
                // Nếu targetName chưa tồn tại, thêm subTask mới vào Map
                mergedTargetMap.set(targetName, { ...subTask });
            }
        });
    });
    const mergedTargetPoints = [...mergedTargetMap.values()];

    mergedTask.subTaskList = mergedTargetPoints;
    return mergedTask;
}

function calculateTaskPath(data) {
    let orderPath = data.subTaskList;
    const nameRobotWillCall = data.nameRobotWillCall;
    if (data.pathOptimization) {
        const routePath = createRoutePath(orderPath, nameRobotWillCall);
        const tspMatrix = createTSPMatrix(routePath, nameRobotWillCall);

        const optimalRoutePath = findOptimalPath(tspMatrix);

        console.log('Đường đi tối ưu: ' + optimalRoutePath.join(' -> '));
        const optimalOrder = createOptimalPath(routePath, optimalRoutePath);

        const firstEleOfArray = optimalOrder.shift();
        // if (robotConfigs[nameRobotWillCall].currentGoal !== robotConfigs[nameRobotWillCall].initPoint) {
        //     Logging.warning(`current pose ${robotConfigs[nameRobotWillCall].currentGoal} is different from init pose`);
        // } else {
        //     optimalOrder.push(firstEleOfArray);
        // }

        console.log('TargetPointList optimal', optimalOrder);
        const previousTaskQueue = robotConfigs[nameRobotWillCall].taskQueue;
        robotConfigs[nameRobotWillCall].taskQueue = [...previousTaskQueue, ...optimalOrder];
        orderPath = optimalOrder;
        console.log('🚀new GoalPoseList after optimal:', optimalOrder);
    } else {
    }

    if (data.autoGoHome) {
        orderPath.push({ targetName: robotConfigs[nameRobotWillCall].initPoint, cargoVolume: 0, isDone: false });
    }

    console.log('🚀  robot will follow path', orderPath);
    return orderPath;
}
// Create TSP Matrix
function createRoutePath(previousSubTaskList, robotId) {
    let newSubTaskList = JSON.parse(JSON.stringify(previousSubTaskList));
    if (robotConfigs.hasOwnProperty(robotId)) {
        if (robotConfigs[robotId].currentGoal === robotConfigs[robotId].initPoint) {
            // Robot chua nhan nhiem vu dang o vi tri home hoac da thuc hien nhiem vu xong va tro ve home
            newSubTaskList.unshift({ targetName: robotConfigs[robotId].initPoint, cargoVolume: 0, isDone: false });
        } else {
            newSubTaskList.unshift({ targetName: robotConfigs[robotId].currentGoal, cargoVolume: 0, isDone: false });
        }
    }
    return newSubTaskList;
}
function createTSPMatrix(goalTargetList, key) {
    const n = goalTargetList.length;

    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    const checkCurrent = 'currentPose_' + key;
    for (let i = 0; i < n; i++) {
        let firstPoint = goalTargetList[i].targetName !== checkCurrent ? GoalPoseArray[goalTargetList[i].targetName].position : currentPose[key].position;
        // console.log('🚀 ~ file: utils.function.js:59 ~ createTSPMatrix ~ firstPoint:', firstPoint);
        // if ((i = 0 && robotConfigs[robotId].currentGoal !== robotConfigs[robotId].initPoint))
        // firstPoint = currentPose[robotId];
        for (let j = 0; j < n; j++) {
            const secondPoint = goalTargetList[j].targetName !== checkCurrent ? GoalPoseArray[goalTargetList[j].targetName].position : currentPose[key].position;
            // console.log('🚀 ~ file: utils.function.js:64 ~ createTSPMatrix ~ secondPoint:', secondPoint);
            tspMatrix[i][j] = calculateDistance(firstPoint, secondPoint);
        }
    }

    console.log(`🚀 ~ ${key} ~ createTSPMatrix`, tspMatrix);
    return tspMatrix;
}
// calculate optimal path based on Greedy ALgorithms
function findOptimalPath(tspMatrix) {
    const n = tspMatrix.length;
    const visited = new Array(n).fill(false);
    const path = [];
    let currentNode = 0;
    // Start from node 0
    path.push(currentNode);
    visited[currentNode] = true;

    while (path.length < n) {
        let minDistance = Infinity;
        let nextNode = -1;

        for (let i = 0; i < n; i++) {
            if (!visited[i] && tspMatrix[currentNode][i] < minDistance) {
                minDistance = tspMatrix[currentNode][i];
                nextNode = i;
            }
        }
        if (nextNode !== -1) {
            path.push(nextNode);
            visited[nextNode] = true;
            currentNode = nextNode;
        }
    }
    path.push(0);

    return path;
}

function createOptimalOrderPath(originalArray, optimalPath) {
    const optimalOrder = [];
    for (const index of optimalPath) {
        optimalOrder.push(originalArray[index]);
    }
    return optimalOrder;
}

// calculate distance between two point
function calculateDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.round((Math.sqrt(dx * dx + dy * dy) + Number.EPSILON) * 100);
}
// Tính tổng quãng đường của một chu trình
function calculateTotalDistance(tspMatrix, optimalPath) {
    let totalDistance = 0;

    for (let i = 0; i < optimalPath.length - 1; i++) {
        const currentNode = optimalPath[i];
        const nextNode = optimalPath[i + 1];
        totalDistance += tspMatrix[currentNode][nextNode];
    }
    return totalDistance;
}

function waitforme(millisec) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('');
        }, millisec);
    });
}

function tspGreedyAlgorithm(tspDistanceMatrix) {
    Logging.info('tspGreedyAlgorithm begin');
    const n = tspDistanceMatrix.length;
    let totalDistance = 0;
    const visited = new Array(n).fill(false);
    const path = [];
    let currentNode = 0;
    // Start from node 0
    path.push(currentNode);
    visited[currentNode] = true;

    while (path.length < n) {
        let minDistance = Infinity;
        let nextNode = -1;

        for (let i = 0; i < n; i++) {
            if (!visited[i] && tspDistanceMatrix[currentNode][i] < minDistance) {
                minDistance = tspDistanceMatrix[currentNode][i];
                nextNode = i;
            }
        }
        if (nextNode !== -1) {
            path.push(nextNode);
            visited[nextNode] = true;
            currentNode = nextNode;
            totalDistance += minDistance;
        }
    }
    // return start point
    totalDistance += tspDistanceMatrix[path[path.length - 1]][path[0]];
    path.push(0);

    return { totalDistance, path };
}

function tspDynamicProgramming(tspDistanceMatrix) {
    Logging.info('tspDynamicProgramming begin');
    const n = tspDistanceMatrix.length;
    const dp = new Array(1 << n).fill(null).map(() => new Array(n).fill(null));
    function solve(mask, pos) {
        if (mask === (1 << n) - 1) {
            return {
                totalDistance: tspDistanceMatrix[pos][0], // Return to starting point
                path: [pos, 0] // Path includes starting point
            };
        }

        if (dp[mask][pos] !== null) {
            return dp[mask][pos];
        }

        let minDistance = Infinity;
        let minPath = [];

        for (let next = 0; next < n; next++) {
            if ((mask & (1 << next)) === 0) {
                const subproblem = solve(mask | (1 << next), next);
                const newDistance = tspDistanceMatrix[pos][next] + subproblem.totalDistance;

                if (newDistance < minDistance) {
                    minDistance = newDistance;
                    minPath = [pos, ...subproblem.path];
                }
            }
        }

        dp[mask][pos] = { totalDistance: minDistance, path: minPath };
        return dp[mask][pos];
    }
    const { totalDistance, path } = solve(1, 0); // Start with mask = 1 (only the starting point is visited)
    return { totalDistance, path };
}

const utilsFunction = {
    tspDynamicProgramming,
    tspGreedyAlgorithm,
    mergeTask,
    calculateVolume,
    calculateDistance,
    calculateTaskPath,
    createTSPMatrix,
    findOptimalPath,
    createOptimalOrderPath,
    calculateTotalDistance,
    createRoutePath,
    waitforme
};

export default utilsFunction;
