// require some necessery pakages

import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
import cors from 'cors';
import express from 'express';

import session from 'express-session';
import Pusher from 'pusher';
import cookieParser from 'cookie-parser';
import { SERVER_PORT } from './configs';
import Logging from './library/Logging';
// connect db mysql
import db from './models';

const Device = db.device;
const Role = db.role;
const DataSensor = db.data_sensor;
db.sequelize.sync();
//force: true will drop the table if it already exists
// db.sequelize
//   .query("SET FOREIGN_KEY_CHECKS = 0")
//   .then(function () {
//     return db.sequelize.sync({ force: true });
//   })
//   .then(function () {
//     return db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
//   })
//   .then(
//     function () {
//       console.log("Drop and Resync Database with { force: true }");
//       initial();
//     },
//     function (err) {
//       console.log(err);
//     }
//   );

function initial() {
    Role.create({
        id: 1,
        name: 'user'
    });

    Role.create({
        id: 2,
        name: 'moderator'
    });

    Role.create({
        id: 3,
        name: 'admin'
    });
}

const app = express();
export const port_server = SERVER_PORT;

// template engine with express-handlebars
const { create } = require('express-handlebars');
const hbs = create({
    layoutsDir: `${__dirname}/resources/views/layouts`,
    extname: `hbs`,
    defaultLayout: 'main',
    partialsDir: `${__dirname}/resources/views/partials`
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

// Start server

app.use(cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); // cookie parser middleware

app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: process.env.ACCESS_TOKEN_SECRET,
        cookie: { maxAge: 1000 * 60 * 60 }
    })
);

// Use static file
app.use(express.static(path.join(__dirname, 'public')));

// Router init

import routes from './routes';
app.use('/', routes);

// Start Server

const server = require('http').Server(app);
export const socketIo = require('socket.io')(server, {
    cors: {
        origin: '*'
    }
});

server.listen(port_server, () => {
    Logging.info(`⚡️[server]: Server is running at http://localhost:${port_server}`);
});

// create connection between client and server thourgh socket
socketIo.on('connection', function (socket) {
    Logging.info("🚀 New client connected " + socket.id); 
    socket.on('disconnect', function () {});

    //server listen data from client1
    socket.on('device1-sent-data', function (id_device) {
        // after listning data, server emit this data to another client
        DataSensor.findOne({
            where: {
                deviceId: parseInt(id_device)
            },
            order: [['createdAt', 'DESC']]
        }).then((data_sensor) => {
            if (data_sensor == null) {
                data_sensor = {
                    humidity: 0,
                    temperature: 0,
                    time: 0,
                    pm2_5: 0,
                    battery: 0
                };
            }
            console.log(data_sensor);
            socket.emit('Server-sent-device1', data_sensor);
        });
    });

    //server listen data from client2
    socket.on('device2-sent-data', function (id_device) {
        // after listning data, server emit this data to another client
        DataSensor.findOne({
            where: {
                deviceId: parseInt(id_device)
            },
            order: [['createdAt', 'DESC']]
        }).then((data_sensor) => {
            socket.emit('Server-sent-device2', data_sensor);
        });
    });
});


// _________________________start https server ___________________________________
// const https = require('https');
// const fs = require('fs');

// const https_options = {
//     ca: fs.readFileSync(path.join(__dirname, 'ca_bundle.crt')),
//     key: fs.readFileSync(path.join(__dirname, 'private.key')),
//     cert: fs.readFileSync(path.join(__dirname, 'certificate.crt'))
// };
// const httpsServer = https.createServer(https_options, app);
// var io = require("socket.io")(httpsServer);
// httpsServer.listen(port_server, () => {
//     console.log(`App listening at https://localhost:${port_server}`);
// })

import ApiTuya from './service/tuyaPlaform';
const apiTuya = new ApiTuya();

// variable data stored
var data = {
    humi: 0,
    temp: 0,
    bat: 0,
    pm2_5: 0,
    time: ''
};

var device_current = 1;

// config connection mqtt broker
import client from './configs';

// defined subscribe and publish topic
const topic_pub = 'nhoc20170861/mqtt';
const topic_pub1 = 'nhoc20170861/lamp';
var topic_sub_ar = ['nhoc20170861/data/device1', 'nhoc20170861/data/device2'];

// subscribe topic
client.on('connect', () => {
    console.log('Connected');
    client.subscribe(topic_sub_ar, () => {
        console.log(`Subscribe to topic '${topic_sub_ar}'`);
    });
});

// console.log message received from mqtt broker
var count = 0;

client.on('message', (topic_sub, payload) => {
    flag = true;
    console.log('Received Message:', topic_sub, payload.toString());
    const id_device = parseInt(topic_sub.slice(-1));

    const data_sensor = JSON.parse(payload.toString());

    console.log(data);
    DataSensor.create({
        humidity: data_sensor.humi,
        temperature: data_sensor.temp,
        pm2_5: data_sensor.pm2_5,
        battery: data_sensor.bat,
        deviceId: id_device
    }).then((data_sensor) => {
        count = data_sensor.id;
        console.log(data_sensor.id);
    });
});

client.on('connect', () => {
    client.publish(topic_pub, 'nodejs mqtt connect', { qos: 2, retain: false }, (error) => {
        if (error) {
            console.error(error);
        }
    });
});

