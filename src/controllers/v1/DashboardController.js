const db = require('../../models');
const Question = db.question;
const DataSensor = db.data_sensor;
const Device = db.device;
const getWeatherData = require('../../service/openWeather');
class DashboardController {
    // [GET] /dashboard/data
    getDataDetail(req, res) {
        let device_current = parseInt(req.params.slug.slice(-1));
        return res.render(`dashboard/data_detail_device${device_current}`, {
            change_header: true,
            user_name: req.userName,
            device: 'device ' + device_current
        });
    }
    getDataSelect(req, res) {
        Device.findAll().then((devices) => {
            const list_devices = devices.map((device) => device.dataValues);
            //console.log(list_devices);

            res.render('dashboard/data_select_device', {
                change_header: true,
                user_name: req.userName,
                //slug: "device"+ list_devices.id
                list_devices
            });
        });
    }

    getProduct(req, res) {
        return res.render('dashboard/product', {
            change_header: true,
            user_name: req.userName
        });
    }
    // [GET] /dashboard/knowledge
    getKnowledge(req, res) {
        return res.render('dashboard/knowledge', {
            change_header: true,
            user_name: req.userName
        });
    }
    // [GET] /dashboard/controller
    getController(req, res) {
        return res.render('dashboard/controller', {
            change_header: true,
            user_name: req.userName
        });
    }
    // [GET] /dashboard/team
    getTeam(req, res) {
        return res.render('dashboard/team', {
            change_header: true,
            user_name: req.userName
        });
    }

    // [GET] /dashboard/robot
    getRobotGui(req, res) {
        return res.render('dashboard/robotgui', {
            change_header: true,
            user_name: req.userName
        });
    }

    // [GET] /dashboard/showquiz
    showQuiz(req, res) {
        if (!req.session.listAnswer) {
            req.session.listAnswer = {};
            req.session.result = {};
        }

        // Khởi tạo số trang
        var currentPage = parseInt(req.query.page) || 1;
        var maxPage;
        Question.findAll()
            .then((question) => {
                maxPage = question.length; // lưu tổng số câu hỏi vào biến maxPage

                // tạo một mảng lưu các thông tin câu hỏi
                const listQuestion = question.map(function (question) {
                    return question.dataValues;
                });
                const index = currentPage - 1;

                req.session.id_quest = question[index].id;
                const quiz = {
                    id_quest: question[index].id,
                    quest: question[index].title,
                    opA: 'A. ' + question[index].optionA,
                    opB: 'B. ' + question[index].optionB,
                    opC: 'C. ' + question[index].optionC
                };
                if (currentPage == maxPage) quiz.end_page = true;
                else quiz.end_page = false;

                return res.render('quiz/quizUser', {
                    message: 'Hi, ' + req.userName,
                    start_quiz: true,
                    Many_choice: question[index].Manychoice,
                    totalPage: maxPage,
                    quiz
                });
            })
            .catch((err) => {
                res.status(500).send({ message: 'Quiz are not available' });
            });
    }

    // [POST] /dashboard/saveanswer
    saveAnswer(req, res) {
        const quest = req.session.id_quest;

        // Lưu câu trả lời của user vào  req.session.listAnswer
        req.session.listAnswer[quest] = req.body.option;

        console.log(req.session);

        // trả về trang câu hỏi hiện tại
        //res.redirect('/dashboard/showquiz?page=' + req.session.id_quest);
        return res.status(200).send({
            result: 'redirect',
            id_quest: req.session.id_quest,
            url: '/dashboard/showquiz?page='
        });
    }

