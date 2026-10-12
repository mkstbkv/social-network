import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router';
import { Feed } from './pages/Feed';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { UserPage } from './pages/UserPage';
import { Messages } from './pages/Messages';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SearchUsers } from './components/SearchUsers';
import { NotificationDropdown } from './components/NotificationDropdown';

function MainLayout({ token, user, handleLogout, children }: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Фоновое обновление счетчика непрочитанных сообщений
  useEffect(() => {
    if (!token || !user) return;

    const fetchTotalUnread = () => {
      fetch('http://localhost:5000/api/messages/unread-total', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setTotalUnreadMessages(data.total_unread || 0))
        .catch((err) => console.error(err));
    };

    fetchTotalUnread();
    const interval = setInterval(fetchTotalUnread, 5000);
    return () => clearInterval(interval);
  }, [token, user, location.pathname]);

  // Закрытие меню пользователя при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Слушаем сигнал из чата для мгновенного сброса цифры в шапке
  useEffect(() => {
    const handleMessagesRead = (e: Event) => {
      const customEvent = e as CustomEvent;
      const readCount = customEvent.detail?.count || 0;
      setTotalUnreadMessages((prev) => Math.max(0, prev - readCount));
    };

    window.addEventListener('messagesRead', handleMessagesRead);
    return () => window.removeEventListener('messagesRead', handleMessagesRead);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {token && user && (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5 gap-4">
            
            {/* ЛЕВАЯ ЧАСТЬ: Лента и Сообщения */}
            <nav className="flex items-center gap-6 font-semibold text-sm shrink-0">
              <Link to="/" className={`transition-colors flex items-center gap-1.5 ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                <span className="text-base">🏠</span>
                <span className="hidden sm:inline">Лента</span>
              </Link>
              
              <Link 
                to="/messages" 
                className={`relative transition-colors flex items-center gap-1.5 ${location.pathname === '/messages' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <span className="text-base">💬</span>
                <span className="hidden sm:inline">Сообщения</span>
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm shadow-rose-100">
                    {totalUnreadMessages}
                  </span>
                )}
              </Link>
            </nav>
            
            {/* СРЕДНЯЯ ЧАСТЬ: Центрированный красивый живой поиск */}
            <div className="flex-1 max-w-sm mx-auto flex justify-center">
              <SearchUsers token={token} />
            </div>

            {/* ПРАВАЯ ЧАСТЬ: Колокольчик + Выпадающее меню аккаунта */}
            <div className="flex items-center gap-4 shrink-0">
              <NotificationDropdown token={token} currentUserId={user.id} />

              {/* Профессиональный User Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 pr-2 border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all focus:outline-none"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-blue-50 overflow-hidden font-bold text-xs text-blue-600">
                    {user.avatar_url ? (
                      <img src={`http://localhost:5000${user.avatar_url}`} alt="Аватар" className="h-full w-full object-cover" />
                    ) : (
                      user.username.toUpperCase().substring(0, 2)
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700 hidden md:inline">
                    @{user.username}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden md:inline">▼</span>
                </button>

                {/* Выпадающее меню WhatsApp/Instagram-style */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl animate-fade-in">
                    <button 
                      onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                      className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span>👤</span> Мой Профиль
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button 
                      onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <span>🚪</span> Выйти из аккаунта
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </header>
      )}

      {/* ИСПРАВЛЕНО: Возвращен вывод внутренних страниц! */}
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, [token]);

  const handleLoginSuccess = (userToken: string, userData: any) => {
    setToken(userToken);
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <MainLayout token={token} user={user} handleLogout={handleLogout}>
      <Routes>
        <Route element={<ProtectedRoute token={token} />}>
          <Route path="/" element={user && <Feed token={token!} currentUserId={user.id} />} />
          <Route path="/profile" element={user && <Profile token={token!} user={user} onUserUpdate={(updatedUser) => setUser(updatedUser)} />} />
          <Route path="/user/:id" element={user && <UserPage token={token!} currentUserId={user.id} />} />
          <Route path="/messages" element={user && <Messages token={token!} currentUserId={user.id} />} />
        </Route>

        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
