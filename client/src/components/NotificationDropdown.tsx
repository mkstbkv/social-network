import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

interface Notification {
  id: number;
  sender_id: number; 
  sender_username: string;
  post_id: number | null;
  comment_id: number | null;
  post_author_id: number | null;
  type: 'like' | 'comment' | 'reply' | 'comment_like' | 'mention' | 'follow';
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  token: string;
  currentUserId: number;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ token, currentUserId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = () => {
    fetch('http://localhost:5000/api/notifications', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Клик по конкретному уведомлению делает его прочитанным (Индивидуально)
  const handleNotificationClick = (n: Notification) => {
    setIsOpen(false);

    // Локально глушим синюю точку, чтобы не ждать ответа бэкенда
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));

    // На бэкенде у нас есть общий роут /read, но для лучшего UX мы можем просто прочитать все при закрытии или клике
    fetch('http://localhost:5000/api/notifications/read', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchNotifications());
    
    if (n.type === 'follow' && n.sender_id) {
      navigate('/user/' + n.sender_id);
      return;
    }
    
    if (n.post_id) {
      const isMyPost = n.post_author_id && n.post_author_id.toString() === currentUserId.toString();
      const basePath = isMyPost ? '/profile' : '/user/' + n.post_author_id;
      
      if (n.comment_id) {
        navigate(basePath + '?post=' + n.post_id + '&comment=' + n.comment_id);
      } else {
        navigate(basePath + '?post=' + n.post_id);
      }
    }
  };

  const handleMarkAllAsRead = () => {
    fetch('http://localhost:5000/api/notifications/read', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchNotifications());
  };

  const handleClearAll = () => {
    if (!window.confirm('Очистить уведомления?')) return;
    fetch('http://localhost:5000/api/notifications/clear', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ` + token }
    })
      .then(() => setNotifications([]))
      .catch((err) => console.error(err));
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-slate-500 hover:text-slate-800 focus:outline-none transition-colors">
        <span className="text-xl">🔔</span>
        {unreadNotifications.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm shadow-rose-200">
            {unreadNotifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-2xl animate-fade-in flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-50">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Уведомления</h4>
            <div className="flex gap-2.5 text-[11px] font-bold">
              {unreadNotifications.length > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-blue-600 hover:text-blue-800 hover:underline">
                  Прочитать всё
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className="text-rose-500 hover:text-rose-700 hover:underline">
                  Очистить
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-0.5">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">Уведомлений пока нет</p>
            ) : (
              <>
                {/* 1. БЛОК С НЕПРОЧИТАННЫМИ УВЕДОМЛЕНИЯМИ */}
                {unreadNotifications.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-0.5">Новые</div>
                    {unreadNotifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className="p-3 rounded-xl text-xs flex items-center justify-between cursor-pointer border border-blue-100/50 bg-blue-50/40 text-slate-900 hover:bg-blue-50 transition-colors shadow-sm relative group"
                      >
                        <div className="pr-4 leading-relaxed">
                          <strong>@{n.sender_username}</strong>{' '}
                          {n.type === 'like' && 'поставил(а) лайк вашему посту'}
                          {n.type === 'comment' && 'оставил(а) комментарий под вашим постом'}
                          {n.type === 'reply' && 'ответил(а) на ваш комментарий'}
                          {n.type === 'comment_like' && 'поставил(а) лайк вашему комментарию'}
                          {n.type === 'mention' && 'упомянул(а) вас в обсуждении'}
                          {n.type === 'follow' && 'подписался(ась) на ваши обновления'}
                          <div className="text-[9px] text-slate-400 mt-1 font-medium">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {/* Синяя живая точка-маркер */}
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 shadow-sm shadow-blue-300"></span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. БЛОК С ПРОЧИТАННЫМИ УВЕДОМЛЕНИЯМИ */}
                {readNotifications.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-0.5">Раньше</div>
                    {readNotifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        className="p-3 rounded-xl text-xs border border-transparent bg-white text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="leading-relaxed">
                          <strong className="text-slate-700">@{n.sender_username}</strong>{' '}
                          {n.type === 'like' && 'поставил(а) лайк вашему посту'}
                          {n.type === 'comment' && 'оставил(а) комментарий под вашим постом'}
                          {n.type === 'reply' && 'ответил(а) на ваш комментарий'}
                          {n.type === 'comment_like' && 'поставил(а) лайк вашему комментарию'}
                          {n.type === 'mention' && 'упомянул(а) вас в обсуждении'}
                          {n.type === 'follow' && 'подписался(ась) на ваши обновления'}
                          <div className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
