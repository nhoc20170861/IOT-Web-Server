// import modules
//const mysql = require('mysql');
const db = require('../models');
const User = db.user;
const Role = db.role;

const Op = db.Sequelize.Op;

var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');

class RegisterController {
    // [GET] auth/register
    index(req, res) {
        res.render('register');
    }

    // [POST] /auth/registe
    signup(req, res) {
        // Save User to Database
        User.create({
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 8),
        })
            .then((user) => {
                if (req.body.roles) {
                    Role.findAll({
                        where: {
                            name: {
                                [Op.or]: req.body.roles,
                            },
                        },
                    }).then((roles) => {
                        user.setRoles(roles).then(() => {
                            return res.render('register', {
                                message: 'User was registered successfully!',
                            });
                        });
                    });
                } else {
                    // user role = 1
                    user.setRoles([1]).then(() => {
                        return res.render('register', {
                            message: 'User was registered successfully!',
                        });
                    });
                }
            })
            .catch((err) => {
                res.status(500).send({ message: err.message });
            });
    }
}

module.exports = new RegisterController();
