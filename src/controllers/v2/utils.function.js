// utils function
// calculate optimal path
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
function createRoutePath(orderPath, robotId) {
    let routePath = JSON.parse(JSON.stringify(orderPath));
    if (robotConfigs.hasOwnProperty(robotId)) {
        if (robotConfigs[robotId].currentGoal === robotConfigs[robotId].initPoint) {
            // Robot chua nhan nhiem vu dang o vi tri home
            routePath.unshift({ targetName: robotConfigs[robotId].initPoint, cargoVolume: 0, isDone: false });
        } else {
            routePath.unshift({ targetName: robotConfigs[robotId].currentGoal, cargoVolume: 0, isDone: false });
        }
    }
    return routePath;
}
function createTSPMatrix(goalTargetList) {
    const n = goalTargetList.length;

    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    for (let i = 0; i < n; i++) {
        let firstPoint = GoalPoseArray[goalTargetList[i].targetName].position;
        // if ((i = 0 && robotConfigs[robotId].currentGoal !== robotConfigs[robotId].initPoint))
        // firstPoint = currentPose[robotId];
        for (let j = 0; j < n; j++) {
            const secondPoint = GoalPoseArray[goalTargetList[j].targetName].position;
            tspMatrix[i][j] = calculateDistance(firstPoint, secondPoint);
        }
    }

    return tspMatrix;
}
function findOptimalPath(tspMatrix) {
    const n = tspMatrix.length;
    const path = [0]; // Bắt đầu từ điểm xuất phát (điểm 0)
    let currentNode = 0;

    while (path.length < n) {
        let minDistance = Infinity;
        let nextNode = -1;

        for (let i = 0; i < n; i++) {
            if (!path.includes(i) && tspMatrix[currentNode][i] < minDistance) {
                minDistance = tspMatrix[currentNode][i];
                nextNode = i;
            }
        }

        path.push(nextNode);
        currentNode = nextNode;
    }

    return path;
}

function createOptimalPath(originalArray, optimalPath) {
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
    return Math.sqrt(dx * dx + dy * dy);
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

const utilsFunction = {
    calculateTaskPath,
    createTSPMatrix,
    findOptimalPath,
    createOptimalPath,
    calculateTotalDistance,
    createRoutePath
};

export default utilsFunction;
