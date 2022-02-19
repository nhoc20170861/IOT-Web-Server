const mqtt = require("mqtt");
const dotenv = require("dotenv");
dotenv.config({ path: "src/.env" });

// config mqtt broker
const host = process.env.HOST;
const port = process.env.PORT;
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

// connect mqtt
const connectUrl = `mqtt://${host}:${port}`;
const client = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: "nhoc20170861",
    password: "nhoc20170861",
    reconnectPeriod: 1000,
});
console.log(connectUrl);
// subscribe
const topic = "nhoc20170861/mqtt";
client.on("connect", () => {
    console.log("Connected");
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`);
    });
});

// console.log message received
client.on("message", (topic, payload) => {
    console.log("Received Message:", topic, payload.toString());
});

client.on("connect", () => {
    client.publish(
        topic,
        "nodejs mqtt test",
        { qos: 0, retain: false },
        (error) => {
            if (error) {
                console.error(error);
            }
        }
    );
});
