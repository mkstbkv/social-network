import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { API_URL } from '../api';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert('Заполните все поля');
      return;
    }

    fetch(API_URL + '/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Пользователь с таким никнеймом или email уже существует');
        return res.json();
      })
      .then(() => {
        alert('Регистрация успешна! Войдите в аккаунт.');
        navigate('/login');
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <span className="text-3xl mb-1">🚀</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Регистрация аккаунта</h2>
          <p className="text-xs text-slate-400 mt-1">Присоединяйтесь к нашей сети</p>
        </div>
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Имя пользователя</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ivan_dev" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email адрес</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@mail.com" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <button type="submit" className="mt-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
            Создать аккаунт
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Уже есть профиль?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  );
};
