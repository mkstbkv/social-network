import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Облако само выдаст эту ссылку
  ssl: {
    rejectUnauthorized: false // Обязательно для безопасных облачных баз данных
  }
});

//const pool = new Pool({
  //user: process.env.DB_USER,
  //password: process.env.DB_PASSWORD,
  //host: process.env.DB_HOST,
  //port: process.env.DB_PORT,
  //database: process.env.DB_DATABASE,
//});

// Проверка подключения к базе данных
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Ошибка подключения к PostgreSQL:', err.stack);
  }
  console.log('Успешное подключение к PostgreSQL');
  release();
});

export default pool;
