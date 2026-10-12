import pool from '../config/db.js';

// 1. Получить историю сообщений конкретного диалога (с сортировкой)
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1) 
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка getMessages:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении сообщений' });
  }
};

// 2. Отправить новое текстовое сообщение в диалог
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content || !content.trim()) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    const result = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (\$1, \$2, \$3) RETURNING *',
      [senderId, receiver_id, content.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка sendMessage:', error);
    res.status(500).json({ error: 'Ошибка сервера при отправке сообщения' });
  }
};

// 3. Отметить входящие сообщения открытого диалога как прочитанные
export const markAsRead = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const senderId = req.params.senderId;

    await pool.query(
      'UPDATE messages SET is_read = true WHERE receiver_id = \$1 AND sender_id = \$2 AND is_read = false',
      [currentUserId, senderId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка markAsRead:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении статуса прочтения' });
  }
};

// 4. Удалить конкретное сообщение из истории переписки
export const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const messageId = req.params.messageId;

    // Защита: удалить можно только то сообщение, которое ты сам отправил
    const checkResult = await pool.query(
      'SELECT sender_id FROM messages WHERE id = \$1',
      [messageId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }

    if (checkResult.rows[0].sender_id.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'Вы можете удалять только свои сообщения' });
    }

    await pool.query('DELETE FROM messages WHERE id = \$1', [messageId]);
    res.json({ success: true, message: 'Сообщение успешно удалено' });
  } catch (error) {
    console.error('Ошибка deleteMessage:', error);
    res.status(500).json({ error: 'Ошибка сервера при удалении сообщения' });
  }
};
// 5. Получить список пользователей, с которыми есть активные диалоги (JOIN)
export const getActiveChats = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await pool.query(`
      SELECT DISTINCT u.id, u.username, u.avatar_url, u.bio
      FROM users u
      JOIN messages m ON (m.sender_id = u.id AND m.receiver_id = $1) 
                      OR (m.receiver_id = u.id AND m.sender_id = $1)
      WHERE u.id != $1
      ORDER BY u.username ASC
    `, [currentUserId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка getActiveChats:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении списка чатов' });
  }
};

// 6. Получить количество непрочитанных сообщений для хедера и левых списков
export const getUnreadCounters = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM messages WHERE receiver_id = \$1 AND is_read = false',
      [currentUserId]
    );

    const listResult = await pool.query(
      'SELECT sender_id, COUNT(*)::int as count FROM messages WHERE receiver_id = \$1 AND is_read = false GROUP BY sender_id',
      [currentUserId]
    );

    res.json({
      total: totalResult.rows[0].count || 0,
      bySender: listResult.rows
    });
  } catch (error) {
    console.error('Ошибка getUnreadCounters:', error);
    res.status(500).json({ error: 'Ошибка сервера при подсчете счетчиков' });
  }
};

// 7. Получить превью последних сообщений для списка диалогов (Instagram/Telegram style)
export const getLastMessagesPreview = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await pool.query(`
      SELECT DISTINCT ON (CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END)
        id, sender_id, receiver_id, content, is_read, created_at
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY (CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END), created_at DESC
    `, [currentUserId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка getLastMessagesPreview:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении превью сообщений' });
  }
};
