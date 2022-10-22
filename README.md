# nodejs_mqtt

This is a project Web Server using nodejs express and template engine handelbars. Project used for air quality monitoring such as fine dust concentration, temperature, humidity, UV index.
Technicals:

-   Mqtt broker, Mysql server
-   HTML, CSS, jquery
-   Sequelize nodejs to communicate mysql server
-   Authentication, Authorization, with json webtoken

# Preparation

You need install nodejs [here](https://phoenixnap.com/kb/install-node-js-npm-on-windows).
After that, open termernial with project and run : npm install, to install all package need for project

Beside, you install mysql and create corresponding db for authentication and authorization. You can flow this [tutorial](https://www.bezkoder.com/node-js-jwt-authentication-mysql/)

You need install mysql server on your PC, follow this [link](https://www.youtube.com/watch?v=2c2fUOgZMmY&t=335s)
After that you need create db called "nodejs_login", nodejs application will connect to db with config below (it stored in file .env) :
------ .env ------
DATABASE = nodejs_login
DATABASE_HOST = 127.0.0.1
DATABASE_USER = root
DATABASE_PASSWORD = YOUR_DATABASE_PASSWORD
ACCESS_TOKEN_SECRET = YOUR_ACCESS_TOKEN_SECRET
PORT_SERVER = YOUR_PORT_SERVER
HOST_MQTT = YOUR_HOST_MQTT
PORT_MQTT = YOUR_PORT_MQTT
You can create a .env file and change the parameters according to your project.
Good luck for you!
