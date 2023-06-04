// import modules
const db = require('../../models');
const User = db.user;
//const RefreshToken = db.refreshToken;

const bcrypt = require('bcryptjs');

// a variable to save a session
var session;
import _ from 'lodash';
import { signAccessToken, signRefreshToken } from '../../middlewares/handleJwt';

class AuthController {
    // [POST] /api/auth/register
    register(req, res) {
        // Save User to Database
        User.create({
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 8)
        })
            .then((user) => {
                if (req.body.roles) {
                    Role.findAll({
                        where: {
                            name: {
                                [Op.or]: req.body.roles
                            }
                        }
                    }).then((roles) => {
                        user.setRoles(roles).then(() => {
                            return res.send({
                                success: true,
                                message: 'User was registered successfully!'
                            });
                        });
                    });
                } else {
                    // user role = 1
                    user.setRoles([1]).then(() => {
                        return res.send({
                            success: true,
                            message: 'User was registered successfully!'
                        });
                    });
                }
            })
            .catch((err) => {
                res.status(500).send({
                    success: false,
                    message: err.message
                });
            });
    }

    // [POST] /api/auth/login
    login(req, res) {
        console.log(req.body);
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({
                errorCode: 400,
                success: false,
                message: 'Bad requsest'
            });

        User.findOne({
            where: {
                username: username
            }
        })
            .then((user) => {
                // console.log(user);
                if (!user) {
                    return res.json({
                        errorCode: 404,
                        success: false,
                        message: 'User Not found!'
                    });
                }

                const passwordIsValid = bcrypt.compareSync(password, user.password);

                if (!passwordIsValid) {
                    return res.json({ success: false, message: 'Wrong credentials' });
                } else {
                    session = req.session;
                    session.userName = user.username;
                    session.userId = user.id;
                    // console.log(req.session);
                    const authorities = [];
                    user.getRoles().then(async (roles) => {
                        for (let i = 0; i < roles.length; i++) {
                            authorities.push('ROLE_' + roles[i].name.toUpperCase());
                        }
                        console.log(authorities);

                        user.password = null;
                        user.roles = authorities;

                        const payload = {
                            id: user.id,
                            username: user.username
                        };

                        res.send({
                            success: true,
                            accessToken: await signAccessToken(payload),
                            refreshToken: await signRefreshToken(payload),
                            userInfo: user
                        });
                    });
                }

                // set accessToken

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
            })
            .catch((err) => {
                res.status(500).send({ message: err.messagey });
            });
    }

    // [POST] /auth/logout
    logout(req, res) {
        const accessToken = req.body.accessToken;
        console.log('🚀 ~ file: auth.controller.js:176 ~ AuthController ~ logout ~ accessToken:', accessToken);
        if (accessToken) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
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

export default AuthController;
