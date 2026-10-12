import pool from '../config/db.js';

export const sendMessage = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user.id;

    if (!receiver_id || !content.trim()) {
      return res.status(400).json({ error: 'ID получателя и текст сообщения обязательны' });
    }

    if (sender_id === parseInt(receiver_id)) {
      return res.status(400).json({ error: 'Вы не можете отправить сообщение самому себе' });
    }

    const newMessage = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (\$1, \$2, \$3) RETURNING *',
      [sender_id, receiver_id, content]
    );

    res.status(201).json(newMessage.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const current_user_id = req.user.id;

    const history = await pool.query(`
      SELECT id, sender_id, receiver_id, content, is_read, created_at 
      FROM messages 
      WHERE (sender_id = \$1 AND receiver_id = \$2) 
         OR (sender_id = \$2 AND receiver_id = \$1)
      ORDER BY created_at ASC
    `, [current_user_id, userId]);

    await pool.query(`
      UPDATE messages SET is_read = TRUE 
      WHERE sender_id = \$1 AND receiver_id = \$2 AND is_read = FALSE
    `, [userId, current_user_id]);

    res.json(history.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const getActiveChats = async (req, res) => {
  try {
    const current_user_id = req.user.id;

    const chats = await pool.query(`
      SELECT 
        users.id, 
        users.username, 
        users.avatar_url,
        users.bio,
        (
          SELECT COUNT(*)::int 
          FROM messages 
          WHERE messages.sender_id = users.id 
            AND messages.receiver_id = \$1 
            AND messages.is_read = FALSE
        ) AS unread_count
      FROM users
      WHERE users.id IN (
        SELECT DISTINCT CASE 
          WHEN sender_id = \$1 THEN receiver_id 
          ELSE sender_id 
        END
        FROM messages
        WHERE sender_id = \$1 OR receiver_id = \$1
      )
    `, [current_user_id]);

    res.json(chats.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const getTotalUnreadCount = async (req, res) => {
  try {
    const current_user_id = req.user.id;

    const result = await pool.query(`
      SELECT COUNT(*)::int AS total_unread 
      FROM messages 
      WHERE receiver_id = \$1 AND is_read = FALSE
    `, [current_user_id]);

    res.json({ total_unread: result.rows[0].total_unread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const current_user_id = req.user.id;

    const messageRes = await pool.query('SELECT * FROM messages WHERE id = \$1', [id]);
    if (messageRes.rows.length === 0) return res.status(404).json({ error: 'Сообщение не найдено' });

    if (messageRes.rows[0].sender_id !== current_user_id) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await pool.query('DELETE FROM messages WHERE id = \$1', [id]);
    res.json({ message: 'Успешно', messageId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Получить количество непрочитанных сообщений для текущего пользователя
export const getUnreadCounters = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // 1. Суммарный счетчик для хедера
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false',
      [currentUserId]
    );

    // 2. Счетчики в разрезе каждого отправителя для левого списка
    const listResult = await pool.query(
      'SELECT sender_id, COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false GROUP BY sender_id',
      [currentUserId]
    );

    res.json({
      total: parseInt(totalResult.rows[0].count || 0),
      bySender: listResult.rows // Массив объектов [{sender_id: 1, count: 2}]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Отметить сообщения конкретного диалога как прочитанные
export const markAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const senderId = req.params.senderId;

    await pool.query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false',
      [currentUserId, senderId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
