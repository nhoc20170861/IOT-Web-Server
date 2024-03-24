const db = require('../../models');
const Question = db.question;
const DataSensor = db.data_sensor;
const Device = db.device;
const fetchWeatherData = require('../../service/openWeather');
import Logging from '../../library/Logging';
class DashboardController {
    // [GET] /dashboard/device-list
    getDeviceList(req, res) {
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
    // [GET] /dashboard/data/:deviceId
    getDataDetail(req, res) {
        let deviceId = parseInt(req.params.deviceId.split('_')[1]) || 1;

        console.log('🚀 ~ DashboardController ~ getDataDetail ~ deviceId:', deviceId);
        Device.findOne({
            where: {
                id: parseInt(deviceId)
            }
        })
            .then((device_info) => {
                return res.render(`dashboard/data_detail_device`, {
                    change_header: true,
                    user_name: req.userName,
                    device_name: `${device_info.deviceName}, ID: ${device_info.id}`
                });
            })
            .catch((err) => {
                return res.status(200).send({ message: err.message });
            });
    }

    // [GET] /dashboard/weather-data
    getWeather(req, res) {
        // [GET] /weather?address=lahore
        const address = req.query.address;
        if (!address) {
            return res.send({
                error: 'You must enter address in search text box'
            });
        }

        fetchWeatherData(address)
            .then((weatherData) => {
                console.log('Dữ liệu thời tiết:', weatherData);
                const temperature = weatherData.main.temp;
                const humidity = weatherData.main.humidity;
                const description = weatherData.weather[0].description;
                const cityName = weatherData.name + ', ' + weatherData.sys.country;

                return res.send({
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
    }

    // [GET] /dashboard/product
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

                return res.render('quizUser', {
                    message: 'Hi, ' + req.userName,
                    start_quiz: true,
                    Many_choice: question[index].Manychoice,
                    totalPage: maxPage,
                    quiz
                });
            })
            .catch((err) => {
                res.status(200).send({ message: 'Quiz are not available' });
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

// IOT Devices MQTT handle
import ApiTuya from '../../service/tuyaPlaform';
const apiTuya = new ApiTuya();
// config connection mqtt broker
import clientMqtt, { pusher } from '../../configs';

clientMqtt.on('connect', () => {
    Logging.info('Client mqtt Connected');
    const topic_pub = '/nodejs/mqtt';
    clientMqtt.subscribe([topic_pub], () => {
        console.log(`Subscribe to topic '${topic_pub}'`);
    });
    clientMqtt.publish(topic_pub, 'nodejs mqtt connect', { qos: 2, retain: false }, (error) => {
        if (error) {
            console.error(error);
        }
    });
});

clientMqtt.on('message', async (topic_sub, payload, packet) => {
    Logging.info(`Topic: ${topic_sub}, Message: ${payload.toString()}, QoS: ${packet.qos}`);
    try {
        const data_sensor = JSON.parse(payload.toString());
        const id_device = data_sensor['deviceId'];

        const device_info = await Device.findOne({
            where: {
                id: id_device
            }
        });
        if (!device_info) {
            throw new Error('Device not found.');
        }
        if (device_info.topic != topic_sub) {
            throw new Error('Topic not match');
        }
        DataSensor.create({
            humidity: data_sensor.humi || 0,
            temperature: data_sensor.temp || 0,
            pm2_5: data_sensor.pm2_5 || 10,
            battery: data_sensor.bat || 0,
            deviceId: device_info.id
        }).then((data_sensor) => {
            console.log(data_sensor.id);
            socketIo.emit(`Server-sent-device_${data_sensor.deviceId}`, data_sensor);
            // +++++
            let now = new Date(data_sensor.createdAt);
            let currentTime = now.getDate() + '/' + (now.getMonth() + 1) + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
            let newDataPoint = {
                time: currentTime,
                value: data_sensor.dataValues.pm2_5
            };
            pusher.trigger(`device_${data_sensor.deviceId}-pm2_5-chart`, 'new-pm2_5', {
                dataPoint: newDataPoint
            });
        });
    } catch (error) {
        Logging.error(`🚀 ~ clientMqtt.on ~ error: ${error.message}`);
    }
});

class IotDevicesController {
    // [POST] /dashboard/controller/lamp_timer
    setLampTimer(req, res) {
        let mode = req.body;
        // public to MQTT Broker
        const topic_pub1 = 'nhoc20170861/lamp';
        clientMqtt.publish(topic_pub1, mode);
        console.log(mode);
    }

    // [GET] /dashboard/controller/lamp_status
    async getLampStatus(req, res) {
        // send commands to tuya
        const device_id = 'ebdd31ffb97ec2b5a05bpc';
        const response = await apiTuya.getDeviceStatus(device_id);
        console.log('🚀 ~ file: app.js:246 ~ app.get ~ response:', response);

        if (!response) return res.status(200).json({ errCode: 500, msg: 'get lamp status fail' });
        else return res.status(200).json(response);
    }

    // [POST] /dashboard/controller/lamp
    async controlLamp(req, res) {
        let mode = req.body.lamp_mode;

        const commands = [{ code: 'switch_1', value: mode == 'ON' ? true : false }];
        console.log('🚀 ~ file: app.js:234 ~ app.post ~ commands:', commands);

        // send commands to tuya
        const device_id = 'ebdd31ffb97ec2b5a05bpc';
        await apiTuya.sendCommands(device_id, commands);
        // public to MQTT Broker
        const topic_pub1 = 'nhoc20170861/lamp';
        clientMqtt.publish(topic_pub1, mode);
        console.log(mode);
    }

    // [GET] /dashboard/fetchDataSensor
    async fetchDataSensor(req, res) {
        const lastSlug = req.params.slug;
        let deviceId = parseInt(lastSlug.split('_').pop()) || 1;
        console.log(`🚀 ~ IotDevicesController ~ fetchDataSensor, deviceId: ${lastSlug}`);
        const SensorData_device = {
            deviceId,
            unit: 'none',
            dataPoints: [
                {
                    time: '',
                    value: 0
                }
            ]
        };
        try {
            const device_info = await Device.findOne({
                where: {
                    id: deviceId
                }
            });
            if (!device_info) {
                throw new Error('Device not found.');
            }
            clientMqtt.subscribe(device_info.topic, () => {
                console.log(`Subscribe to topic '${device_info.topic}'`);
            });
            const data_sensor = await DataSensor.findAll({
                where: {
                    deviceId: deviceId
                },
                limit: 15,
                order: [['createdAt', 'DESC']]
            });
            if (data_sensor) {
                // console.log('🚀 ~ IotDevicesController ~ .then ~ data_sensor:', data_sensor);
                SensorData_device.dataPoints = data_sensor.map((item) => {
                    let now = new Date(item.createdAt);
                    let currentTime = now.getDate() + '/' + (now.getMonth() + 1) + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
                    return {
                        time: currentTime,
                        value: item.pm2_5
                    };
                });
                const cnt = data_sensor.length;
                console.log('🚀 ~ IotDevicesController ~ .then ~ data_sensor[cnt - 1]:', data_sensor[cnt - 1]);
                socketIo.emit(`Server-sent-device_${deviceId}`, data_sensor[cnt - 1]);
            }
            return res.send({ SensorData_device, device_topic: device_info.topic });
        } catch (error) {
            Logging.error(`fetchDataSensor: ${error.message}`);
            return res.send({
                success: false,
                errorMessage: error.message
            });
        }
    }

    async testDataSensor(req, res) {
        const lastSlug = req.params.slug;
        console.log('🚀 ~ IotDevicesController ~ testDataSensor ~ lastSlug:', lastSlug);
        let deviceId = parseInt(lastSlug.split('_').pop()) || 1;
        try {
            const data_sensor = await DataSensor.findOne({
                where: {
                    id: deviceId
                },
                order: [['createdAt', 'DESC']]
            });
            if (!data_sensor) {
                throw new Error('Device not found');
            }
            let now = new Date(Date.now());
            let currentTime = now.getDate() + '/' + (now.getMonth() + 1) + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
            let newDataPoint = {
                time: currentTime,
                value: 0
            };
            if (data_sensor) {
                newDataPoint['value'] = data_sensor.dataValues.pm2_5;
            }
            pusher.trigger(`${lastSlug}-pm2_5-chart`, 'new-pm2_5', {
                dataPoint: newDataPoint
            });
            console.log('🚀 ~ IotDevicesController ~ .then ~ newDataPoint:', newDataPoint);
            res.send({ success: true });
        } catch (error) {
            res.send({
                success: false,
                errorMessage: error.message
            });
        }
    }

    // [POST]  /device-connect/:deviceId
    async initDevice(req, res) {
        let deviceId = parseInt(req.params.deviceId) || 0;
        try {
            const device_info = await Device.findOne({
                where: {
                    id: deviceId
                }
            });
            if (!device_info) {
                throw new Error('Device not found.');
            }
            clientMqtt.subscribe(device_info.topic, () => {
                console.log(`Subscribe to topic '${device_info.topic}'`);
            });
            device_info.deviceStatus = 'on';
            device_info.timeActive = new Date();
            await device_info.save();
            return res.send({ deviceId, deviceStatus: device_info.deviceStatus, device_topic: device_info.topic });
        } catch (error) {
            Logging.error(`initDevice: ${error.message}`);
            return res.send({
                success: false,
                errorMessage: error.message
            });
        }
    }
}

// Function controller for Admin ===========================
const AdminApiHandle = {};
AdminApiHandle.show_admindashBoard = (req, res) => {
    // [GET] v1/dashboards/admin
    return res.render('AdminDashboard');
};
AdminApiHandle.resetQuestion = (req, res) => {
    //console.log(req.body);
    // [POST] v1/dashboard/admin/resetquestion
    if (req.body.command === 'truncate') {
        Question.destroy({ truncate: true, cascade: false })
            .then(() => {
                return res.send({ message: 'Reset questions table success' });
            })
            .catch((err) => {
                return res.status(200).send({ message: err.message });
            });
    }
};
AdminApiHandle.resetDataSensor = (req, res) => {
    //console.log(req.body);
    // [POST] v1/dashboard/admin/resetDataSensor
    if (req.body.command === 'truncate') {
        DataSensor.destroy({ truncate: true, cascade: false })
            .then(() => {
                return res.send({ message: 'Reset data_sensors table success' });
            })
            .catch((err) => {
                return res.status(200).send({ message: err.message });
            });
    }
};
AdminApiHandle.createQuestion = (req, res) => {
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

AdminApiHandle.createDevice = async function (req, res) {
    try {
        const { name_device, topic_device } = req.body;
        console.log('🚀 ~ file: app.js:697 ~ req.body;:', req.body);
        if (!name_device || !topic_device) {
            throw new Error('Invalid input');
        }

        const device = await Device.create({
            deviceName: name_device,
            topic: topic_device,
            deviceType: 'default'
        });

        if (device) {
            console.log('device id= ' + device.id);
            let new_topic_sub = device.topic;

            clientMqtt.subscribe(new_topic_sub, () => {
                console.log(`Subscribe to topic '${new_topic_sub}'`);
            });

            return res.send({
                message: 'Create success, device witd id =' + device.id
            });
        } else {
            throw new Error('Something is wrong');
        }
    } catch (error) {
        console.log('🚀 ~ file: app.js:722 ~ error:', error.message);
        return res.send({
            success: false,
            errorCode: 500,
            message: 'Create not success'
        });
    }
};
AdminApiHandle.deleteDevice = async function (req, res) {
    let id_device = req.body.id_device;
    try {
        const device = await Device.findOne({ where: { id: id_device } });
        console.log('🚀 ~ AdminApiHandle.deleteDevice ~ device:', device);
        if (!device) {
            throw new Error('Device not found.');
        }
        let topic_unsub = device.topic;
        console.log('🚀 ~ AdminApiHandle.deleteDevice ~ topic_unsub:', topic_unsub);
        clientMqtt.unsubscribe(topic_unsub, () => {
            console.log(`Unsubscribe to topic '${topic_unsub}'`);
        });
        // await Device.destroy({ where: { id: id_device } });
        await device.destroy();
        return res.send({ message: 'Delete device success' });
    } catch (error) {
        console.log('🚀 ~ AdminApiHandle.deleteDevice ~ error.message:', error.message);
        return res.status(200).send({ message: error.message });
    }
};
module.exports = {
    dashboardController: new DashboardController(),
    iotDevicesController: new IotDevicesController(),
    AdminApiHandle
};
