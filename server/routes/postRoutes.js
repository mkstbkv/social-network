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
    // Сохраняем оригинальное расширение файла с телефона
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // ИСПРАВЛЕНО: Расширили список мобильных форматов, включая .heic, .heif и сырые файлы камер
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const ext = path.extname(file.originalname).toLowerCase();

  // Одобряем файл, если расширение подходит или MIME-тип на сервере определяется как изображение
  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Выбранный файл не поддерживается. Пожалуйста, выберите изображение в формате JPG, PNG, WEBP, GIF или HEIC.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // ИСПРАВЛЕНО: Увеличили лимит до 50 МБ под тяжелые фотографии
});

// Безопасный перехват ошибок Multer с понятными ответами
const uploadWrapper = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        // ИСПРАВЛЕНО: Текст ошибки теперь синхронизирован с новым лимитом в 50 МБ
        return res.status(400).json({ error: 'Файл слишком большой. Пожалуйста, выберите изображение размером менее 50 МБ.' });
      }
      return res.status(400).json({ error: 'Произошла ошибка при загрузке файла. Попробуйте выбрать другое изображение.' });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.get('/', getPosts);       
router.get('/user/:userId', verifyToken, getUserPosts); 
router.post('/', verifyToken, uploadWrapper, createPost);     
router.post('/like', verifyToken, toggleLike); 
router.delete('/:id', verifyToken, deletePost); 
router.put('/:id', verifyToken, updatePost); 

export default router;