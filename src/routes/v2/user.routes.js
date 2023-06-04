import { Router } from 'express';

import { verifyTokenInHeaderReq, verifyRefreshToken } from '../../middlewares/handleJwt';
import AdminController from '../../controllers/v2/admin.controller';
const userController = new AdminController();
const router = Router();

router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
});

//Change my password
router.put('/change-password', [verifyTokenInHeaderReq], userController.changePassword);

//RefreshToken

router.post('/refreshtoken', [verifyRefreshToken], userController.refreshToken);

router.get('/all', [verifyTokenInHeaderReq], (req, res) => {
    return res.status(200).send({
        success: true,
        userId: req.userId,
        userName: req.userName
    });
});
export default router;
