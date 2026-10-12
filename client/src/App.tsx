import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router';
import { io } from 'socket.io-client'; // НОВОЕ
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { UserPage } from './pages/UserPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import Messages from './pages/Messages';
import { NotificationDropdown } from './components/NotificationDropdown';
import { API_URL } from './api';

// Инициализируем глобальный инстанс сокета для всего приложения
export const socket = io(API_URL, { autoConnect: false });

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  
  // Счётчик непрочитанных сообщений для хедера
  const [totalUnreadMessages, setTotalUnreadMessages] = useState<number>(0);
  const navigate = useNavigate();

  // Функция для запроса количества непрочитанных сообщений с сервера
  const fetchUnreadTotal = (authToken: string) => {
    fetch(API_URL + '/api/messages/unread/counters', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.total === 'number') {
          setTotalUnreadMessages(data.total);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedToken && savedUser && savedUser !== 'undefined') {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        fetchUnreadTotal(savedToken);
      } catch (e) {
        console.error('Ошибка парсинга сессии:', e);
      }
    }
    setCheckingAuth(false);
  }, []);

  // Управление сокет-соединением при входе пользователя в сеть
  useEffect(() => {
    if (token && user?.id) {
      socket.connect();
      socket.emit('register_user', user.id);
      fetchUnreadTotal(token);

      // В реальном времени слушаем команду бэкенда обновить счётчики
      socket.on('refresh_unread_counters', () => {
        fetchUnreadTotal(token);
      });

      return () => {
        socket.off('refresh_unread_counters');
        socket.disconnect();
      };
    }
  }, [token, user?.id]);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) return;
    socket.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setTotalUnreadMessages(0);
    navigate('/login');
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
  };

  if (checkingAuth) {
    return <div className="min-h-screen bg-slate-50" />;
  }
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {token && user && (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-1.5 focus:outline-none select-none">
              <span className="text-xl">⚡</span>
              <span className="text-sm font-black uppercase tracking-wider text-slate-900">Social Net</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Лента</Link>
              
              {/* ИСПРАВЛЕНО: Ссылка "Сообщения" теперь выводит красный круглый счётчик */}
              <Link to="/messages" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 relative">
                <span>💬</span> Сообщения
                {totalUnreadMessages > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm shadow-rose-200">
                    {totalUnreadMessages}
                  </span>
                )}
              </Link>
              
              <NotificationDropdown token={token} currentUserId={user.id} />

              <div className="h-5 w-[1px] bg-slate-200"></div>

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
          <Route path="/" element={token && user ? <Feed token={token} currentUserId={user.id} /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={token && user ? <Profile token={token} user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" replace />} />
          <Route path="/user/:id" element={token && user ? <UserPage token={token} currentUserId={user.id} /> : <Navigate to="/login" replace />} />
          
          {/* Передаём функцию обновления глобального счётчика сообщений внутрь страницы чатов */}
          <Route path="/messages" element={token && user ? <Messages token={token} currentUserId={user.id} onCounterRefresh={() => fetchUnreadTotal(token)} /> : <Navigate to="/login" replace />} />
          
          <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
