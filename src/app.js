const mqtt = require('mqtt');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { create } = require('express-handlebars');
const { header } = require('express/lib/request');

const app = express();
const port_server = process.env.PORT_SERVER;

//Use static file
app.use(express.static(path.join(__dirname, 'public')));

// template engine with express-handlebars
const hbs = create({
    layoutsDir: `${__dirname}/resources/views/layouts`,
    extname: `hbs`,
    defaultLayout: 'main',
    partialsDir: `${__dirname}/resources/views/partials`,
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources\\views'));

// config mqtt broker
const host_mqtt = process.env.HOST_MQTT;
const port_mqtt = process.env.PORT_MQTT;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

// connect to mqtt broker
const connectUrl = `mqtt://${host_mqtt}:${port_mqtt}`;
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'nhoc20170861',
    password: 'nhoc20170861',
    reconnectPeriod: 1000,
});
console.log(connectUrl);
// subscribe
const topic = 'nhoc20170861/mqtt';
client.on('connect', () => {
    console.log('Connected');
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`);
    });
});

// console.log message received
client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString());
});

client.on('connect', () => {
    client.publish(
        topic,
        'nodejs mqtt test',
        { qos: 0, retain: false },
        (error) => {
            if (error) {
                console.error(error);
            }
        },
    );
});
// Function to listen on the port
app.listen(port_server, () => {
    console.log(`App listening at http://localhost:${port_server}`);
});
// [Get] localhost:port/
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard',{
        change_header: true,
    });
});

