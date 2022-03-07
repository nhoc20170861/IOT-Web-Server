const db = require('../models');
const Question = db.question;

class DashboardController {
    // [GET] /dashboards
    getDashboard(req, res) {
        return res.render('dashboard', {
            change_header: true,
            user_name: req.userName,
        });
    }

    // [GET] /dashboards/showquiz
    showQuiz(req, res) {
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
                    opC: 'C. ' + question[index].optionC,
                };
                if (currentPage == maxPage) quiz.end_page = true;
                else quiz.end_page = false;

                return res.render('quizUser', {
                    change_header: true,
                    message: 'Hi, ' + req.userName,
                    start_quiz: true,
                    Many_choice: question[index].Manychoice,
                    totalPage: maxPage,
                    quiz,
                });
            })
            .catch((err) => {
                console.log('>> Error while finding question ', err);
            });

         }

    // [POST] /dashboards/saveanswer
    saveAnswer(req, res) {
        const quest = req.session.id_quest;

        // Lưu câu trả lời của user vào  req.session.listAnswer
        req.session.listAnswer[quest] = req.body.option;
        console.log(req.session);

        // trả về trang câu hỏi hiện tại
        res.redirect('/dashboards/showquiz?page=' + req.session.id_quest);
    }

    // [POST] /dashboards/submitAnswer
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
                        // kiểm tra xem user có chọn nhiều đáp án không?
                        if (typeof listAnswer[id_quest] == 'object') {
                            console.log(listAnswer[id_quest]);

                            if (
                                question[i].dataValues.correctOption ==
                                listAnswer[id_quest].join(',')
                            ) {
                                listResult.correctAns++;
                                listResult[id_quest] = true;
                            }
                        } else {
                            listResult.wrongAns++;
                            listResult[id_quest] = false;
                        }
                    }
                    // câu hỏi có một đáp án
                    else {
                        if (
                            question[i].dataValues.correctOption ==
                            listAnswer[id_quest]
                        ) {
                            listResult.correctAns++;
                            listResult[id_quest] = true;
                        } else {
                            listResult.wrongAns++;
                            listResult[id_quest] = false;
                        }
                    }
                }
                listResult.score = (
                    (listResult.correctAns /
                        (listResult.correctAns + listResult.wrongAns)) *
                    100
                ).toFixed(2);
                req.session.result = listResult;
                console.log(req.session);
                //return res.status(200).send('' + JSON.stringify({listAnswer, listResult}));
                return res.render('result', {
                    change_header: true,
                    totalPage: question.length,
                    listResult,
                });
            })
            .catch((err) => {
                console.log('>> Error while finding question ', err);
            });
    }
}

module.exports = new DashboardController();

// Function controller for Admin
module.exports.show_admindashBoard = (req, res) => {
    // [GET] /dashboards/admin/quiz
    return res.render('quizAdmin');
};

module.exports.createQuestion = (req, res) => {
    console.log(req.body);
    // [POST] /dashboards/admin/createquestion
    Question.create({
        title: req.body.question,
        optionA: req.body.optionA,
        optionB: req.body.optionB,
        optionC: req.body.optionC,
        correctOption: req.body.correctOption,
        Manychoice: req.body.Manychoice,
    })
        .then((question) => {
            console.log(
                '>> Created question: ' + JSON.stringify(question, null, 4),
            );
            return res.render('quizAdmin', {
                message: 'Create success',
            });
        })
        .catch((err) => {
            console.log('>> Error while creating question: ', err);
            res.status(500).send({ message: err.message });
        });
};
