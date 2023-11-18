// utils function

import Logging from '../../library/Logging';
const colorize = (...args) => ({
    black: `\x1b[30m${args.join(' ')}`,
    red: `\x1b[31m${args.join(' ')}`,
    green: `\x1b[32m${args.join(' ')}`,
    yellow: `\x1b[33m${args.join(' ')}`,
    blue: `\x1b[34m${args.join(' ')}`,
    magenta: `\x1b[35m${args.join(' ')}`,
    cyan: `\x1b[36m${args.join(' ')}`,
    white: `\x1b[37m${args.join(' ')}`,
    bgBlack: `\x1b[40m${args.join(' ')}\x1b[0m`,
    bgRed: `\x1b[41m${args.join(' ')}\x1b[0m`,
    bgGreen: `\x1b[42m${args.join(' ')}\x1b[0m`,
    bgYellow: `\x1b[43m${args.join(' ')}\x1b[0m`,
    bgBlue: `\x1b[44m${args.join(' ')}\x1b[0m`,
    bgMagenta: `\x1b[45m${args.join(' ')}\x1b[0m`,
    bgCyan: `\x1b[46m${args.join(' ')}\x1b[0m`,
    bgWhite: `\x1b[47m${args.join(' ')}\x1b[0m`
});
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
        subTaskList: [],
        totalVolume: 0
    };
    // console.log('🚀 ~ file: utils.function.js:24 ~ mergeTask ~ mergedTask:', mergedTask);
    const mergedTargetMap = new Map();
    taskArray.forEach((task) => {
        // console.log(task)
        task.subTaskList.forEach((subTask, index) => {
            mergedTask.totalVolume += subTask.cargoVolume;
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
    // console.log('🚀 ~ file: utils.function.js:90 ~ createRoutePath ~ newSubTaskList:', newSubTaskList);
    return newSubTaskList;
}

function createRoutePathForMultiDepot(previousSubTaskList, robotIdArray) {
    let newSubTaskList = JSON.parse(JSON.stringify(previousSubTaskList));
    for (let i = robotIdArray.length - 1; i >= 0; i--) {
        const robotId = robotIdArray[i];
        if (robotConfigs[robotId].currentGoal === robotConfigs[robotId].initPoint) {
            // Robot chua nhan nhiem vu dang o vi tri home hoac da thuc hien nhiem vu xong va tro ve home
            newSubTaskList.unshift({ targetName: robotConfigs[robotId].initPoint, cargoVolume: 0, isDone: false });
        } else {
            newSubTaskList.unshift({ targetName: robotConfigs[robotId].currentGoal, cargoVolume: 0, isDone: false });
        }
    }
    // console.log(GoalPoseArray);

    // console.log('🚀 ~ file: utils.function.js:90 ~ createRoutePath ~ newSubTaskList:', newSubTaskList);
    return newSubTaskList;
}

function createTSPMatrixForMultiDepot(goalTargetList, key) {
    const n = goalTargetList.length;
    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    const checkCurrent = 'currentPose_' + key;

    for (let i = 0; i < n; i++) {
        let firstPoint = GoalPoseArray[goalTargetList[i].targetName].position;
        for (let j = 0; j < n; j++) {
            const secondPoint = GoalPoseArray[goalTargetList[j].targetName].position;
            tspMatrix[i][j] = calculateDistance(firstPoint, secondPoint);
        }
    }
    return tspMatrix;
}
function createTSPMatrix(goalTargetList, key) {
    const n = goalTargetList.length;
    const tspMatrix = Array.from({ length: n }, () => Array(n).fill(0.0));
    const checkCurrent = 'currentPose_' + key;

    for (let i = 0; i < n; i++) {
        let firstPoint = goalTargetList[i].targetName !== checkCurrent ? GoalPoseArray[goalTargetList[i].targetName].position : currentPose[key].position;
        for (let j = 0; j < n; j++) {
            const secondPoint = goalTargetList[j].targetName !== checkCurrent ? GoalPoseArray[goalTargetList[j].targetName].position : currentPose[key].position;
            tspMatrix[i][j] = calculateDistance(firstPoint, secondPoint);
        }
    }
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
    // return Math.round(Math.sqrt(dx * dx + dy * dy));
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

// nCar algorithm

function tspGreedyAlgorithmNcar(T, dataCVRP) {
    const length_T = T.length;
    const tspDistanceMatrix = Array.from({ length: length_T }, () => Array(length_T).fill(0));
    for (let i = 0; i < length_T; i++) {
        for (let j = 0; j < length_T; j++) {
            if (j != i) tspDistanceMatrix[i][j] = dataCVRP.distanceMatrix[T[i]][T[j]];
        }
    }
    // console.log("tspGreedyAlgorithm begin");
    const n = tspDistanceMatrix.length;
    let totalDistance = 0;
    const visited = new Array(n).fill(false);
    const path = [];
    let currentNode = 0;
    // Start from node 0
    path.push(T[currentNode]);
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
            path.push(T[nextNode]);
            visited[nextNode] = true;
            currentNode = nextNode;
            totalDistance += minDistance;
        }
    }
    // return start point
    const lastNodeInTour = path[path.length - 1];
    totalDistance += data.distanceMatrix[lastNodeInTour][0];
    path.push(T[0]);

    return { path, totalDistance };
}

function findNearestNeighbor(currentNode, N_T_rest, prevDemends, C, dataCVRP) {
    // console.log(
    //   "🚀 ~ file: CVRP.js:80 ~ restrictedNearestNeighbor ~ prevDemends:",
    //   prevDemends
    // );
    let output = 0;
    let minDistance = Infinity;
    const N_T_lentgh = N_T_rest.length;
    if (N_T_lentgh > 0) {
        for (let i = 1; i < N_T_lentgh; i++) {
            const nextNode = N_T_rest[i];
            const currentDemand = prevDemends + dataCVRP.demands[nextNode];
            if (minDistance > dataCVRP.distanceMatrix[currentNode][nextNode] && currentDemand <= C) {
                minDistance = dataCVRP.distanceMatrix[currentNode][nextNode];
                output = nextNode;
            }
        }
    }
    // console.log(
    //   "🚀 ~ file: CVRP.js:90 ~ restrictedNearestNeighbor ~ output:",
    //   output
    // );
    return output;
}

function optimalRouteForOneVehicle(N, C, dataCVRP) {
    let p_cost_min = Infinity;

    let T_min = [];
    let T_min_ = [];
    let demand_T = 0;
    let prevNode = 0;
    let pathOptimal = [];
    let totalCost = 0;
    for (i = 1; i < N.length; i++) {
        console.group(colorize(`cluster ${i}`).red);
        let N_T = [0];
        let N_T_rest = [...N];
        prevNode = N[i];
        N_T.push(prevNode);
        // console.log("origin N: ", N);
        // console.log("🚀 ~ file: CVRP.js:103 ~ optimalRouteForOneVehicle ~ N_T:", N_T);

        const index = N_T_rest.indexOf(prevNode);
        if (index > -1) {
            // only splice array when item is found
            N_T_rest.splice(index, 1); // 2nd parameter means remove one item only
        }
        // console.log("🚀 ~ file: CVRP.js:107 ~r ~ N_T_rest:", N_T_rest);

        demand_T = dataCVRP.demands[prevNode];

        while (demand_T <= C) {
            // console.log(
            //   "====================================================================================="
            // );
            const nextNode = findNearestNeighbor(prevNode, N_T_rest, demand_T, C);
            if (nextNode == 0) {
                break;
            }
            demand_T += dataCVRP.demands[nextNode];
            N_T.push(nextNode);
            // console.log("🚀 ~ file: CVRP.js:132 ~ feasibleRoute ~ N_T:", N_T);

            const index = N_T_rest.indexOf(nextNode);
            if (index > -1) {
                // only splice array when item is found
                N_T_rest.splice(index, 1); // 2nd parameter means remove one item only
            }
            prevNode = nextNode;
            // console.log(
            //   "🚀 ~ file: CVRP.js:134 ~ feasibleRoute ~ N_T_rest:",
            //   N_T_rest
            // );
        }
        const { path, totalDistance } = tspGreedyAlgorithmNcar(N_T_rest, dataCVRP);

        const p = totalDistance;
        // console.log("🚀 ~ eulerCycle: N_T", p_N_T);
        // console.log("🚀 ~ eulerCycle: N_T_rest", p_N_T_t);
        console.groupEnd();
        if (p < p_cost_min) {
            p_cost_min = p;
            T_min = N_T;
            T_min_ = N_T_rest;
            pathOptimal = path;
            totalCost = totalDistance;
        }
    }
    return { T_min, T_min_, demand_T, pathOptimal, totalCost };
}
function nCar(V, C, dataCVRP) {
    let N = V;
    let vehicle_count = 0;
    let cost_total = 0;
    let R_list = {};
    let vehicleLoads = {};
    let vehicleTravelDistances = {};
    while (N.length > 1) {
        let { T_min: T, T_min_: T_, demand_T, pathOptimal, totalCost } = optimalRouteForOneVehicle(N, C, dataCVRP);
        // console.log("🚀 ~ file: CVRP.js:189 ~ nCar ~ T:", T);
        R_list[vehicle_count + 1] = pathOptimal;
        vehicleLoads[vehicle_count + 1] = demand_T;
        vehicleTravelDistances[vehicle_count + 1] = totalCost;
        // console.log("🚀 ~ file: CVRP.js:242 ~ nCar ~ R_list:", R_list);
        vehicle_count += 1;
        cost_total += totalCost;
        N = T_;
    }
    if (Object.keys(R_list).length > 0) {
        return {
            routes: R_list,
            vehicles: vehicle_count,
            totalCost: cost_total,
            vehicleLoads: vehicleLoads,
            vehicleTravelDistances
        };
    } else {
        return 'can not find optimal';
    }
}

const utilsFunction = {
    nCar,
    tspDynamicProgramming,
    tspGreedyAlgorithm,
    createRoutePathForMultiDepot,
    createTSPMatrixForMultiDepot,
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
