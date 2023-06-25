import { Router, Request, Response } from 'express';
import auth from './auth.routes';
import user from './user.routes';
import ros from './ros.routes';

const routes = Router();

routes.use('/auth', auth);
routes.use('/user', user);
routes.use('/ros', ros);
export default routes;
