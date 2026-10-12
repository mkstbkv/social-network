import { Router } from 'express';
import { sendMessage, getChatHistory, getActiveChats, getTotalUnreadCount, deleteMessage } from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/', verifyToken, sendMessage); 
router.get('/unread-total', verifyToken, getTotalUnreadCount); 
router.get('/active', verifyToken, getActiveChats); 
router.get('/:userId', verifyToken, getChatHistory); 
router.delete('/:id', verifyToken, deleteMessage); // Роут удаления сообщения

export default router;
