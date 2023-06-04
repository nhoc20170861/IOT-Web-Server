// import modules
const db = require('../../models');
const User = db.user;
import { signAccessToken } from '../../middlewares/handleJwt';
class AdminController {
    // [PUT] /api/admin/changepassword
    changePassword = (req, res, next) => {
        const { currentPassword, newPassword, passwordConfirm } = req.body;
        if (newPassword.length < 6) {
            return res.send({
                success: false,
                message: 'Passwords must have 6 characters'
            });
        } else if (newPassword !== passwordConfirm) {
            return res.send({
                success: false,
                message: 'Passwords do not match'
            });
        } else {
            // Check Username
            User.findOne({
                where: {
                    username: username
                }
            }).then(async (user) => {
                var passwordIsValid = bcrypt.compareSync(currentPassword, user.password);

                if (!passwordIsValid) {
                    return res.send({
                        success: false,
                        message: 'Current Password is wrong!'
                    });
                }
                console.log(user.id);
                console.log(user.username);
                (user.password = bcrypt.hashSync(req.body.newPassword, 8)),
                    await user
                        .save()
                        .then(() => {
                            return res.send({
                                success: true,
                                message: 'change password successed!'
                            });
                        })
                        .catch((err) => {
                            return res.status(500).send({ message: err.message });
                        });
            });
        }
    };

    // [GET] /api/auth/refreshtoken
    refreshToken(req, res) {
        const userId = req.userId;
        const username = req.userName;
        User.findOne({
            where: {
                username: username
            }
        })
            .then(async (user) => {
                const accessToken = await signAccessToken({
                    id: user.id,
                    username: user.username
                });
                // update access_token
                res.status(200).send({
                    success: true,
                    accessToken: accessToken,
                    message: 'refresh token success'
                });
            })
            .catch((err) => {
                return res.send(err);
            });
    }
}

export default AdminController;
