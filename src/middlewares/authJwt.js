// JWT store in cookie for server side render

const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;

const verifyToken = (req, res, next) => {
    //req.headers['authorization']
    //let access_token = req.headers["x-access-token"];
    let access_token = req.cookies.access_token;
    if (!access_token) {
        // return res.status(403).send({
        //     message: 'No token provided!'
        // });
        return res.redirect('/v1/home');
    }
    // console.log(access_token);

    jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.redirect('/v1/auth/login');
        }
        req.userId = decoded.id;
        req.userName = decoded.username;
        next();
    });
};

const verify_refreshToken = (req, res, next) => {
    let refresh_token = req.cookies.refresh_token;
    if (!refresh_token) {
        return res.status(403).send({
            message: 'No refresh token provided!'
        });
    }

    jwt.verify(refresh_token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({
                message: err
            });
        }
        req.userId = decoded.id;
        req.userName = decoded.username;
        next();
    });
};

const isAdmin = (req, res, next) => {
    User.findByPk(req.userId).then((user) => {
        user.getRoles().then((roles) => {
            console.log('🚀 ~ file: authJwt.js:57 ~ user.getRoles ~ roles:', roles);
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === 'admin') {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: 'Require Admin Role!'
            });
            return;
        });
    });
};

const isModerator = (req, res, next) => {
    User.findByPk(req.userId).then((user) => {
        user.getRoles().then((roles) => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === 'moderator') {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: 'Require Moderator Role!'
            });
        });
    });
};

const isModeratorOrAdmin = (req, res, next) => {
    User.findByPk(req.userId).then((user) => {
        user.getRoles().then((roles) => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === 'moderator') {
                    next();
                    return;
                }

                if (roles[i].name === 'admin') {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: 'Require Moderator or Admin Role!'
            });
        });
    });
};

const authJwt = {
    verifyToken: verifyToken,
    verify_refreshToken: verify_refreshToken,
    isAdmin: isAdmin,
    isModerator: isModerator,
    isModeratorOrAdmin: isModeratorOrAdmin
};
module.exports = authJwt;
