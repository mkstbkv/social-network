import { Router } from 'express';
import { sendMessage, getChatHistory, getActiveChats, getTotalUnreadCount, deleteMessage, getUnreadCounters, markAsRead} from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/', verifyToken, sendMessage); 
router.get('/unread-total', verifyToken, getTotalUnreadCount); 
router.get('/active', verifyToken, getActiveChats); 
router.get('/:userId', verifyToken, getChatHistory); 
router.delete('/:id', verifyToken, deleteMessage); // Роут удаления сообщения
// Подставь свои названия middleware авторизации, если они называются иначе
router.get('/unread/counters', verifyToken, getUnreadCounters);
router.put('/read/:senderId', verifyToken, markAsRead);


export default router;
