var currURL = window.location.href;
var lastSlug = currURL.split('/').pop();

// Using IIFE for Implementing Module Pattern to keep the Local Space for the JS Variables
(function () {
    // Enable pusher logging - don't include this in production
    Pusher.logToConsole = true;

    var serverUrl = '/',
        members = [],
        pusher = new Pusher('97de8deb68d2953718df', {
            cluster: 'ap1',
            encrypted: true
        }),
        channel,
        weatherChartRef;

    function showEle(elementId) {
        document.getElementById(elementId).style.display = 'flex';
    }

    function hideEle(elementId) {
        document.getElementById(elementId).style.display = 'none';
    }

    function ajax(url, method, payload, successCallback) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4 || xhr.status != 200) return;
            successCallback(xhr.responseText);
        };
        xhr.send(JSON.stringify(payload));
    }

    function renderWeatherChart(weatherData) {
        var ctx = document.getElementById('weatherChart').getContext('2d');
        var options = {};
        weatherChartRef = new Chart(ctx, {
            type: 'line',
            data: weatherData,
            options: options
        });
    }

    var chartConfig = {
        labels: [],
        datasets: [
            {
                label: 'AQI Index',
                fill: false,
                lineTension: 0.1,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: '#fff',
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                pointHoverBorderColor: 'rgba(220,220,220,1)',
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: [],
                spanGaps: false
            }
        ]
    };
    ajax(`/v1/dashboard/fetchDataSensor/${lastSlug}`, 'GET', {}, onFetchTempSuccess);

    function onFetchTempSuccess(response) {
        hideEle('loader');
        var respData = JSON.parse(response);
        console.log('onFetchTempSuccess ', respData);
        const { SensorData_device, device_topic } = respData;
        if (SensorData_device) {
            chartConfig.labels = SensorData_device.dataPoints.map((dataPoint) => dataPoint.time);
            chartConfig.datasets[0].data = SensorData_device.dataPoints.map((dataPoint) => dataPoint.value);

            renderWeatherChart(chartConfig);
        }
        if (device_topic) {
            // Subscribe to a topic
            client.subscribe(device_topic, function (err) {
                if (!err) {
                    // Publish a message to a topic
                    console.log(`Subscribe topic ${device_topic} success`);
                }
            });
        }
    }

    channel = pusher.subscribe(`${lastSlug}-pm2_5-chart`);
    channel.bind('pusher:subscription_succeeded', function (members) {
        console.log('successfully subscribed data channel!');
    });
    channel.bind('new-pm2_5', function (data) {
        var newTempData = data.dataPoint;
        console.log(newTempData);
        if (weatherChartRef) {
            if (weatherChartRef.data.labels.length > 15) {
                weatherChartRef.data.labels.shift();
                weatherChartRef.data.datasets[0].data.shift();
            }
            weatherChartRef.data.labels.push(newTempData.time);
            weatherChartRef.data.datasets[0].data.push(newTempData.value);
            weatherChartRef.update();
        }
    });

    /* TEMP CODE FOR TESTING */
    // var dummyTime = 5000;
    // setInterval(function () {
    //     ajax(`/v1/dashboard/testDataSensor/${lastSlug}`, 'GET', {}, () => {});
    // }, dummyTime);
})();
const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fir', 'Sat'];
$(document).ready(function () {
    if (!$('#data').hasClass('active')) {
        $('#data').addClass('active');
    }
    socket.on(`Server-sent-${lastSlug}`, function (data) {
        console.log('🚀 ~ data:', data);
        if (data.humidity != 0) {
            //Get time when recieve data
            let now = new Date(Date.now());
            let formatted = day[now.getDay()] + ' ' + now.getDate() + ', ' + month[now.getMonth()] + '  ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
            data.time = formatted;
            $('#humi').text(data.humidity + ' %');
            $('#humi_log').text(data.time);
            $('#temp').text(data.temperature + ' ' + String.fromCharCode(176));
            $('#temp_log').text(data.time);
            $('#pm2_5').text(data.pm2_5);
            $('#pm2_5_log').text(data.time);
            $('#bat').text(data.battery + ' %');
            $('#bat_log').text(data.time);
        }
    });
});
