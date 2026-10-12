import express from 'express';
import { 
  getMessages, 
  sendMessage, 
  getActiveChats, 
  getUnreadCounters, 
  markAsRead, 
  deleteMessage,
  getLastMessagesPreview
} from '../controllers/messageController.js';
import authMiddleware from '../middleware/authMiddleware.js'; // Убедись, что путь к твоему middleware верный

const router = express.Router();

// 1. СТРОГО ВЕРХНИЙ ПРИОРИТЕТ: Статические точные пути API
router.get('/active/list', authMiddleware, getActiveChats);
router.get('/unread/counters', authMiddleware, getUnreadCounters);
router.get('/preview/last', authMiddleware, getLastMessagesPreview);
router.put('/read/:senderId', authMiddleware, markAsRead);

// 2. НИЖНИЙ ПРИОРИТЕТ: Динамические роуты с переменными (параметрами) по ID
router.get('/:userId', authMiddleware, getMessages);
router.post('/', authMiddleware, sendMessage);
router.delete('/:messageId', authMiddleware, deleteMessage);

export default router;
