import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { API_URL } from '../api';
import { socket } from '../App';

interface ChatUser {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface MessagesProps {
  token: string;
  currentUserId: number;
  onCounterRefresh: () => void;
}

export default function Messages({ token, currentUserId, onCounterRefresh }: MessagesProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetChatUserId = searchParams.get('chat');

  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [unreadCounters, setUnreadCounters] = useState<any>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const popularEmojis = ['😀', '😂', '🔥', '👍', '❤️', '🙌', '🎉', '🚀', '👀', '💯', '🤔', '😎'];

  const fetchUnreadCounters = () => {
    fetch(API_URL + '/api/messages/unread/counters', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.bySender) {
          const counts: any = {};
          data.bySender.forEach((item: any) => {
            counts[item.sender_id.toString()] = parseInt(item.count);
          });
          setUnreadCounters(counts);
        }
      })
      .catch((err) => console.error(err));
  };
  const loadUsersList = (query: string) => {
    const endpoint = query.trim() === '' 
      ? API_URL + '/api/messages/active/list'
      : API_URL + '/api/users/search?query=' + encodeURIComponent(query);

    fetch(endpoint, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        const usersArray = Array.isArray(data) ? data : [];
        const filtered = usersArray.filter((u: any) => u.id.toString() !== currentUserId.toString());
        setUsers(filtered);
        fetchUnreadCounters();
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadUsersList(searchQuery);
  }, [searchQuery, token, currentUserId]);

  useEffect(() => {
    socket.emit('register_user', currentUserId);

    socket.on('update_online_list', (list: string[]) => {
      setOnlineUserIds(list);
    });

    socket.on('typing_receive', ({ senderId }) => {
      setTypingUsers(prev => prev.includes(Number(senderId)) ? prev : [...prev, Number(senderId)]);
    });

    socket.on('typing_clear', ({ senderId }) => {
      setTypingUsers(prev => prev.filter(id => id !== Number(senderId)));
    });

    socket.on('refresh_unread_counters', () => {
      fetchUnreadCounters();
      onCounterRefresh();
      fetchMessages();
      if (searchQuery.trim() === '') loadUsersList('');
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('update_online_list');
      socket.off('typing_receive');
      socket.off('typing_clear');
      socket.off('refresh_unread_counters');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUserId, searchQuery, activeUser]);

  useEffect(() => {
    if (targetChatUserId) {
      fetch(API_URL + '/api/users/' + targetChatUserId, {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.user) {
            setActiveUser(data.user);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [targetChatUserId, token]);

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

    fetch(API_URL + '/api/messages/read/' + activeUser.id, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => {
      fetchUnreadCounters();
      onCounterRefresh();
      socket.emit('refresh_unread_counters', { receiverId: activeUser.id });
    });

    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [activeUser, token]);

  useEffect(() => {
    if (messages.length > 0) {
      const hasIncomingUnread = messages.some(m => !m.is_read && m.sender_id.toString() !== currentUserId.toString());
      
      if (hasIncomingUnread) {
        setTimeout(() => {
          firstUnreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [messages, activeUser]);

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (!activeUser) return;
    socket.emit('typing_start', { senderId: currentUserId, receiverId: activeUser.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { senderId: currentUserId, receiverId: activeUser.id });
    }, 1500);
  };

  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing_stop', { senderId: currentUserId, receiverId: activeUser.id });

    fetch(API_URL + '/api/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      },
      body: JSON.stringify({ receiver_id: Number(activeUser.id), content: newMessage.trim() }),
    })
      .then((res) => res.json())
      .then(() => {
        setNewMessage('');
        fetchMessages();
        loadUsersList(searchQuery);
        onCounterRefresh();
        socket.emit('refresh_unread_counters', { receiverId: activeUser.id });
      })
      .catch((err) => console.error(err));
  };

  const handleSelectUser = (u: ChatUser) => {
    setActiveUser(u);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('chat', u.id.toString());
    setSearchParams(newParams);
  };

  const handleCloseChat = () => {
    setActiveUser(null);
    setMessages([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('chat');
    setSearchParams(newParams);
    loadUsersList(searchQuery);
  };
  const firstUnreadIncomingIndex = messages.findIndex(
    m => !m.is_read && m.sender_id.toString() !== currentUserId.toString()
  );

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex h-[80vh]">
      {/* Левая панель: Собеседники */}
      <aside className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-2.5">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Мессенджер</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery.trim() === '' ? 'Ваши active переписки' : 'Результаты глобального поиска'}
            </p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Найти нового пользователя..." 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {users.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic py-6">
              {searchQuery.trim() === '' ? 'У вас пока нет активных чатов.' : 'Пользователи не найдены'}
            </p>
          ) : (
            users.map((u) => {
              const isOnline = onlineUserIds.includes(u.id.toString());
              const isTypingNow = typingUsers.includes(u.id);
              const count = unreadCounters[u.id.toString()] || 0;

              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left focus:outline-none relative ${
                    activeUser?.id === u.id ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'hover:bg-slate-100/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border flex items-center justify-center font-bold text-xs bg-slate-100 border-slate-200 text-slate-500">
                      {u.avatar_url ? <img src={API_URL + u.avatar_url} className="h-full w-full object-cover" /> : u.username.substring(0, 2).toUpperCase()}
                      {isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold truncate">@{u.username}</span>
                      {isTypingNow && <span className={`text-[10px] font-bold animate-pulse ${activeUser?.id === u.id ? 'text-blue-200' : 'text-amber-500'}`}>Печатает...</span>}
                    </div>
                  </div>
                  {count > 0 && activeUser?.id !== u.id && (
                    <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-sm shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Правая панель: Чат */}
      <section className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                  {activeUser.avatar_url ? <img src={API_URL + activeUser.avatar_url} className="h-full w-full object-cover" /> : activeUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-900">@{activeUser.username}</span>
                  <span className={`text-[10px] font-bold ${onlineUserIds.includes(activeUser.id.toString()) ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {onlineUserIds.includes(activeUser.id.toString()) ? '● в сети' : 'был(а) недавно'}
                  </span>
                </div>
              </div>

              <button onClick={handleCloseChat} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all font-bold text-sm focus:outline-none">
                ✕ Закрыть
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/10">
              {messages.map((msg, index) => {
                const isMe = msg.sender_id.toString() === currentUserId.toString();
                const isFirstUnreadLine = index === firstUnreadIncomingIndex;

                return (
                  <React.Fragment key={msg.id}>
                    {isFirstUnreadLine && (
                      <div ref={firstUnreadRef} className="w-full flex items-center my-3 select-none">
                        <div className="flex-1 h-[1px] bg-emerald-200"></div>
                        <span className="mx-3 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          Непрочитанные сообщения
                        </span>
                        <div className="flex-1 h-[1px] bg-emerald-200"></div>
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative ${
                        isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/50'
                      }`}>
                        {msg.content}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 px-1 select-none">
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span className={`text-xs font-black leading-none ${msg.is_read ? 'text-blue-500' : 'text-slate-300'}`}>
                            {msg.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              {typingUsers.includes(activeUser.id) && (
                <div className="text-[11px] text-slate-400 font-bold italic animate-pulse mt-1 px-1">
                  @{activeUser.username} печатает...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2 relative">
              <div className="relative" ref={emojiPickerRef}>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base hover:bg-slate-100 transition-colors focus:outline-none">
                  😀
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-4 gap-1 rounded-xl border border-slate-100 bg-white p-2 shadow-2xl w-40">
                    {popularEmojis.map(emoji => (
                      <button key={emoji} type="button" onClick={() => handleAddEmoji(emoji)} className="p-1.5 hover:bg-slate-50 rounded-lg text-lg text-center transition-transform active:scale-125 focus:outline-none">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input type="text" value={newMessage} onChange={(e) => handleInputChange(e.target.value)} placeholder="Напишите личное сообщение..." className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" autoComplete="off" />
              <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm active:scale-95">Отправить</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 select-none">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm font-bold text-slate-500">Чат не выбран</p>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">Выберите любой активный диалог слева или воспользуйтесь поиском, чтобы найти нового собеседника</p>
          </div>
        )}
      </section>
    </div>
  );
}
