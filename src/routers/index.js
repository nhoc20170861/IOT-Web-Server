const loginRouter = require('./login');
const resgisterRouter = require('./register');
const dashboardRouter = require('./dashboard');

function route(app) {
    // Router to home page
    // ACtion --> Dispatcher ---> Function handler
    app.get('/home', (req, res) => {
        res.render('home');
    });

    // app.use(function (req, res, next) {
    //     res.header(
    //         'Access-Control-Allow-Headers',
    //         'x-access-token, Origin, Content-Type, Accept',
    //     );
    //     next();
    // });

    // Router to auth/ page
    app.use('/auth', loginRouter);

    // Router to register page
    app.use('/auth/register', resgisterRouter);

    // Router to dashboard page
    app.use('/dashboards', dashboardRouter);

    // Handling request 
    app.post("/request", (req, res) => {
        res.json([{
            name_recieved: req.body.name,
            designation_recieved: req.body.designation
        }])
    })
}
module.exports = route;
