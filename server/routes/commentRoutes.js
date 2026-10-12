import { Router } from 'express';
import { createComment, getCommentsByPost, deleteComment, toggleCommentLike } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/:postId', getCommentsByPost); 
router.post('/', verifyToken, createComment); 
router.delete('/:id', verifyToken, deleteComment); 
router.post('/like', verifyToken, toggleCommentLike); // Роут лайка комментария

export default router;
