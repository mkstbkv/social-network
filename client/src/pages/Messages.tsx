import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router';
import { API_URL } from '../api'; // ИМПОРТИРУЕМ НАШ НАДЁЖНЫЙ URL

interface ChatUser {
  id: number;
  username: string;
  avatar_url: string | null;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

interface MessagesProps {
  token: string;
  currentUserId: number;
}

export const Messages: React.FC<MessagesProps> = ({ token, currentUserId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetChatUserId = searchParams.get('chat');

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Загружаем список всех пользователей, с кем можно открыть чат
  useEffect(() => {
    fetch(API_URL + '/api/users/search?query=', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        const filtered = Array.isArray(data) ? data.filter((u: any) => u.id.toString() !== currentUserId.toString()) : [];
        setUsers(filtered);
      })
      .catch((err) => console.error(err));
  }, [token, currentUserId]);

  // 2. Отслеживаем клик «Написать» из профиля пользователя
  useEffect(() => {
    if (targetChatUserId && users.length > 0) {
      const found = users.find(u => u.id.toString() === targetChatUserId.toString());
      if (found) setActiveUser(found);
    }
  }, [targetChatUserId, users]);

  // 3. Загружаем переписку с выбранным пользователем
  const fetchMessages = () => {
    if (!activeUser) return;
    fetch(API_URL + '/api/messages/' + activeUser.id, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (!activeUser) return;
    fetchMessages();
    // Интервал длинного пуллинга (обновление переписки раз в 4 секунды)
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [activeUser, token]);

  // Скролл вниз к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Отправка нового сообщения в облачную базу данных
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    fetch(API_URL + '/api/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      },
      body: JSON.stringify({ receiver_id: activeUser.id, content: newMessage }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewMessage('');
        fetchMessages();
      })
      .catch((err) => console.error(err));
  };

  const handleSelectUser = (u: ChatUser) => {
    setActiveUser(u);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('chat', u.id.toString());
    setSearchParams(newParams);
  };
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex h-[80vh]">
      {/* Левая панель: Список диалогов */}
      <aside className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="text-base font-black text-slate-900 tracking-tight">Мои диалоги</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Выберите собеседника для переписки</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {users.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic py-6">Нет доступных пользователей</p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left focus:outline-none ${
                  activeUser?.id === u.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className={`h-9 w-9 rounded-full overflow-hidden shrink-0 border flex items-center justify-center font-bold text-xs ${activeUser?.id === u.id ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                  {u.avatar_url ? <img src={API_URL + u.avatar_url} className="h-full w-full object-cover" /> : u.username.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-bold truncate">@{u.username}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Правая панель: Окно открытого чата */}
      <section className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            {/* Шапка чата */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/20">
              <Link to={'/user/' + activeUser.id} className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs hover:opacity-90">
                {activeUser.avatar_url ? <img src={API_URL + activeUser.avatar_url} className="h-full w-full object-cover" /> : activeUser.username.substring(0, 2).toUpperCase()}
              </Link>
              <div className="flex flex-col">
                <Link to={'/user/' + activeUser.id} className="text-sm font-black text-slate-900 hover:text-blue-600 hover:underline">@{activeUser.username}</Link>
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">● в сети</span>
              </div>
            </div>

            {/* Лента сообщений */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/10">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-400 italic my-auto">История сообщений пуста. Напишите что-нибудь!</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id.toString() === currentUserId.toString();
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/50'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Форма ввода текста */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Напишите личное сообщение..." className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" autoComplete="off" />
              <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm active:scale-95">Отправить</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 selection:bg-transparent">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm font-bold text-slate-500">Чат не выбран</p>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">Выберите любого пользователя в левой панели или нажмите кнопку «Написать» в его профиле для начала диалога</p>
          </div>
        )}
      </section>
    </div>
  );
};
