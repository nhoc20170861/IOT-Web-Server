const loginRouter = require('./login');
const resgisterRouter = require('./register');
const dashboardRouter = require('./dashboard');
const changePasswordRouter = require('./changePassword');

import { Router } from 'express';
const routes = Router();

// Router to home page
// ACtion --> Dispatcher ---> Function handler
routes.get('/home', (req, res) => {
    res.render('home');
});

// Router to auth/ page
routes.use('/auth', loginRouter);

// Router to register page
routes.use('/auth/register', resgisterRouter);

// Router to dashboard page
routes.use('/dashboard', dashboardRouter);

// Router to changePassword page
routes.use('/changePassword', changePasswordRouter);

export default routes;
