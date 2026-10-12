import pool from '../config/db.js';

// 1. Переключение подписки (Подписаться / Отписаться + АВТОУВЕДОМЛЕНИЕ)
export const toggleFollow = async (req, res) => {
  try {
    const { following_id } = req.body;
    const follower_id = req.user.id;

    if (!following_id) {
      return res.status(400).json({ error: 'following_id обязателен' });
    }

    if (parseInt(following_id) === follower_id) {
      return res.status(400).json({ error: 'Вы не можете подписаться на самого себя' });
    }

    const existingFollow = await pool.query(
      'SELECT * FROM follows WHERE follower_id = \$1 AND following_id = \$2',
      [follower_id, following_id]
    );

    if (existingFollow.rows.length > 0) {
      await pool.query(
        'DELETE FROM follows WHERE follower_id = \$1 AND following_id = \$2',
        [follower_id, following_id]
      );
      
      await pool.query(
        'DELETE FROM notifications WHERE user_id = \$1 AND sender_id = \$2 AND type = \'follow\'',
        [following_id, follower_id]
      );

      return res.json({ message: 'Вы успешно отписались', isFollowing: false });
    } else {
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES (\$1, \$2)',
        [follower_id, following_id]
      );

      await pool.query(
        'INSERT INTO notifications (user_id, sender_id, post_id, type) VALUES (\$1, \$2, NULL, \'follow\')',
        [following_id, follower_id]
      );

      return res.json({ message: 'Вы успешно подписались', isFollowing: true });
    }
  } catch (error) {
    console.error('Ошибка при обработке подписки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 2. Получение постов пользователей, на которых подписан текущий юзер (Лента подписок)
export const getFollowedPosts = async (req, res) => {
  try {
    const current_user_id = req.user.id;

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
      WHERE posts.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = \$1
      )
      GROUP BY posts.id, users.username, users.avatar_url, posts.user_id
      ORDER BY posts.created_at DESC
    `, [current_user_id]);

    res.json(posts.rows);
  } catch (error) {
    console.error('Ошибка при получении ленты подписок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
