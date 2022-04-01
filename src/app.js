// require some necessery pakages
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
var session = require('express-session');
var Pusher = require('pusher');
// connect db mysql
const db = require('./app/models');
const Device = db.device;
const Role = db.role;
const DataSensor = db.data_sensor
db.sequelize.sync();
//force: true will drop the table if it already exists
// db.sequelize.sync({force: true}).then(() => {
//   console.log('Drop and Resync Database with { force: true }');
//   initial();
// });

function initial() {
    Role.create({
        id: 1,
        name: 'user',
    });

    Role.create({
        id: 2,
        name: 'moderator',
    });

    Role.create({
        id: 3,
        name: 'admin',
    });
}

const app = express();
const port_server = process.env.PORT_SERVER;
app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: process.env.ACCESS_TOKEN_SECRET,
        cookie: { maxAge: 1000 * 60 * 60 },
    }),
);
// Use static file
app.use(express.static(path.join(__dirname, 'public')));

// template engine with express-handlebars
const { create } = require('express-handlebars');
const hbs = create({
    layoutsDir: `${__dirname}/resources/views/layouts`,
    extname: `hbs`,
    defaultLayout: 'main',
    partialsDir: `${__dirname}/resources/views/partials`,
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources\\views'));

// parsing the incoming data
var cookieParser = require('cookie-parser');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // cookie parser middleware

// Routes init
const route = require('./routers');
route(app);

// app.post("/dashboard/product", function(req, res){
//     res.sendFile(__dirname + '/resources/views//product.html');

// })



// initialize server and socket.io
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(port_server, () => {
    console.log(`App listening at http://localhost:${port_server}`);
});

// create connection between client and server thourgh socket
io.on("connection", function (socket) {
    socket.on("disconnect", function () {
    });
    setInterval(async function () {
        //if (flag == true) {
        await socket.broadcast.emit("Server-sent-data", data);
        console.log(data)
        //     flag = false;
        // }
    }, 5000);
    //server listen data from client
    // socket.on("Client-sent-data", function () {
    //     // after listning data, server emit this data to another client
    //     socket.emit("Server-sent-data", humi);
    //     //console.log(humi);
    //     });
});

// config connection mqtt broker
const client = require('./config/mqtt.config');

// defined subscribe and publish topic
const topic_pub = 'nhoc20170861/mqtt';
var topic_sub_ar = ['nhoc20170861/data/device1'];

// variable data stored
var data = {
    value: 0,
    time: ""
};
var currentTime = "";
var flag = false;


// subscribe topic
client.on('connect', () => {
    console.log('Connected');
    client.subscribe(topic_sub_ar, () => {
        console.log(`Subscribe to topic '${topic_sub_ar}'`);
    });
});

// console.log message received from mqtt broker
var count = 0;
const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fir", "Sat"];
client.on('message', (topic_sub, payload) => {
    flag = true;
    console.log('Received Message:', topic_sub, payload.toString());
    const id_device = parseInt(topic_sub.slice(-1));
    let now = new Date(Date.now());
    const data_sensor = JSON.parse(payload.toString());

    //Get time when recieve data
    var formatted = day[now.getDay()] + " " + now.getDate() + ", " + month[now.getMonth()]
        + "  " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

    currentTime = now.getDate() + ", " + month[now.getMonth()]
        + " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();

    data.time = formatted;
    data.value = data_sensor;

    console.log(data)
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
    client.publish(
        topic_pub,
        'nodejs mqtt test',
        { qos: 2, retain: false },
        (error) => {
            if (error) {
                console.error(error);
            }
        },
    )
});
// var londonTempData = {
//     city: 'London',
//     unit: 'celsius',
//     dataPoints: [
//         {
//             time: "12:30",
//             temperature: 12
//         },
//     ]
// }

var SensorData = {
    device: 'pm7003',
    unit: 'ppm',
    dataPoints: [
        {
            time: "",
            value: 0
        },
    ]
}

app.post('/dashboard/admin/createDevice', function (req, res) {

    console.log(req.body);
    const { name_device} = req.body;
    if (!name_device ) {
        return res.send({
            message: 'Create not success',
        })
    }

    Device.create({
        name: name_device,

    }).then((device) => {
        //count = device.id;
        console.log("device id= " + device.id);
        let new_device = "nhoc20170861/data/device" + device.id;
        topic_sub_ar.unshift();
        topic_sub_ar.push(new_device);
        console.log(topic_sub_ar)
   
            client.subscribe(topic_sub_ar, () => {
                console.log(`Subscribe to topic '${topic_sub_ar}'`);
            });
     
        return res.send({
            message: 'Create success, device witd id ='+device.id,
        })
    });


});


app.get('/getDataSensor', function (req, res) {
    // DataSensor.findOne({
    //     where: {
    //         id: count,
    //     }
    // })
    //     .then((data_sensor) => {
    //         let DataPointFrist = {
    //             time: currentTime,
    //             value: data_sensor.dataValues.pm2_5

    //         };
    //SensorData.dataPoints[0].time = currentTime;
    //SensorData.dataPoints[0].value = data_sensor.dataValues.pm2_5;
    //SensorData.dataPoints.pop();
    //SensorData.dataPoints.push(DataPointFrist);
    console.log(SensorData);
    //console.log(data_sensor.dataValues);
    res.send(SensorData);
    // });

});


const pusher = new Pusher({
    appId: "1361115",
    key: "97de8deb68d2953718df",
    secret: "3d164b6ac64e193c8936",
    cluster: "ap1",
    useTLS: true
});

app.get('/addDataSensor', function (req, res) {
    DataSensor.findOne({
        where: {
            id: count,
        }
    })
        .then((data_sensor) => {
            //let now = new Date(Date.now());
            //let currentTime = now.toLocaleString();        
            let newDataPoint = {
                time: currentTime,
                value: data_sensor.dataValues.pm2_5

            };
            // remove first element
            if (SensorData.dataPoints.length > 15) {
                SensorData.dataPoints.shift();
            }
            SensorData.dataPoints.push(newDataPoint);
            //console.log(SensorData);   
            pusher.trigger('london-temp-chart', 'new-temperature', {
                dataPoint: newDataPoint
            });
            res.send({ success: true });
        })
        .catch(() => {
            res.send({ success: false, errorMessage: 'Invalid Query Paramaters, required - temperature & time.' });
        })
});
