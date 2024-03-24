var url = 'ws://broker.emqx.io:8083/mqtt';
// Create an MQTT client instance
var options = {
    // Clean session
    clean: true,
    connectTimeout: 4000,
    // Authentication
    clientId: `emqx_client_${lastSlug}`,
    username: 'emqx',
    password: 'public'
};
var client = mqtt.connect(url, options);
client.on('connect', function () {
    console.log('MQTT Connected');
});

// Receive messages
client.on('message', function (topic, payload, packet) {
    // Payload is Buffer
    console.log(`Topic: ${topic}, Message: ${payload.toString()}, QoS: ${packet.qos}`);
});

client.on('error', function (error) {
    console.log(error);
});
