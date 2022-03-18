// require some necessery pakages
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
var session = require('express-session');
var Pusher = require('pusher');
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

app.post("/dashboard/product", function(req, res){
    res.sendFile(__dirname + '/resources/views//product.html');

})



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
const topic_sub = 'nhoc20170861/data';

// variable data stored
var data = {
    value: 0,
    time: ""
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
var count = 0;
client.on('message', (topic_sub, payload) => {
    flag = true;
    console.log('Received Message:', topic_sub, payload.toString());
    let now = new Date(Date.now());
    const data_sensor = JSON.parse(payload.toString());
    data.time = now.toLocaleTimeString();
    data.value = data_sensor;
    console.log(data)
    console.log(data_sensor);
    DataSensor.create({
        humidity: data_sensor.humi,
        temperature: data_sensor.temp,
        pm2_5: data_sensor.pm2_5,
        battery: data_sensor.bat,
    }).then((data_sensor) =>{
        count = data_sensor.id;
        console.log(count);
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
var londonTempData = {
    city: 'London',
    unit: 'celsius',
    dataPoints: [
      {
        time: 1130,
        temperature: 12 
      },
      {
        time: 1200,
        temperature: 13 
      },
      {
        time: 1230,
        temperature: 15 
      },
      {
        time: 1300,
        temperature: 14 
      },
      {
        time: 1330,
        temperature: 15 
      },
      {
        time: 1406,
        temperature: 12 
      },
    ]
  }

app.get('/getTemperature', function(req,res){
  res.send(londonTempData);
});

const pusher = new Pusher({
  appId: "1361115",
  key: "97de8deb68d2953718df",
  secret: "3d164b6ac64e193c8936",
  cluster: "ap1",
  useTLS: true
});

app.get('/addTemperature', function(req,res){
  var temp = parseInt(req.query.temperature);
  var time = parseInt(req.query.time);
  if(temp && time && !isNaN(temp) && !isNaN(time)){
    var newDataPoint = {
      temperature: temp,
      time: time
    };
    londonTempData.dataPoints.shift();  // remove first element
    londonTempData.dataPoints.push(newDataPoint);
    pusher.trigger('london-temp-chart', 'new-temperature', {
      dataPoint: newDataPoint
    });
    res.send({success:true});
  }else{
    res.send({success:false, errorMessage: 'Invalid Query Paramaters, required - temperature & time.'});
  }
});
