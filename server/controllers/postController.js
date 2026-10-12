import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Получение всех постов с аватарками авторов, счетчиками лайков, комментов и проверкой лайка текущего юзера
export const getPosts = async (req, res) => {
  try {
    // Безопасно пытаемся достать id из токена, если он передан в заголовках, чтобы подсветить лайки
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let current_user_id = null;

    if (token) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        current_user_id = verified.id;
      } catch (e) {
        // Если токен невалидный или протух, просто отдаем посты без отметок лайков
      }
    }

    const posts = await pool.query(`
      SELECT 
        posts.id, posts.content, posts.image_url, posts.created_at, posts.user_id,
        users.username, users.avatar_url,
        COUNT(DISTINCT likes.id)::int AS likes_count,
        COUNT(DISTINCT comments.id)::int AS comments_count,
        -- Проверяем, лайкнул ли текущий пользователь этот пост (возвращает true/false)
        EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = \$1)::boolean AS is_liked
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      LEFT JOIN likes ON posts.id = likes.post_id
      LEFT JOIN comments ON posts.id = comments.post_id
      GROUP BY posts.id, users.username, users.avatar_url, posts.user_id
      ORDER BY posts.created_at DESC
    `, [current_user_id]);

    res.json(posts.rows);
  } catch (error) {
    console.error('Ошибка при получении постов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 2. Создание нового поста (С поддержкой картинок через multer)
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const user_id = req.user.id; 

    if (!content) {
      return res.status(400).json({ error: 'Текст поста обязателен' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const newPost = await pool.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES (\$1, \$2, \$3) RETURNING *',
      [user_id, content, image_url]
    );

    res.status(201).json(newPost.rows);
  } catch (error) {
    console.error('Ошибка при создании поста:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 3. Переключение лайка поста + АВТОМАТИЧЕСКОЕ УВЕДОМЛЕНИЕ
export const toggleLike = async (req, res) => {
  try {
    const { post_id } = req.body;
    const user_id = req.user.id; 

    if (!post_id) {
      return res.status(400).json({ error: 'post_id обязателен' });
    }

    const existingLike = await pool.query(
      'SELECT * FROM likes WHERE user_id = \$1 AND post_id = \$2',
      [user_id, post_id]
    );

    if (existingLike.rows.length > 0) {
      // Лайк уже есть — убираем его
      await pool.query('DELETE FROM likes WHERE user_id = \$1 AND post_id = \$2', [user_id, post_id]);
      return res.json({ message: 'Лайк убран', liked: false });
    } else {
      // Лайка нет — ставим его
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES (\$1, \$2)', [user_id, post_id]);
      
      // НАЧАЛО БЛОКА УВЕДОМЛЕНИЙ: Находим автора поста
      const postAuthorRes = await pool.query('SELECT user_id FROM posts WHERE id = \$1', [post_id]);
      const post_author_id = postAuthorRes.rows?.user_id;

      // Если лайк ставит НЕ сам автор поста — создаем уведомление в БД (comment_id равен NULL)
      if (post_author_id && post_author_id !== user_id) {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type) VALUES (\$1, \$2, \$3, NULL, \$4)',
          [post_author_id, user_id, post_id, 'like']
        );
      }
      // КОНЕЦ БЛОКА УВЕДОМЛЕНИЙ

      return res.json({ message: 'Лайк поставлен', liked: true });
    }
  } catch (error) {
    console.error('Ошибка при обработке лайка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 4. Безопасное удаление поста с физической очисткой файла с диска
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const postRes = await pool.query('SELECT * FROM posts WHERE id = \$1', [id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const post = postRes.rows[0]; // Берем объект первой строки

    if (post.user_id !== user_id) {
      return res.status(403).json({ error: 'Доступ запрещен. Вы можете удалять только свои посты.' });
    }

    // Если у поста была картинка, физически удаляем её из файловой системы сервера
    if (post.image_url) {
      const absolutePath = path.join(__dirname, '..', post.image_url);
      
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`Файл ${post.image_url} успешно удален с диска.`);
      }
    }

    await pool.query('DELETE FROM posts WHERE id = \$1', [id]);
    res.json({ message: 'Пост и файл успешно удалены', postId: id });
  } catch (error) {
    console.error('Ошибка при удалении поста:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 5. Посты конкретного пользователя с каскадными счетчиками активности и проверкой лайка
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const current_user_id = req.user?.id || null; // ID авторизованного юзера из токена

    const posts = await pool.query(`
      SELECT 
        posts.id, posts.content, posts.image_url, posts.created_at, posts.user_id,
        users.username, users.avatar_url,
        COUNT(DISTINCT likes.id)::int AS likes_count,
        COUNT(DISTINCT comments.id)::int AS comments_count,
        EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = \$1)::boolean AS is_liked
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      LEFT JOIN likes ON posts.id = likes.post_id
      LEFT JOIN comments ON posts.id = comments.post_id
      WHERE posts.user_id = \$2
      GROUP BY posts.id, users.username, users.avatar_url, posts.user_id
      ORDER BY posts.created_at DESC
    `, [current_user_id, userId]);

    res.json(posts.rows);
  } catch (error) {
    console.error('Ошибка при получении постов пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 6. Редактирование текста собственного поста
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Текст поста не может быть пустым' });
    }

    const postRes = await pool.query('SELECT * FROM posts WHERE id = \$1', [id]);

    if (postRes.rows.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const post = postRes.rows[0];

    if (post.user_id !== user_id) {
      return res.status(403).json({ error: 'Доступ запрещен. Вы можете редактировать только свои посты.' });
    }

    const updatedPost = await pool.query(
      'UPDATE posts SET content = \$1 WHERE id = \$2 RETURNING *',
      [content, id]
    );

    res.json({ message: 'Пост успешно обновлен', post: updatedPost.rows[0] });
  } catch (error) {
    console.error('Ошибка при обновлении поста:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
