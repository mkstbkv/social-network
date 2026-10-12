import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля' });
    }

    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = \$1 OR username = \$2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email или username уже существует' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, bio) VALUES (\$1, \$2, \$3, \$4) RETURNING id, username, email',
      [username, email, hashedPassword, bio || null]
    );

    res.status(201).json({ message: 'Успешно зарегистрирован', user: newUser.rows[0] });
  } catch (error) {
    // КРИТИЧЕСКИ ВАЖНО: Выводим полную ошибку в терминал хостинга
    console.error('Критическая ошибка при регистрации пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
  }
};

// 2. АВТОРИЗАЦИЯ (ЛОГИН)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const userRes = await pool.query(`
      SELECT 
        id, username, email, password, bio, avatar_url,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = users.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = users.id) AS following_count
      FROM users WHERE email = $1
    `, [email]);

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatar_url,
        followers_count: user.followers_count,
        following_count: user.following_count
      }
    });
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 3. ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
export const getUsers = async (req, res) => {
  try {
    const users = await pool.query('SELECT id, username, email, bio, avatar_url, created_at FROM users');
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 4. ОБНОВЛЕНИЕ ОПИСАНИЯ ПРОФИЛЯ (ИСПРАВЛЕНО rows[0])
export const updateProfile = async (req, res) => {
  try {
    const { bio } = req.body;
    const user_id = req.user.id;

    await pool.query('UPDATE users SET bio = \$1 WHERE id = \$2', [bio, user_id]);

    const updatedUser = await pool.query(`
      SELECT 
        id, username, email, bio, avatar_url,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = users.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = users.id) AS following_count
      FROM users WHERE id = $1
    `, [user_id]);

    // ОТДАЕМ СТРОГО ОБЪЕКТ ПЕРВОЙ СТРОКИ
    res.json({ message: 'Профиль успешно обновлен', user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};


// 5. ОБНОВЛЕНИЕ АВАТАРКИ (ИСПРАВЛЕНО rows[0])
export const updateAvatar = async (req, res) => {
  try {
    const user_id = req.user.id;
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const avatar_url = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = \$1 WHERE id = \$2', [avatar_url, user_id]);

    const updatedUser = await pool.query(`
      SELECT 
        id, username, email, bio, avatar_url,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = users.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = users.id) AS following_count
      FROM users WHERE id = $1
    `, [user_id]);

    // СТРОГО ОТДАЕМ ПЕРВУЮ СТРОКУ (ОБЪЕКТ), ЧТОБЫ ФРОНТЕНД СРАЗУ ОБНОВИЛ КАРТИНКУ
    res.json({ message: 'Аватарка успешно обновлена', user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Ошибка при обновлении аватарки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};


// 6. ПОЛУЧЕНИЕ ПРОФИЛЯ ПО ID
export const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const current_user_id = req.user.id;

    const userRes = await pool.query(`
      SELECT 
        id, username, email, bio, avatar_url, created_at,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = users.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = users.id) AS following_count
      FROM users WHERE id = $1
    `, [id]);

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    
    const user = userRes.rows[0];
    const followCheck = await pool.query('SELECT * FROM follows WHERE follower_id = \$1 AND following_id = \$2', [current_user_id, id]);
    
    res.json({ user, isFollowing: followCheck.rows.length > 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 7. ПОИСК ПОЛЬЗОВАТЕЛЕЙ
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const result = await pool.query('SELECT id, username, email, bio, avatar_url FROM users WHERE username ILIKE \$1 LIMIT 5', [`%${query}%`]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 8. ПОЛУЧИТЬ СПИСОК ПОДПИСЧИКОВ ПОЛЬЗОВАТЕЛЯ (FOLLOWERS)
export const getUserFollowers = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT users.id, users.username, users.avatar_url, users.bio
      FROM follows
      JOIN users ON follows.follower_id = users.id
      WHERE follows.following_id = $1
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении подписчиков:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 9. ПОЛУЧИТЬ СПИСОК ПОДПИСОК ПОЛЬЗОВАТЕЛЯ (FOLLOWING)
export const getUserFollowing = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT users.id, users.username, users.avatar_url, users.bio
      FROM follows
      JOIN users ON follows.following_id = users.id
      WHERE follows.follower_id = $1
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении подписок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
// 10. ПОЛУЧИТЬ ID ПОЛЬЗОВАТЕЛЯ ПО ЕГО НИКНЕЙМУ (ДЛЯ КЛИКОВ НА @МЕНШЕНЫ)
// Поиск пользователя по юзернейму (с поддержкой пробелов и кодировки)
export const getUserByUsername = async (req, res) => {
  try {
    const rawUsername = req.params.username;
    const username = decodeURIComponent(rawUsername).trim();

    const userResult = await pool.query(
      'SELECT id, username, email, bio, avatar_url, (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count, (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const profileUser = userResult.rows[0];
    let isFollowing = false;

    if (req.user && req.user.id !== profileUser.id) {
      const followCheck = await pool.query(
        'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, profileUser.id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    res.json({ user: profileUser, isFollowing });
  } catch (error) {
    console.error('Ошибка поиска по юзернейму:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Получить список всех пользователей системы для мессенджера
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    // Вытаскиваем всех, кроме самого себя, чтобы разгрузить фильтрацию на фронте
    const result = await pool.query(
      'SELECT id, username, avatar_url, bio FROM users WHERE id != $1 ORDER BY username ASC',
      [currentUserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка getAllUsers:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении списка пользователей' });
  }
};
