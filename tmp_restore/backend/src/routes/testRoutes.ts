import { Router } from 'express';
import { handleCreateTest, handleGetTestDetail, handleListTests } from '../controllers/testController.js';

const router = Router();

router.post('/tests', handleCreateTest);
router.get('/tests', handleListTests);
router.get('/tests/:id', handleGetTestDetail);

export default router;
