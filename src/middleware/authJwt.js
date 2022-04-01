const jwt = require('jsonwebtoken');
const db = require('../app/models');
const User = db.user;

verifyToken = (req, res, next) => {
<<<<<<< HEAD
    //req.headers['authorization']
    //let access_token = req.headers["x-access-token"];
    let access_token = req.cookies.access_token;
=======
    
    let access_token = req.cookies.token;
>>>>>>> 8690622a0b8d0514324a0f8486d1d154e18abfda
    if (!access_token) {
        return res.status(403).send({
            message: 'No token provided!',
        });
    }
    console.log(access_token);

    jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                return res.redirect('/auth/login');
            }
            req.userId = decoded.id;
            req.userName = decoded.username;
            next();
        },
    );
};

verify_refreshToken = (req, res, next) => {
    let refresh_token = req.cookies.refresh_token;
    if (!refresh_token) {
        return res.status(403).send({
            message: 'No refresh token provided!',
        });
    }

    jwt.verify(
        refresh_token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                return res.status(403).send({
                    message: err,
                });
            }
            req.userId = decoded.id;
            req.userName = decoded.username;
            next();
        },
    );
};

isAdmin = (req, res, next) => {
    User.findByPk(req.userId).then((user) => {
        user.getRoles().then((roles) => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === 'admin') {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: 'Require Admin Role!',
            });
            return;
        });
    });
};

isModerator = (req, res, next) => {
    User.findByPk(req.userId).then((user) => {
        user.getRoles().then((roles) => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === 'moderator') {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: 'Require Moderator Role!',
            });
        });
    });
};

isModeratorOrAdmin = (req, res, next) => {
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
                message: 'Require Moderator or Admin Role!',
            });
        });
    });
};

const authJwt = {
    verifyToken: verifyToken,
    verify_refreshToken: verify_refreshToken,
    isAdmin: isAdmin,
    isModerator: isModerator,
    isModeratorOrAdmin: isModeratorOrAdmin,
};
module.exports = authJwt;
