import pool from '../config/db.js';

// 1. Получить все уведомления с ID автора поста (ОБНОВЛЕНО)
export const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(`
      SELECT 
        notifications.*, 
        users.username AS sender_username,
        users.avatar_url AS sender_avatar,
        posts.user_id AS post_author_id -- Вытягиваем ID автора поста!
      FROM notifications
      JOIN users ON notifications.sender_id = users.id
      LEFT JOIN posts ON notifications.post_id = posts.id
      WHERE notifications.user_id = $1
      ORDER BY notifications.created_at DESC
      LIMIT 20
    `, [user_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 2. Отметить все уведомления как прочитанные
export const markNotificationsAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = \$1', [user_id]);
    res.json({ message: 'Уведомления отмечены как прочитанные' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// 3. Полное удаление всех уведомлений
export const deleteAllNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;
    await pool.query('DELETE FROM notifications WHERE user_id = \$1', [user_id]);
    res.json({ message: 'Все уведомления успешно удалены' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
