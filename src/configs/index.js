import dotenv from 'dotenv';
import Pusher from 'pusher';
import path from 'path';
const fs = require('fs');
dotenv.config();

export const SERVER_PORT = process.env.PORT_SERVER;

export const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

export const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

export const jwtExpiration = 3600; // 1 hour

export const jwtRefreshExpiration = 86400; // 24 hours

export const mysqlConfig = {
    HOST: process.env.DATABASE_HOST,
    USER: process.env.DATABASE_USER,
    PASSWORD: process.env.DATABASE_PASSWORD,
    DB: process.env.DATABASE,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

export const weatherApi = {
    openWeatherMap: {
        BASE_URL: 'https://api.openweathermap.org/data/2.5/weather?q=',
        SECRET_KEY: '605113a748b17d04b1b05787530520f5'
    }
};

export const tuyaConfig = {
    host: 'https://openapi.tuyaus.com',
    accessKey: 'ct8qwp4mxpxe5hdpx8m8',
    secretKey: '851f318725134f88ac8e475b1faacfc4'
};

// config mqtt broker
import mqtt from 'mqtt';
const protocol = 'mqtt';
// const path_mqtt = '/quan3.pham';
const host_mqtt = process.env.HOST_MQTT;
const port_mqtt = process.env.PORT_MQTT;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

// connect to mqtt broker

const connectUrl = `${protocol}://${host_mqtt}:${port_mqtt}`;
console.log(connectUrl);
const clientMqtt = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORĐ,
    // Enable the SSL/TLS, whether a client verifies the server's certificate chain and host name
    rejectUnauthorized: true,
    // If you are using Two-way authentication, you need to pass the CA, client certificate, and client private key.
    ca: fs.readFileSync(path.join(__dirname, '../ssl/broker.emqx.io-ca.crt')),
    reconnectPeriod: 2000
});

clientMqtt.on('error', (error) => {
    console.error('connection failed', error);
});
clientMqtt.on('reconnect', (error) => {
    console.error('reconnect failed', error);
});
export default clientMqtt;

export const pusher = new Pusher({
    appId: '1361115',
    key: '97de8deb68d2953718df',
    secret: '3d164b6ac64e193c8936',
    cluster: 'ap1',
    useTLS: true
});
