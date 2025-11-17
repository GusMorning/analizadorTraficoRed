import { Router } from 'express';
import { handleCreateTest, handleGetTestDetail, handleListTests } from '../controllers/testController.js';
import { handleNetworkScan, handlePortScan } from '../controllers/networkController.js';
import { handleSpeedtest } from '../controllers/speedtestController.js';

const router = Router();

router.post('/tests', handleCreateTest);
router.get('/tests', handleListTests);
router.get('/tests/:id', handleGetTestDetail);
router.get('/scan', handleNetworkScan);
router.get('/port-scan', handlePortScan);
router.get('/speedtest', handleSpeedtest);

export default router;
