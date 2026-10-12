import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import followRoutes from './routes/followRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; // Импортируем роуты чата

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: 'https://social-network-app-cymb.onrender.com', // Ссылка на твой Static Site
  credentials: true
}));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// Маршруты приложения
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes); // Регистрируем эндпоинт сообщений

app.get('/', (req, res) => {
  res.send('API Социальной сети успешно запущено!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});
