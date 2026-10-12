import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  getUsers, 
  registerUser, 
  loginUser, 
  updateProfile, 
  getUserProfileById, 
  searchUsers,
  updateAvatar,
  getUserFollowers,
  getUserFollowing,
  getUserByUsername // ИСПРАВЛЕНО: Теперь функция импортирована!
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Конфигурация multer для аватарок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'avatar-' + Date.now() + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 МБ
});

// 1. Текстовые и статические эндпоинты
router.get('/', getUsers);
router.get('/search', verifyToken, searchUsers);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/profile', verifyToken, updateProfile);

// ИСПРАВЛЕНО: Роут поиска по никнейму (стоит СТРОГО выше динамического :id)
router.get('/by-username/:username', verifyToken, getUserByUsername);

// 2. Роут для загрузки медиафайлов
router.post('/avatar', verifyToken, upload.single('avatar'), updateAvatar);

// 3. Подписки и подписчики
router.get('/:id/followers', verifyToken, getUserFollowers);
router.get('/:id/following', verifyToken, getUserFollowing);

// 4. Динамический роут профиля (СТРОГО В САМЫЙ КОНЕЦ)
router.get('/:id', verifyToken, getUserProfileById);

export default router;
