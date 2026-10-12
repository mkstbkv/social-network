import pool from './config/db.js';
import bcrypt from 'bcrypt';

const seedData = async () => {
  try {
    console.log('Начало полной пересборки и наполнения базы данных...');

    // 1. Очищаем старые остатки, если они есть
    await pool.query('TRUNCATE TABLE comment_likes, likes, notifications, comments, follows, posts, users RESTART IDENTITY CASCADE;');

    // 2. Хешируем стандартный безопасный пароль
    const hashedPassword = await bcrypt.hash('123456', 10);

    // 3. Создаем двух классных демонстрационных пользователей
    const user1Res = await pool.query(
      'INSERT INTO users (username, email, password, bio) VALUES ($1, $2, $3, $4) RETURNING id, username',
      ['ivan_dev', 'ivan@mail.com', hashedPassword, 'Full-Stack Developer | Node.js & React']
    );

    const user2Res = await pool.query(
      'INSERT INTO users (username, email, password, bio) VALUES ($1, $2, $3, $4) RETURNING id, username',
      ['alex_code', 'alex@mail.com', hashedPassword, 'UI/UX Designer & Frontend Enthusiast']
    );

    const u1 = user1Res.rows[0].id;
    const u2 = user2Res.rows[0].id;
    const name1 = user1Res.rows[0].username;
    const name2 = user2Res.rows[0].username;

    console.log('✅ Пользователи @' + name1 + ' и @' + name2 + ' успешно созданы! (Пароль: 123456)');

    // 4. Создаем качественные публикации
    const post1 = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id',
      [u1, 'Разрабатывать Full-Stack приложения на стеке PERN (Postgres, Express, React, Node) — одно удовольствие. Архитектура получается гибкой, а типизация на фронтенде защищает от глупых ошибок. Кодим дальше! 🚀']
    );

    const post2 = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id',
      [u2, 'Сегодня разбирался с жизненным циклом хуков useEffect в React и оптимизацией запросов к серверу. Механизм Debounce — это просто спасение для живого поиска, бэкенд больше не ложится от спама! Кто сталкивался? 🖥️']
    );

    const post3 = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id',
      [u1, 'Уведомления Instagram-style и вложенные комментарии Threads-style готовы. Интерфейс оживает прямо на глазах, адаптивная вёрстка на Tailwind CSS выглядит потрясающе. Как вам фича? 🔥']
    );

    console.log('✅ Красивые посты добавлены в хронологическом порядке!');

    // 5. Генерируем связи (подписки, лайки и вложенные обсуждения)
    const p1_id = post1.rows[0].id;
    const p2_id = post2.rows[0].id;

    // Взаимная подписка
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [u1, u2]);
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [u2, u1]);

    // Лайки на публикации
    await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [u2, p1_id]);
    await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [u1, p2_id]);

    // Двухуровневые комментарии Threads-style
    const comment1 = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [p1_id, u2, 'Полностью согласен, стек мощнейший! Планируешь добавлять веб-сокеты для чата?']
    );

    const c1_id = comment1.rows[0].id;
    await pool.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4)',
      [p1_id, u1, '@' + name2 + ' Да, это в планах! Сделаем живой индикатор печати текста.', c1_id]
    );

    console.log('✅ Интерактивная активность (подписки, лайки, ответы) успешно сгенерирована!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при заполнении таблиц:', error);
    process.exit(1);
  }
};

seedData();
