import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, bio }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка при регистрации');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100">
      <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">Регистрация</h2>
      
      {error && <div className="mt-4 rounded-lg bg-rose-50 p-3 text-center text-sm font-medium text-rose-600">⚠️ {error}</div>}
      {success && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-600">🎉 Успешно! Входим...</div>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input type="text" placeholder="Имя пользователя (@username)" value={username} onChange={(e) => setUsername(e.target.value)} required className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <textarea placeholder="О себе (необязательно)" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        
        <button type="submit" className="mt-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-[0.98]">
          Зарегистрироваться
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-semibold text-blue-600 cursor-pointer hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
};
