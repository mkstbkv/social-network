import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createPost, getPosts, toggleLike, deletePost, getUserPosts, updatePost } from '../controllers/postController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    // Грамотный текст ошибки для бэкенда
    cb(new Error('Выбранный файл не является поддерживаемым изображением. Пожалуйста, выберите файл в формате JPG, PNG, WEBP или GIF.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 МБ
});

// Безопасный перехват ошибок Multer с понятными ответами
const uploadWrapper = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой. Пожалуйста, выберите изображение размером менее 5 МБ.' });
      }
      return res.status(400).json({ error: 'Произошла ошибка при загрузке файла. Попробуйте выбрать другое изображение.' });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.get('/', getPosts);       
router.get('/user/:userId', verifyToken, getUserPosts); // Добавили проверку токена
router.post('/', verifyToken, uploadWrapper, createPost);     
router.post('/like', verifyToken, toggleLike); 
router.delete('/:id', verifyToken, deletePost); 
router.put('/:id', verifyToken, updatePost); 

export default router;
