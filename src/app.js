// require some necessery pakages

import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
const spdy = require('spdy');
import session from 'express-session';
import cookieParser from 'cookie-parser';
const fs = require('fs');
import helmet from 'helmet';
const { authJwt } = require('./middlewares');

import Logging from './library/Logging';

// connect db mysql
import db from './models';
const Role = db.role;
const PositionGoal = db.position_goals;
const Robot = db.robot;
const Map = db.map;
async function initialDataBase() {
    /**
     * @brief bộ dữ liệu cho Mir
     */

    const RoleList = [
        {
            id: 1,
            name: 'user'
        },
        {
            id: 2,
            name: 'moderator'
        },
        {
            id: 3,
            name: 'admin'
        }
    ];

    const filePath = path.join(__dirname, `./data_test/`);
    // List of JSON files to combine
    const fileNames = ['RobotConfigList.json', 'MapList.json', 'allPositionGoalMir.json'];
    const dataInputs = [];
    // Read and combine JSON files
    fileNames.forEach((fileName) => {
        const fileContent = fs.readFileSync(filePath + fileName, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        dataInputs.push(jsonData);
    });
    // console.log('🚀 ~ fileNames.forEach ~ dataInputs:', dataInputs);
    try {
        await Role.bulkCreate(RoleList);
        await Robot.bulkCreate(dataInputs[0]);
        await Map.bulkCreate(dataInputs[1]);
        await PositionGoal.bulkCreate(dataInputs[2]);
        // await PositionGoal.bulkCreate(allPositionGoals2);
    } catch (error) {
        console.log('🚀 app.jsr:', error.message);
    }
}

const app = express();

// Use Helmet!
// app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

// template engine with express-handlebars
const { create } = require('express-handlebars');
const hbs = create({
    layoutsDir: `${__dirname}/resources/views/layouts`,
    extname: `hbs`,
    defaultLayout: 'main',
    partialsDir: `${__dirname}/resources/views/partials`
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser()); // cookie parser middleware

// Start server
app.use(cors());

app.use(
    session({
        resave: false,
        saveUninitialized: true,
        secret: process.env.ACCESS_TOKEN_SECRET,
        cookie: { maxAge: 1000 * 60 * 60 }
    })
);

// Use static file
app.use(express.static(path.join(__dirname, 'public')));

// create dashboard mainQueue
import { mainQueue, queueEsp, queueBacklog } from './controllers/v2/messageQueue/initMsgQueue.js';
// bullmq dashboard
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/queueDashBoard');
const queueAdapter = new BullMQAdapter(mainQueue, { allowRetries: true, readOnlyMode: false });
const queueBacklogAdapter = new BullMQAdapter(queueBacklog, { allowRetries: true, readOnlyMode: false });
const queueAdapterEsp = new BullMQAdapter(queueEsp, { allowRetries: true, readOnlyMode: true });
// create Queue dashboard to monitor
const queueAdapterRobots = [];
Object.keys(queueRobots).forEach((key) => {
    const queueRb = new BullMQAdapter(queueRobots[key], { allowRetries: true, readOnlyMode: false });
    queueAdapterRobots.push(queueRb);
});
const bullBoard = createBullBoard({
    queues: [queueAdapter, queueBacklogAdapter, queueAdapterEsp, ...queueAdapterRobots],
    serverAdapter: serverAdapter
});
app.use('/queueDashBoard', [], serverAdapter.getRouter());

// Router init
import routes from './routes';
app.use('/', routes);

//================= test load ================
app.get('/autocannon', (req, res) => {
    res.send('Hello world!');
});

// Kiểm tra xem kết nối cơ sở dữ liệu đã thành công hay chưa
(async () => {
    try {
        await db.sequelize.authenticate();
        Logging.info('Database connection is ready.');
        // Đồng bộ hóa model với cơ sở dữ liệu
        await db.sequelize
            .sync()
            .then(() => {
                console.log('Created new table successfully!');
                initialDataBase();
            })
            .catch((error) => {
                console.error('Unable to create table : ', error);
            });

        // create connection between clientMqtt and server thourgh socket
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})();

// force: true will drop the table if it already exists
// db.sequelize
//     .query('SET FOREIGN_KEY_CHECKS = 0')
//     .then(function () {
//         return db.sequelize.sync({ force: true });
//     })
//     .then(function () {
//         return db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
//     })
//     .then(
//         async function () {
//             console.log('Drop and Resync Database with { force: true }');
//             await initialDataBase();
//         },
//         function (err) {
//             console.log(err);
//         }
//     );

// _________________________start http server ___________________________________
// initialize Server and socket
import { SERVER_PORT } from './configs';
const port_server = SERVER_PORT;
const https_options = {
    // ca: fs.readFileSync(path.join(__dirname, '/ssl/ca_bundle.crt')),
    key: fs.readFileSync(path.join(__dirname, '/ssl/private.key')),
    cert: fs.readFileSync(path.join(__dirname, '/ssl/selfsigned.crt'))
};
const useSSL = !!process.env.SSL;
function createServer() {
    if (!useSSL) {
        const http = require('http');
        return http.createServer(app);
    }
    return spdy.createServer(https_options, app); // start webserver wiit http2
}
const server = createServer();
// create global socketIo
global.socketIo = require('socket.io')(server, {
    cors: {
        origin: '*'
    }
});
// starting server
server.listen(port_server, () => {
    Logging.info(`⚡️[server]: App listening on port ${port_server}`);
    Logging.info(`SSL ${useSSL ? 'enabled' : 'disabled'}`);
});

// _________________________start https server ___________________________________
// const https = require('https');
// const httpsServer = https.createServer(https_options, app);
// global.socketIo = require('socket.io')(httpsServer, {
//     cors: {
//         origin: '*'
//     }
// });
// httpsServer.listen(8443, () => {
//     console.log(`App listening at https://localhost:8443`);
// });

socketIo.on('connection', function (socket) {
    Logging.info('🚀 New socket client connected ' + socket.id);
    socket.on('disconnect', function () {});
});

app.get('*', function (req, res) {
    res.status(404).render('page404');
});

export default app;
