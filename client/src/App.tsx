import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { UserPage } from './pages/UserPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotificationDropdown } from './components/NotificationDropdown';
import { API_URL } from './api'; // ИМПОРТИРУЕМ НАШ НАДЁЖНЫЙ URL

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {token && user && (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            {/* Логотип */}
            <Link to="/" className="flex items-center gap-1.5 focus:outline-none select-none">
              <span className="text-xl">⚡</span>
              <span className="text-sm font-black uppercase tracking-wider text-slate-900">Social Net</span>
            </Link>

            {/* Меню навигации и Профиль */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Лента</Link>
              
              {/* Колокольчик уведомлений с передачей текущего ID */}
              <NotificationDropdown token={token} currentUserId={user.id} />

              <div className="h-5 w-[1px] bg-slate-200"></div>

              {/* Аватарка в шапке склеивается с облачным API_URL */}
              <Link to="/profile" className="flex items-center gap-2 group focus:outline-none">
                <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-xs transition-transform group-hover:scale-105">
                  {user.avatar_url ? (
                    <img src={API_URL + user.avatar_url} alt="Аватар" className="h-full w-full object-cover" />
                  ) : (
                    user.username ? user.username.toUpperCase().substring(0, 2) : 'US'
                  )}
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-blue-600 transition-colors hidden sm:inline">
                  @{user.username}
                </span>
              </Link>

              <button onClick={handleLogout} className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors">
                Выйти
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-4xl p-4">
        <Routes>
          <Route path="/" element={token && user ? <Feed token={token} currentUserId={user.id} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={token && user ? <Profile token={token} user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" />} />
          <Route path="/user/:id" element={token && user ? <UserPage token={token} currentUserId={user.id} /> : <Navigate to="/login" />} />
          <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
