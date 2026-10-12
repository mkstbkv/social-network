import { Router } from 'express';
import { getNotifications, markNotificationsAsRead, deleteAllNotifications } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, getNotifications);
router.put('/read', verifyToken, markNotificationsAsRead);
router.delete('/clear', verifyToken, deleteAllNotifications); // Роут теперь видит функцию!

export default router;
