const loginRouter = require('./login');
const resgisterRouter = require('./register');
const dashboardRouter = require('./dashboard');
const changePasswordRouter = require('./changePassword');
function route(app) {
    // Router to home page
    // ACtion --> Dispatcher ---> Function handler
    app.get('/home', (req, res) => {
        res.render('home');
    });


    // Router to auth/ page
    app.use('/auth', loginRouter);

    // Router to register page
    app.use('/auth/register', resgisterRouter);

    // Router to dashboard page
    app.use('/dashboard', dashboardRouter);

    // Router to changePassword page
    app.use('/changePassword', changePasswordRouter);
    
    // Handling request 
    app.post("/request", (req, res) => {
        res.json([{
            name_recieved: req.body.name,
            designation_recieved: req.body.designation
        }])
    })

}
module.exports = route;
