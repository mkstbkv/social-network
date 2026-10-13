import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router';
import { io } from 'socket.io-client';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { UserPage } from './pages/UserPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import Messages from './pages/Messages';
import { NotificationDropdown } from './components/NotificationDropdown';
import { API_URL } from './api';

export const socket = io(API_URL, { autoConnect: false });

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState<number>(0);
  
  const [globalSubmitting, setGlobalSubmitting] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();

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

  useEffect(() => {
    if (token && user?.id) {
      socket.connect();
      socket.emit('register_user', user.id);
      fetchUnreadTotal(token);

      socket.on('refresh_unread_counters', () => {
        fetchUnreadTotal(token);
      });

      return () => {
        socket.off('refresh_unread_counters');
        socket.disconnect();
      };
    }
  }, [token, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ИСПРАВЛЕНО: Теперь пост отправляется, если есть ТЕКСТ ИЛИ ФОТО (можно отправить чистое фото)
  const handleGlobalCreatePost = async (content: string, imageFile: File | null, callback: () => void) => {
    if (globalSubmitting || !token) return;
    if (!content.trim() && !imageFile) return; // Блокируем, только если пусто и там, и там

    setGlobalSubmitting(true);

    const formData = new FormData();
    formData.append('content', content.trim());
    if (imageFile) formData.append('image', imageFile);

    try {
      const res = await fetch(API_URL + '/api/posts', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при публикации поста');
      }

      callback(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGlobalSubmitting(false); 
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {token && user && (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          {globalSubmitting && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-pulse z-50" />
          )}

          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Link to="/" onClick={() => setShowUserMenu(false)} className="flex items-center gap-1.5 focus:outline-none select-none active:scale-95 transition-transform">
              <span className="text-xl">⚡</span>
              <span className="text-sm font-black uppercase tracking-wider text-slate-900">Social Net</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/messages" onClick={() => setShowUserMenu(false)} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 relative p-2 rounded-xl hover:bg-slate-50">
                <span>Сообщения💬</span> 
                <span className="hidden xs:inline">Сообщения</span>
                {totalUnreadMessages > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm shadow-rose-200">
                    {totalUnreadMessages}
                  </span>
                )}
              </Link>
              
              <div className="h-4 w-[1px] bg-slate-200"></div>

              <div className="relative" ref={userMenuRef}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)} 
                  className="flex items-center gap-1.5 p-1 rounded-full focus:outline-none group hover:bg-slate-50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-xs transition-transform group-hover:scale-105">
                    {user.avatar_url ? (
                      <img src={API_URL + user.avatar_url} alt="Аватар" className="h-full w-full object-cover" />
                    ) : (
                      user.username ? user.username.toUpperCase().substring(0, 2) : 'US'
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-700 max-w-[80px] truncate hidden sm:inline">
                    @{user.username}
                  </span>
                  <span className="text-[10px] text-slate-400 transition-transform duration-200 group-hover:text-slate-600">
                    {showUserMenu ? '▲' : '▼'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl animate-fade-in flex flex-col gap-1">
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Уведомления</span>
                      <NotificationDropdown token={token} currentUserId={user.id} />
                    </div>

                    <div className="h-[1px] bg-slate-50 my-1"></div>

                    <Link 
                      to="/profile" 
                      onClick={() => setShowUserMenu(false)} 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <span>👤</span> Мой профиль
                    </Link>

                    <button 
                      onClick={handleLogout} 
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <span>🚪</span> Выйти из системы
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
          
          {globalSubmitting && (
            <div className="w-full bg-blue-50 border-b border-blue-100 text-center py-1 text-[11px] font-bold text-blue-600 animate-pulse select-none">
              ⏳ Публикация медиафайла в облако PostgreSQL... Вы можете свободно перемещаться по сайту.
            </div>
          )}
        </header>
      )}

      <main className="mx-auto w-full max-w-4xl p-2 sm:p-4 transition-all">
        <Routes>
          <Route path="/" element={token && user ? <Feed token={token} currentUserId={user.id} /> : <Navigate to="/login" replace />} />
          
          <Route path="/profile" element={
            token && user ? (
              <Profile 
                token={token} 
                user={user} 
                onUserUpdate={handleUserUpdate} 
                globalSubmitting={globalSubmitting}
                onGlobalCreatePost={handleGlobalCreatePost}
              />
            ) : <Navigate to="/login" replace />
          } />
          
          <Route path="/user/:id" element={token && user ? <UserPage token={token} currentUserId={user.id} /> : <Navigate to="/login" replace />} />
          <Route path="/messages" element={token && user ? <Messages token={token} currentUserId={user.id} onCounterRefresh={() => fetchUnreadTotal(token)} /> : <Navigate to="/login" replace />} />
          
          <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}