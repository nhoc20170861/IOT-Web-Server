import dotenv from 'dotenv';

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
const host_mqtt = process.env.HOST_MQTT;
const port_mqtt = process.env.PORT_MQTT;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

// connect to mqtt broker
const connectUrl = `mqtt://${host_mqtt}:${port_mqtt}`;
const clientMqtt = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'nhoc20170861',
    password: 'nhoc20170861',
    reconnectPeriod: 2000
});
console.log(connectUrl);
export default clientMqtt;
