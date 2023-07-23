module.exports = (sequelize, Sequelize) => {
    // Model Task
    const Task = sequelize.define('Task', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        taskName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        taskDescription: {
            type: Sequelize.STRING,
            allowNull: true
        },
        pathOptimization: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        robotId: {
            type: Sequelize.INTEGER
            // allowNull: false
        },
        statusTask: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'INITIALIZE'
        },
        startTime: {
            type: Sequelize.DATE,
            allowNull: false
        },
        finishTime: {
            type: Sequelize.DATE,
            allowNull: true
        }
    });
    // Phương thức cập nhật trạng thái statusTask và finsihTime của nhiệm vụ
    Task.updateFields = async function (taskId, finishTime, statusTask) {
        try {
            // Tìm nhiệm vụ có id tương ứng
            const task = await Task.findByPk(taskId);

            if (!task) {
                throw new Error('Task not found');
            }

            // Cập nhật các trường trong đối tượng fieldsToUpdate
            task['finishTime'] = finishTime;
            task['statusTask'] = statusTask;

            await task.save();

            return true; // hoặc giá trị phù hợp tùy vào yêu cầu
        } catch (error) {
            console.error('Error updating task:', error);
            return false; // hoặc giá trị phù hợp tùy vào yêu cầu
        }
    };

    // Model Subtask
    const SubTask = sequelize.define('Subtask', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        taskId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cargo: {
            type: Sequelize.STRING,
            allowNull: false
        },
        targetName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        isDone: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    });

    // Cập nhật trường status của tất cả các bản ghi có cùng taskId
    SubTask.updateSubtasksStatusByTaskId = async function (taskId, newStatus) {
        try {
            const [updatedCount, updatedSubtasks] = await SubTask.update({ isDone: newStatus }, { where: { taskId } });

            console.log(`${updatedCount} subtasks updated successfully`);
        } catch (err) {
            console.error('Error updating subtasks:', err);
        }
    };

    return { Task, SubTask };
};
