const db = require('../models');
const jwt = require('jsonwebtoken');
const ROLES = db.ROLES;
const User = db.user;

const checkDuplicateUsernameOrEmail = (req, res, next) => {
    console.log(req.body);
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({
            errorCode: 400,
            success: false,
            message: 'Bad requsest'
        });
    else {
        // Check Username
        User.findOne({
            where: {
                username: username
            }
        }).then((user) => {
            if (user) {
                return res.send({
                    success: false,
                    message: 'Failed! Username is already in use!'
                });
            }

            // Check Email
            User.findOne({
                where: {
                    email: email
                }
            }).then((user) => {
                if (user) {
                    return res.send({
                        success: false,
                        message: 'Failed! Email is already in use!'
                    });
                }

                next();
            });
        });
    }
};

const checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        let roles = ['user'];
        if (req.body.roles === 'admin') roles.push(req.body.roles);
        console.log(roles);
        for (let i = 0; i < roles.length; i++) {
            if (!ROLES.includes(roles[i])) {
                res.status(400).send({
                    message: 'Failed! Role does not exist = ' + req.body.roles[i]
                });
                return;
            }
        }
        req.body.roles = roles;
    }

    next();
};

const verifySignUp = {
    checkDuplicateUsernameOrEmail: checkDuplicateUsernameOrEmail,
    checkRolesExisted: checkRolesExisted
};

module.exports = verifySignUp;
