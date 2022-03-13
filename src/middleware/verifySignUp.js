const db = require('../app/models');
const jwt = require('jsonwebtoken');
const ROLES = db.ROLES;
const User = db.user;

checkDuplicateUsernameOrEmail = (req, res, next) => {
    console.log(req.body);
    const { username, email, password, passwordConfirm } = req.body;
    if (password.length < 6) {
        return res.render('register', {
            message: 'Passwords must have 6 characters',
        });
    } else if (password !== passwordConfirm) {
        return res.render('register', {
            message: 'Passwords do not match',
        });
    } else {
        // Check Username
        User.findOne({
            where: {
                username: username,
            },
        }).then((user) => {
            if (user) {
                // res.status(400).send({
                //     message: 'Failed! Username is already in use!',
                // });
                return res.render('register', {
                    message: 'Failed! Username is already in use!',
                });
            }

            // Check Email
            User.findOne({
                where: {
                    email: email,
                },
            }).then((user) => {
                if (user) {
                    return res.render('register', {
                        message: 'Failed! Email is already in use!',
                    });
                }

                next();
            });
        });
    }
};

checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        let roles = ['user'];
        if(req.body.roles ==='admin')
            roles.push(req.body.roles);
        console.log(roles);
        for (let i = 0; i < roles.length; i++) {
            if (!ROLES.includes(roles[i])) {
                res.status(400).send({
                    message:
                        'Failed! Role does not exist = ' + req.body.roles[i],
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
    checkRolesExisted: checkRolesExisted,
};

module.exports = verifySignUp;
