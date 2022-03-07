
const mqtt = require('mqtt');
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
module.exports = client;