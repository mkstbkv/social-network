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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // ИСПРАВЛЕНО: Добавили профессиональный формат .dng в список разрешенных
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.dng'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'image/x-adobe-dng') {
    cb(null, true);
  } else {
    cb(new Error('Формат файла не поддерживается. Разрешены JPG, PNG, WEBP, GIF, HEIC и DNG RAW.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 МБ
});

const uploadWrapper = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // ИСПРАВЛЕНО: Теперь бэкенд возвращает четкую ошибку на русском языке, если файл больше 50 МБ
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Размер фотографии превышает 50 МБ! Пожалуйста, выберите файл меньшего размера.' });
      }
      return res.status(400).json({ error: 'Ошибка загрузки медиафайла. Попробуйте выбрать другое изображение.' });
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