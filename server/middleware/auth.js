import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const verifyToken = (req, res, next) => {
  // Токен обычно передается в заголовке Authorization: Bearer <TOKEN>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Доступ запрещен. Токен отсутствует.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Записываем декодированные данные (id пользователя) в объект запроса
    next(); // Передаем управление следующему методу (контроллеру)
  } catch (error) {
    res.status(403).json({ error: 'Неверный или просроченный токен.' });
  }
};
