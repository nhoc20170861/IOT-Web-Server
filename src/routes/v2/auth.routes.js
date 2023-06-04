import { Router } from 'express';
import verifySignUp from '../../middlewares/verifySignUp';

import AuthController from '../../controllers/v2/auth.controller';
const authController = new AuthController();
const router = Router();

router.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
    next();
});

router.post('/register', [verifySignUp.checkDuplicateUsernameOrEmail, verifySignUp.checkRolesExisted], authController.register);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

export default router;
