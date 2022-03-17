// require some necessery pakages
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
var session = require('express-session');

// connect db mysql
const db = require('./app/models');
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
var session = require('express-session');
var cookieParser = require('cookie-parser');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // cookie parser middleware

// Routes init
const route = require('./routers');
route(app);



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
        if (flag == true) {
            let now = new Date(Date.now());
            data.time = now.toLocaleTimeString();
            await socket.broadcast.emit("Server-sent-data", data);
            console.log(data)
            flag = false;
        }
    }, 2000);
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
const topic_sub = 'nhoc20170861/data';

// variable data stored
var data = {
    value: undefined,
    time: undefined
};
var flag = false;


// subscribe topic
client.on('connect', () => {
    console.log('Connected');
    client.subscribe([topic_sub], () => {
        console.log(`Subscribe to topic '${topic_sub}'`);
    });
});

// console.log message received from mqtt broker
client.on('message', (topic_sub, payload) => {
    //flag = true;
    data.value = payload.toString();
    console.log('Received Message:', topic_sub, payload.toString());
    const data_sensor = JSON.parse(data.value);
    console.log(data_sensor);
    DataSensor.create({
        humidity: data_sensor.humi,
        temperature: data_sensor.temp,
        pm2_5: data_sensor.pm2_5,
        battery: data_sensor.bat,
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

