import pool from '../config/db.js';

// 1. Добавление комментария или ответа + Живые упоминания и уведомления с comment_id
export const createComment = async (req, res) => {
  try {
    const { post_id, content, parent_id } = req.body;
    const user_id = req.user.id;

    if (!post_id || !content) {
      return res.status(400).json({ error: 'ID поста и текст комментария обязательны' });
    }

    const newComment = await pool.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
      [post_id, user_id, content, parent_id || null]
    );

    const commentId = newComment.rows[0].id;

    // УВЕДОМЛЕНИЕ 1: Если это ответ на комментарий
    if (parent_id) {
      const parentCommentRes = await pool.query('SELECT user_id FROM comments WHERE id = \$1', [parent_id]);
      const parent_comment_author_id = parentCommentRes.rows[0]?.user_id;

      if (parent_comment_author_id && parent_comment_author_id !== user_id) {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [parent_comment_author_id, user_id, post_id, commentId, 'reply']
        );
      }
    } else {
      // УВЕДОМЛЕНИЕ 2: Обычный комментарий под постом
      const postAuthorRes = await pool.query('SELECT user_id FROM posts WHERE id = \$1', [post_id]);
      const post_author_id = postAuthorRes.rows[0]?.user_id;

      if (post_author_id && post_author_id !== user_id) {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [post_author_id, user_id, post_id, commentId, 'comment']
        );
      }
    }

    // УВЕДОМЛЕНИЕ 3: Поиск упоминания через @username
    const mentionMatch = content.match(/@([a-zA-Z0-9_]+)/);
    if (mentionMatch) {
      const mentionedUsername = mentionMatch[1];
      const mentionedUserRes = await pool.query('SELECT id FROM users WHERE username = \$1', [mentionedUsername]);
      const mentioned_user_id = mentionedUserRes.rows[0]?.id;

      if (mentioned_user_id && mentioned_user_id !== user_id) {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [mentioned_user_id, user_id, post_id, commentId, 'mention']
        );
      }
    }

    res.status(201).json(newComment.rows);
  } catch (error) {
    console.error('Ошибка при создании комментария:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 2. Получение комментариев
export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let current_user_id = null;

    if (token) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        current_user_id = verified.id;
      } catch (e) {}
    }

    const comments = await pool.query(`
      SELECT 
        comments.id, comments.content, comments.created_at, comments.user_id, comments.parent_id,
        users.username,
        COUNT(comment_likes.id)::int AS likes_count,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_likes.comment_id = comments.id AND comment_likes.user_id = $1)::boolean AS is_liked
      FROM comments
      JOIN users ON comments.user_id = users.id
      LEFT JOIN comment_likes ON comments.id = comment_likes.comment_id
      WHERE comments.post_id = $2
      GROUP BY comments.id, users.username
      ORDER BY comments.created_at ASC
    `, [current_user_id, postId]);

    res.json(comments.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 3. Удаление комментария
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const current_user_id = req.user.id;
    const commentRes = await pool.query(`
      SELECT comments.*, posts.user_id AS post_author_id 
      FROM comments 
      JOIN posts ON comments.post_id = posts.id 
      WHERE comments.id = $1
    `, [id]);
    if (commentRes.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
    const comment = commentRes.rows[0];
    if (comment.user_id !== current_user_id && comment.post_author_id !== current_user_id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    await pool.query('DELETE FROM comments WHERE id = \$1', [id]);
    res.json({ message: 'Успешно' });
  } catch (error) { res.status(500).json({ error: 'Ошибка сервера' }); }
};

// 4. Переключение лайка комментария + уведомление о лайке
export const toggleCommentLike = async (req, res) => {
  try {
    const { comment_id } = req.body;
    const user_id = req.user.id;

    if (!comment_id) return res.status(400).json({ error: 'comment_id обязателен' });

    const existingLike = await pool.query(
      'SELECT * FROM comment_likes WHERE user_id = \$1 AND comment_id = \$2',
      [user_id, comment_id]
    );

    if (existingLike.rows.length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE user_id = \$1 AND comment_id = \$2', [user_id, comment_id]);
      return res.json({ message: 'Лайк убран', liked: false });
    } else {
      await pool.query('INSERT INTO comment_likes (user_id, comment_id) VALUES (\$1, \$2)', [user_id, comment_id]);
      
      const commentAuthorRes = await pool.query('SELECT user_id, post_id FROM comments WHERE id = \$1', [comment_id]);
      const comment_author_id = commentAuthorRes.rows[0]?.user_id;
      const post_id = commentAuthorRes.rows[0]?.post_id;

      if (comment_author_id && comment_author_id !== user_id) {
        await pool.query(
          'INSERT INTO notifications (user_id, sender_id, post_id, comment_id, type) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [comment_author_id, user_id, post_id, comment_id, 'comment_like']
        );
      }

      return res.json({ message: 'Лайк поставлен', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