// make api
app.post('/dashboard/controller/lamp', async (req, res) => {
    let mode = req.body.lamp_mode;

    const commands = [{ code: 'switch_1', value: mode == 'ON' ? true : false }];
    console.log('🚀 ~ file: app.js:234 ~ app.post ~ commands:', commands);

    // send commands to tuya
    const device_id = 'ebdd31ffb97ec2b5a05bpc';
    await apiTuya.sendCommands(device_id, commands);
    // public to MQTT Broker
    client.publish(topic_pub1, mode);
    console.log(mode);
});

app.get('/dashboard/controller/lamp_stutus', async (req, res) => {
    // send commands to tuya
    const device_id = 'ebdd31ffb97ec2b5a05bpc';
    const response = await apiTuya.getDeviceStatus(device_id);
    console.log('🚀 ~ file: app.js:246 ~ app.get ~ response:', response);
    return res.status(200).json(response);
});

app.post('/dashboard/controller/lamp_timer', (req, res) => {
    let mode = req.body;
    // public to MQTT Broker
    client.publish(topic_pub1, mode);
    console.log(mode);
});
app.post('/dashboard/admin/deleteDevice', function (req, res) {
    let id_device = req.body.id_device;
    Device.destroy({ where: { id: id_device } })
        .then(() => {
            let topic_unsub = 'nhoc20170861/data/device' + id_device.toString();
            client.unsubscribe(topic_unsub, () => {
                console.log(`Subscribe to topic '${topic_unsub}'`);
            });
            return res.send({ message: 'Delete device success' });
        })
        .catch((err) => {
            return res.status(500).send({ message: err.message });
        });
});

// create new device
app.post('/dashboard/admin/createDevice', function (req, res) {
    const { name_device, topic_device } = req.body;
    if (!name_device || !topic_device) {
        return res.send({
            message: 'Create not success'
        });
    }

    Device.create({
        name: name_device,
        topic: topic_device
    }).then((device) => {
        console.log('device id= ' + device.id);
        let new_topic_sub = 'nhoc20170861/data/device' + device.id;

        client.subscribe(new_topic_sub, () => {
            console.log(`Subscribe to topic '${new_topic_sub}'`);
        });

        return res.send({
            message: 'Create success, device witd id =' + device.id
        });
    });
});

const pusher = new Pusher({
    appId: '1361115',
    key: '97de8deb68d2953718df',
    secret: '3d164b6ac64e193c8936',
    cluster: 'ap1',
    useTLS: true
});
var currentTime = '';
var SensorData_device1 = {
    device: '1',
    unit: 'none',
    dataPoints: [
        {
            time: '',
            value: 0
        }
    ]
};

var SensorData_device2 = {
    device: '2',
    unit: 'none',
    dataPoints: [
        {
            time: '',
            value: 0
        }
    ]
};
app.get('/getDataSensor/:id', function (req, res) {
    let id_device = parseInt(req.params.id);
    if (id_device == 1) {
        console.log(SensorData_device1);
        res.send(SensorData_device1);
    }
    if (id_device == 2) {
        console.log(SensorData_device2);
        res.send(SensorData_device2);
    }
});

app.get('/addDataSensor/1', function (req, res) {
    //let id_device = req.params.id;
    let id_device = 1;
    DataSensor.findOne({
        where: {
            deviceId: parseInt(id_device)
        },
        order: [['createdAt', 'DESC']]
    })

        .then((data_sensor) => {
            console.log(SensorData_device1);
            let now = new Date(Date.now());
            currentTime = now.getDate() + '/' + (now.getMonth() + 1) + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
            let newDataPoint = {
                time: currentTime,
                value: data_sensor.dataValues.pm2_5
            };
            // remove first element
            if (SensorData_device1.dataPoints.length > 15) {
                SensorData_device1.dataPoints.shift();
            }
            SensorData_device1.dataPoints.push(newDataPoint);
            //console.log(SensorData);
            pusher.trigger('device1-pm2_5-chart', 'new-pm2_5', {
                dataPoint: newDataPoint
            });
            res.send({ success: true });
        })
        .catch(() => {
            res.send({
                success: false,
                errorMessage: 'Invalid Query Paramaters, required - temperature & time.'
            });
        });
});
app.get('/addDataSensor/2', function (req, res) {
    let id_device = 2;
    DataSensor.findOne({
        where: {
            deviceId: parseInt(id_device)
        },
        order: [['createdAt', 'DESC']]
    })

        .then((data_sensor) => {
            console.log(SensorData_device1);
            let now = new Date(Date.now());
            currentTime = now.getDate() + '/' + (now.getMonth() + 1) + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
            let newDataPoint = {
                time: currentTime,
                value: data_sensor.dataValues.pm2_5
            };
            // remove first element
            if (SensorData_device1.dataPoints.length > 15) {
                SensorData_device1.dataPoints.shift();
            }
            SensorData_device1.dataPoints.push(newDataPoint);
            //console.log(SensorData);
            pusher.trigger('device2-pm2_5-chart', 'new-pm2_5', {
                dataPoint: newDataPoint
            });
            res.send({ success: true });
        })
        .catch(() => {
            res.send({
                success: false,
                errorMessage: 'Invalid Query Paramaters, required - temperature & time.'
            });
        });
});

app.get('*', function (req, res) {
    res.status(404).render('page404');
});

export default app;
