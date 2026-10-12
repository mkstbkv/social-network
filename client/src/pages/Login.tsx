import React, { useState } from 'react';
import { Link } from 'react-router';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Неверный email или пароль');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100">
      <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">Вход в сеть</h2>
      
      {error && <div className="mt-4 rounded-lg bg-rose-50 p-3 text-center text-sm font-medium text-rose-600">⚠️ {error}</div>}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <input 
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required 
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" 
        />
        <input 
          type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required 
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" 
        />
        <button type="submit" className="mt-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-[0.98]">
          Войти
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-semibold text-blue-600 hover:underline">
          Создать аккаунт
        </Link>
      </p>
    </div>
  );
};
