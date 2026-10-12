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

import verifyToken from '../middleware/auth.js'; // Убедись, что путь к твоему middleware верный

const router = express.Router();

// 1. СТРОГО ВЕРХНИЙ ПРИОРИТЕТ: Статические точные пути API
router.get('/active/list', verifyToken, getActiveChats);
router.get('/unread/counters', verifyToken, getUnreadCounters);
router.get('/preview/last', verifyToken, getLastMessagesPreview);
router.put('/read/:senderId', verifyToken, markAsRead);

// 2. НИЖНИЙ ПРИОРИТЕТ: Динамические роуты с переменными (параметрами) по ID
router.get('/:userId', verifyToken, getMessages);
router.post('/', verifyToken, sendMessage);
router.delete('/:messageId', verifyToken, deleteMessage);

export default router;
