import { Router } from 'express';
import { toggleFollow, getFollowedPosts } from '../controllers/followController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Зарегистрировали правильные эндпоинты подписок
router.post('/toggle', verifyToken, toggleFollow);
router.get('/feed', verifyToken, getFollowedPosts); // Название функции теперь строго совпадает!

export default router;
