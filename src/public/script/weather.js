var fetchWeather = '/v1/dashboard/weather/show';

const weatherForm = document.querySelector('#weatherLocation');
const search = document.querySelector('input');

const weatherIcon = document.querySelector('.weatherIcon i');
const weatherCondition = document.querySelector('.weatherCondition');

const tempElement = document.querySelector('.temperature span');
const humiElement = document.querySelector('.humidity span');
const locationElement = document.querySelector('.place');

const dateElement = document.querySelector('.date');

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

dateElement.textContent = new Date().getDate() + ', ' + monthNames[new Date().getMonth()].substring(0, 3);

weatherForm.addEventListener('submit', (event) => {
    event.preventDefault();
    locationElement.textContent = 'Loading...';
    tempElement.textContent = '...';
    humiElement.textContent = '...';
    weatherCondition.textContent = '';
    const locationApi = fetchWeather + '?address=' + search.value;
    fetch(locationApi, { method: 'POST' }).then((response) => {
        console.log('🚀 ~ file: weather.js:27 ~ fetch ~ response:', response);
        response.json().then((data) => {
            if (data.error) {
                locationElement.textContent = data.error;
                tempElement.textContent = '...';
                humiElement.textContent = '...';
                weatherCondition.textContent = '';
            } else {
                if (data.description.search('clouds') > -1) {
                    weatherIcon.className = 'wi wi-cloudy';
                } else if (data.description.search('rain') > -1) {
                    weatherIcon.className = 'wi wi-rain';
                } else {
                    weatherIcon.className = 'wi wi-day-sunny';
                }

                locationElement.textContent = data.cityName;
                tempElement.textContent = (data.temperature - 273.5).toFixed(1) + String.fromCharCode(176);
                humiElement.textContent = data.humidity + '%';
                weatherCondition.textContent = data.description.toUpperCase();
            }
        });
    });
});
