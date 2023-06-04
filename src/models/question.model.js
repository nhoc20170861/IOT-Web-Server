module.exports = (sequelize, Sequelize) => {
    const Question = sequelize.define('questions', {
        title: {
            type: Sequelize.STRING,
        },
        optionA: {
            type: Sequelize.STRING,
        },
        optionB: {
            type: Sequelize.STRING,
        },
        optionC: {
            type: Sequelize.STRING,
        },
        correctOption: {
            type: Sequelize.STRING,
        },
        Manychoice: {
            type: Sequelize.INTEGER,
        },
    });

    return Question;
};
