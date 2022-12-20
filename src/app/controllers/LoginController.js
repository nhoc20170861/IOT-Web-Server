// import modules
const db = require('../models');
const User = db.user;
//const RefreshToken = db.refreshToken;

var jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


// a variable to save a session
var session;
class LoginController {
    // [GET] /auth/login
    index(req, res) {
        let token = req.cookies.access_token;
        if (!token) {
            return res.render('login');
        } else {
            jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
                (err, decoded) => {
                    if (err) {
                        return res.render('login', {
                            message: 'Unauthorized! Login again',
                        });
                    } else return res.redirect('/dashboard/data');
                },
            );
        }
    }

    // [GET] /auth/refreshtoken
    refreshToken(req, res) {
        const userId = req.userId;
        const username = req.userName;

        User.findOne({
            where: {
                username: username,
            },
        })
            .then((user) => {
                const accessToken = jwt.sign(
                    {
                        id: user.id,
                        username: user.username,
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    {
                        expiresIn: 3600, // //expire after 1h
                    },
                );
                // update access_token
                res.cookie('access_token', accessToken, {
                    /*add several attributes to make this cookie more secure.*/
                    maxAge: 3600 * 1000, //expire after 1h
                    secure: true,
                    httpOnly: true,
                    sameSite: 'lax',
                });
                res.send('refresh token success');
            })
            .catch((err) => {
                return res.send(err);
            });
    }

    // [POST] /auth/process_login
    signin(req, res) {
        const { username, password } = req.body;

        User.findOne({
            where: {
                username: username,
            },
        })
            .then((user) => {
                // console.log(user);
                if (!user) {
                    return res.send({
                        'message': 'User Not found!',
                    });
                }

                var passwordIsValid = bcrypt.compareSync(
                    password,
                    user.password,
                );

                if (!passwordIsValid) {
                    return res.send({
                        'message': 'Password is wrong',
                    });
                }
                console.log(user.id);
                console.log(user.username);
                // set accessToken
                const accessToken = jwt.sign(
                    {
                        id: user.id,
                        username: user.username,
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    {
                        expiresIn: 3600 * 24, // //expire after 1h
                    },
                );

                // set refreshToken
                // const refreshToken = jwt.sign(
                //     {
                //         id: user.id,
                //         username: user.username,
                //     },
                //     process.env.ACCESS_TOKEN_SECRET,
                //     {
                //         expiresIn: 3600 * 24, // //expire after 24h
                //     },
                // );

                // set session
                session = req.session;
                session.userName = user.username;
                session.userId = user.id;
                console.log(req.session);
                var authorities = [];
                user.getRoles().then((roles) => {
                    for (let i = 0; i < roles.length; i++) {
                        authorities.push('ROLE_' + roles[i].name.toUpperCase());
                    }
                    console.log(authorities);
                    res.send({
                        accessToken,
                        url: "/dashboard/data"
                    });
                    // res.cookie('access_token', accessToken, {
                    //     /*add several attributes to make this cookie more secure.*/
                    //     maxAge: 3600 * 1000, //expire after 1h
                    //     secure: true,
                    //     httpOnly: true,
                    //     sameSite: 'lax',
                    // });
                    //return res.redirect('/dashboard/data');
                    // res.cookie('refresh_token', refreshToken, {
                    //     maxAge: 24 * 3600 * 1000, //expire after 24h
                    //     secure: true,
                    //     httpOnly: true,
                    //     sameSite: 'lax',
                    // });

                    // Save token to database
                    // RefreshToken.create({
                    //     token: refreshToken,
                    //     userId: user.id,
                    // })
                    //     .then(() => {
                    //         console.log(refreshToken);
                    //         return res.redirect('/dashboards');
                    //     })
                    //     .catch((err) => console.log(err));
                });
            })
            .catch((err) => {
                res.status(500).send({ message: err.messagey });
            });
    }

    // [POST] /auth/logout
    signout(req, res) {
        res.clearCookie('access_token');
        //res.clearCookie('refresh_token');
        console.log(req.session.userId)
        req.session.destroy();
        return res.status(200).send(
            {
                result: 'redirect',
                url: '/home'
            })

        // Get userId from access_token to prepare delete refreshtoken
        // let token = req.cookies.access_token;
        // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        //     req.userId = decoded.id;
        // });

        // delete refreshtoken from db
        // RefreshToken.destroy({
        //     where: {
        //         userId: req.userId,
        //     },
        // })
        //     .then(() => {
        //         //console.log(req.session.userId)
        //         req.session.destroy();
        //         return res.redirect('/home');
        //     })
        //     .catch((err) => {
        //         res.status(500).send({ message: err.messagey });
        //     });
    }

}

module.exports = new LoginController();
