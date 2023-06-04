import { TuyaContext } from '@tuya/tuya-connector-nodejs';
import qs from 'qs';
import crypto from 'crypto';
import axios from 'axios';
import { tuyaConfig } from '../../configs';
import Logging from '../../library/Logging';
/**
 * api env entrypoint
 *
 * 'https://openapi.tuyacn.com',  // 亚洲 AY
 * 'https://openapi.tuyaus.com',  // 美区 US
 * 'https://openapi.tuyaeu.com',  // 欧洲 EU
 * 'https://openapi.tuyain.com',  // 印度 IN
 */
// const context = new TuyaContext({
//     baseUrl: 'https://openapi.tuyaus.com',
//     accessKey: 'ct8qwp4mxpxe5hdpx8m8',
//     secretKey: '851f318725134f88ac8e475b1faacfc4'
// });
const httpClient = axios.create({
    baseURL: tuyaConfig.host,
    timeout: 5 * 1e3
});

const device_id = 'ebdd31ffb97ec2b5a05bpc';

async function encryptStr(str, secret) {
    return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

async function getTokenSign() {
    const nonce = '';
    const method = 'GET';
    const timestamp = Date.now().toString();
    const signUrl = '/v1.0/token?grant_type=1';
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const signHeaders = Object.keys({});
    const signHeaderStr = Object.keys(signHeaders).reduce((pre, cur, idx) => {
        return `${pre}${cur}:${{}[cur]}${idx === signHeaders.length - 1 ? '' : '\n'}`;
    }, '');
    const stringToSign = [method, contentHash, signHeaderStr, signUrl].join('\n');
    const signStr = tuyaConfig.accessKey + timestamp + nonce + stringToSign;
    return {
        t: timestamp,
        sign_method: 'HMAC-SHA256',
        client_id: tuyaConfig.accessKey,
        sign: await encryptStr(signStr, tuyaConfig.secretKey),
        Dev_channel: 'SaaSFramework',
        Dev_lang: 'Nodejs'
    };
}

class ApiTuya {
    accessToken = '';
    get getAccessToken() {
        return this.accessTokenTuya;
    }
    async getAccessTokenTuya() {
        const tokenHeaders = await getTokenSign();

        const options = {
            headers: tokenHeaders
        };
        try {
            const { data: login } = await httpClient.get('/v1.0/token?grant_type=1', options);
            if (!login || !login.success) {
                throw Error(`highway: ${login.msg}`);
            }
            console.log('highway access_token: ', login.result.access_token);
            this.accessToken = login.result.access_token;
        } catch (error) {
            Logging.error(error);
        }
    }

    async getRequestSign(path, method, headers = {}, query = {}, body = {}) {
        const t = Date.now().toString();

        // separate the query part in the url
        const [uri, pathQuery] = path.split('?');
        console.log(uri, pathQuery);

        const queryMerged = Object.assign(query, qs.parse(pathQuery));
        // sort query
        const sortedQuery = {};
        Object.keys(queryMerged)
            .sort()
            .forEach((i) => (sortedQuery[i] = query[i]));
        console.log('sortedQuery', sortedQuery);

        const querystring = qs.stringify(sortedQuery);
        const url = querystring ? `${uri}?${querystring}` : uri;
        console.log('Url request: ', url);
        if (!this.accessToken) {
            await this.getAccessTokenTuya();
        }
        const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
        const stringToSign = [method, contentHash, '', decodeURIComponent(url)].join('\n');
        const signStr = tuyaConfig.accessKey + this.accessToken + t + stringToSign;
        return {
            t,
            path: url,
            access_token: this.accessToken,
            sign_method: 'HMAC-SHA256',
            client_id: tuyaConfig.accessKey,
            sign: await encryptStr(signStr, tuyaConfig.secretKey),
            Dev_channel: 'SaaSFramework',
            Dev_lang: 'Nodejs'
        };
    }

    async sendCommands(deviceId = device_id, commands = [{ code: 'switch_1', value: true }]) {
        const url = `/v1.0/devices/${deviceId}/commands`;
        const method = 'POST';

        const reqHeaders = await this.getRequestSign(
            url,
            method,
            {},
            {},
            {
                commands: commands
            }
        );

        const { path, ...headers } = reqHeaders;
        console.log('🚀 ~ file: index.js:127 ~ ApiTuya ~ sendCommands ~ reqHeaders:', reqHeaders);

        try {
            const { data } = await httpClient.request({
                url: path,
                method,
                data: {
                    commands: commands
                },
                params: {},
                headers
            });
            if (!data || !data.success) {
                throw Error(`Something's error when sending commands: ${data.msg}`);
            }

            console.log('🚀 ~ file: index.js:143 ~ ApiTuya ~ sendCommands ~ data:', data);
        } catch (error) {
            Logging.error(error);
        }
    }

    async getDeviceStatus(deviceId = device_id) {
        const url = `/v1.0/devices/${deviceId}/status`;
        const method = 'GET';

        const reqHeaders = await this.getRequestSign(url, method, {}, {}, {});

        const { path, ...headers } = reqHeaders;
        console.log('🚀 ~ file: index.js:127 ~ ApiTuya ~ sendCommands ~ reqHeaders:', reqHeaders);

        try {
            const { data } = await httpClient.request({
                url: path,
                method,
                data: {},
                params: {},
                headers
            });
            if (!data || !data.success) {
                throw Error(`Something's error when sending commands: ${data.msg}`);
            }
            return data.result;
        } catch (error) {
            Logging.error(error);
        }
    }
}
export default ApiTuya;
