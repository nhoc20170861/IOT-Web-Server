import { Router } from 'express';
import apiV1 from './v1';
import apiV2 from './v2';
const routes = Router();

routes.use('/v1', apiV1);
routes.use('/api', apiV2);

export default routes;
