const axios = require('axios');
const weatherApi = require('../configs/weather-api.config').default;
async function getWeatherData(city) {
    const url = weatherApi.openWeatherMap.BASE_URL + encodeURIComponent(city) + '&appid=' + weatherApi.openWeatherMap.SECRET_KEY;

    try {
        const response = await axios.get(url);
        const weatherData = response.data;

        // Xử lý và trả về dữ liệu thời tiết ở đây
        return weatherData;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu thời tiết:', error);
        throw error;
    }
}

module.exports = getWeatherData;