    // [POST] /dashboard/submitAnswer
    submitAnswer(req, res) {
        let listAnswer = req.session.listAnswer;
        let listResult = {};
        listResult['correctAns'] = 0;
        listResult['wrongAns'] = 0;

        // Lấy dữ liệu trong bảng questions
        Question.findAll()
            .then((question) => {
                //console.log(question);
                for (let i = 0; i < question.length; i++) {
                    let id_quest = i + 1;
                    // câu hỏi có nhiều đáp án
                    if (question[i].dataValues.Manychoice == 1) {
                        console.log(listAnswer[id_quest]);
                        // kiểm tra xem user có chọn nhiều đáp án không?
                        if (typeof listAnswer[id_quest] == 'object') {
                            if (question[i].dataValues.correctOption == listAnswer[id_quest].join(',')) {
                                listResult.correctAns++;
                                listResult[id_quest] = true;
                            } else {
                                listResult.wrongAns++;
                                listResult[id_quest] = false;
                            }
                        } else if (question[i].dataValues.correctOption == listAnswer[id_quest]) {
                            listResult.correctAns++;
                            listResult[id_quest] = true;
                        } else {
                            listResult.wrongAns++;
                            listResult[id_quest] = false;
                        }
                    }
                    // câu hỏi có một đáp án
                    else {
                        if (question[i].dataValues.correctOption == listAnswer[id_quest]) {
                            listResult.correctAns++;
                            listResult[id_quest] = true;
                        } else {
                            listResult.wrongAns++;
                            listResult[id_quest] = false;
                        }
                    }
                }
                listResult.score = ((listResult.correctAns / (listResult.correctAns + listResult.wrongAns)) * 100).toFixed(2);
                req.session.result = listResult;
                console.log(req.session);
                return res.status(200).send('' + JSON.stringify({ listAnswer, listResult }));
                // return res.render('result', {
                //     change_header: true,
                //     totalPage: question.length,
                //     listResult,
                // });
            })
            .catch((err) => {
                console.log('>> Error while finding question ', err);
            });
    }
}

module.exports = new DashboardController();

module.exports.getWeather = (req, res) => {
    // [GET] /weather?address=lahore
    const address = req.query.address;
    if (!address) {
        return res.send({
            error: 'You must enter address in search text box'
        });
    }

    getWeatherData(address)
        .then((weatherData) => {
            console.log('Dữ liệu thời tiết:', weatherData);
            const temperature = weatherData.main.temp;
            const humidity = weatherData.main.humidity;
            const description = weatherData.weather[0].description;

            res.send({
                temperature,
                humidity,
                description,
                cityName
            });
        })
        .catch((error) => {
            return res.send({
                error
            });
        });
};

// Function controller for Admin
module.exports.show_admindashBoard = (req, res) => {
    // [GET] v1/dashboards/admin/quiz
    return res.render('quiz/quizAdmin');
};
module.exports.resetQuestion = (req, res) => {
    //console.log(req.body);
    // [POST] v1/dashboard/admin/resetquestion
    if (req.body.command === 'truncate') {
        Question.destroy({ truncate: true, cascade: false })
            .then(() => {
                return res.send({ message: 'Reset questions table success' });
            })
            .catch((err) => {
                return res.status(500).send({ message: err.message });
            });
    }
};
module.exports.resetDataSensor = (req, res) => {
    //console.log(req.body);
    // [POST] v1/dashboard/admin/resetDataSensor
    if (req.body.command === 'truncate') {
        DataSensor.destroy({ truncate: true, cascade: false })
            .then(() => {
                return res.send({ message: 'Reset data_sensors table success' });
            })
            .catch((err) => {
                return res.status(500).send({ message: err.message });
            });
    }
};
module.exports.createQuestion = (req, res) => {
    console.log(req.body);
    // [POST] v1/dashboard/admin/createquestion
    if (!req.body.Manychoice) {
        req.body.Manychoice = 0;
    }
    if (typeof req.body.correctOption === 'object') {
        req.body.correctOption = req.body.correctOption.join(',');
    }
    const { title, optionA, optionB, optionC, correctOption, Manychoice } = req.body;

    console.log(correctOption);
    if (!title || !optionA || !optionB || !optionC || !correctOption) {
        return res.send({
            message: 'Create not success'
        });
    } else {
        Question.create({
            title,
            optionA,
            optionB,
            optionC,
            correctOption,
            Manychoice
        })
            .then((question) => {
                console.log('>> Created question: ' + JSON.stringify(question, null, 4));
                return res.send({
                    message: 'Create success question id= ' + question.id
                });
            })
            .catch((err) => {
                console.log('>> Error while creating question: ', err);
                res.status(500).send({ message: err.message });
            });
    }
};
