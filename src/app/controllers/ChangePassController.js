var jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const User = db.user;
var username;
class ChangePassController {
    // [GET] /changePassword
    getForm(req, res) {
        username = req.userName;
        return res.render('changePassword', {
            user_name: username,
        });
    }


    changePassword = (req, res, next) => {
        console.log(req.body);
        let access_token = req.cookies.access_token;
        if (!access_token) {
            return res.status(403).send({
                message: 'No token provided!',
            });
        }
        const { currentPassword, newPassword, passwordConfirm } = req.body;
        if (newPassword.length < 6) {
            return res.render('changePassword', {
                message: 'Passwords must have 6 characters',
            });
        } else if (newPassword !== passwordConfirm) {
            return res.render('changePassword', {
                message: 'Passwords do not match',
            });
        } else {
            // Check Username
            User.findOne({
                where: {
                    username: username,
                },
            }).then(async (user) => {

                var passwordIsValid = bcrypt.compareSync(
                    currentPassword,
                    user.password,
                );

                if (!passwordIsValid) {
                    return res.render('changePassword', {
                        message: 'Current Password is wrong!',
                    });
                }
                console.log(user.id);
                console.log(user.username);
                user.password= bcrypt.hashSync(req.body.newPassword, 8),
    
                await user.save()
                .then(()=>{
                    return res.render('changePassword', {
                        message: 'change password successed!',
                    });
                })
                .catch((err) => {
                    return res.status(500).send({ message: err.message });
                });



            });
        }
    };
}
module.exports = new ChangePassController();