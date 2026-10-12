import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

interface ChatUser {
  id: number;
  username: string;
  avatar_url: string | null;
  unread_count: number;
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
}

const EMOJI_LIST = [
  { category: 'Смайлы', items: ['😀', '😂', '🤣', '😊', '😍', '😘', '😜', '😎', '😢', '😭', '😡', '😱', '👍', '👎', '🔥', '🎉'] },
  { category: 'Сердца', items: ['❤️', '💖', '💔', '💕', '✨', '🌟', '👑', '👀', '💯'] }
];

export const Messages: React.FC<MessagesProps> = ({ token, currentUserId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat');

  const [activeChats, setActiveChats] = useState<ChatUser[]>([]);
  const [messages, setPosts] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chattingWith, setChattingWith] = useState<ChatUser | null>(null);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  
  // Храним ID первого непрочитанного сообщения за сессию, чтобы он не прыгал при обновлениях
  const [fixedFirstUnreadId, setFixedFirstUnreadId] = useState<number | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState<number>(0);

  const fetchActiveChats = () => {
    fetch('http://localhost:5000/api/messages/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => setActiveChats(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  const fetchChatHistory = (isFirstLoad = false) => {
    if (!activeChatId) return;
    fetch(`http://localhost:5000/api/messages/${activeChatId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        const incoming = Array.isArray(data) ? data : [];
        
        if (isFirstLoad) {
          // Вычисляем непрочитанные строго один раз при клике на чат
          const unreadMessages = incoming.filter(m => m.sender_id.toString() !== currentUserId.toString() && !m.is_read);
          if (unreadMessages.length > 0) {
            setFixedFirstUnreadId(unreadMessages[0].id);
            setInitialUnreadCount(unreadMessages.length);
          } else {
            setFixedFirstUnreadId(null);
            setInitialUnreadCount(0);
          }
        }
        
        setPosts(incoming);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchActiveChats();
    const interval = setInterval(fetchActiveChats, 3000);
    return () => clearInterval(interval);
  }, [token, activeChatId]);

  useEffect(() => {
    if (activeChatId) {
      // Это первый запуск этого чата
      fetchChatHistory(true);
      
      fetch(`http://localhost:5000/api/users/${activeChatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => setChattingWith(data.user))
        .catch((err) => console.error(err));

      const interval = setInterval(() => fetchChatHistory(false), 3000);
      return () => clearInterval(interval);
    } else {
      setPosts([]);
      setChattingWith(null);
      setFixedFirstUnreadId(null);
    }
  }, [activeChatId, token]);

  // Скролл отрабатывает СТРОГО один раз при открытии истории
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Если есть зафиксированное непрочитанное — скроллим к нему, иначе — в самый низ
    if (fixedFirstUnreadId && firstUnreadRef.current) {
      firstUnreadRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [chattingWith]); // Срабатывает только когда шапка чата полностью загрузилась

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ receiver_id: activeChatId, content: newMessage })
    })
      .then((res) => res.json())
      .then(() => {
        setNewMessage('');
        setFixedFirstUnreadId(null); // После отправки сбрасываем линию
        fetchChatHistory(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch((err) => console.error(err));
  };

  const handleDeleteMessage = (messageId: number) => {
    if (!window.confirm('Удалить сообщение для всех?')) return;
    fetch(`http://localhost:5000/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => fetchChatHistory(false));
  };

  const handleEmojiClick = (emoji: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const updatedText = newMessage.substring(0, start) + emoji + newMessage.substring(end);
    setNewMessage(updatedText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm flex h-[calc(100vh-140px)] overflow-hidden font-sans">
      {/* Левый сайдбар: Список чатов */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900">Сообщения</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {activeChats.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic mt-6">Активных диалогов нет.</p>
          ) : (
            activeChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSearchParams({ chat: chat.id.toString() })}
                className={`flex items-center justify-between w-full rounded-xl p-3 text-left transition-all ${
                  activeChatId === chat.id.toString() ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${activeChatId === chat.id.toString() ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    {chat.avatar_url ? <img src={`http://localhost:5000${chat.avatar_url}`} className="h-full w-full object-cover rounded-full" /> : chat.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">@{chat.username}</p>
                  </div>
                </div>
                {Number(chat.unread_count) > 0 && activeChatId !== chat.id.toString() && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white shadow-sm shadow-emerald-100">
                    {chat.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Правая панель: Окно открытого чата */}
      <div className="w-2/3 flex flex-col bg-white">
        {chattingWith ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                {chattingWith.avatar_url ? <img src={`http://localhost:5000${chattingWith.avatar_url}`} className="h-full w-full object-cover rounded-full" /> : chattingWith.username.substring(0, 2).toUpperCase()}
              </div>
              <span className="font-bold text-slate-900 text-sm">@{chattingWith.username}</span>
            </div>

            {/* Окно сообщений */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/30">
              {messages.map((msg) => {
                const isMe = msg.sender_id.toString() === currentUserId.toString();
                const isFirstUnread = msg.id === fixedFirstUnreadId;

                return (
                  <React.Fragment key={msg.id}>
                    {isFirstUnread && (
                      <div ref={firstUnreadRef} className="w-full flex items-center justify-center my-4 select-none">
                        <div className="h-[1px] bg-emerald-200 flex-1"></div>
                        <span className="bg-emerald-50 text-emerald-700 px-4 py-1 rounded-full text-[11px] font-bold border border-emerald-100 shadow-sm mx-3">
                          {initialUnreadCount === 1 ? 'Непрочитанное сообщение' : 'Непрочитанные сообщения'}
                        </span>
                        <div className="h-[1px] bg-emerald-200 flex-1"></div>
                      </div>
                    )}

                    <div className={`group flex w-full items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-[11px] text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all px-1.5 py-1 rounded bg-slate-100/50 order-first"
                        >
                          ✕
                        </button>
                      )}

                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm relative ${
                        isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap pr-12">{msg.content}</p>
                        <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                          <span className={`text-[9px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <div className="flex items-center text-xs font-bold leading-none -ml-0.5">
                              {msg.is_read ? (
                                <span className="text-emerald-400 font-black tracking-[-3px] inline-block mr-1">✓✓</span>
                              ) : (
                                <span className="text-blue-300/60 font-black tracking-[-3px] inline-block mr-1">✓✓</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Ввод сообщения */}
            <div className="p-4 border-t border-slate-100 relative" ref={emojiPickerRef}>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-4 z-50 mb-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-2xl">
                  <div className="flex flex-col gap-3">
                    {EMOJI_LIST.map((cat) => (
                      <div key={cat.category}>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{cat.category}</h5>
                        <div className="grid grid-cols-6 gap-1">
                          {cat.items.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-transform hover:bg-slate-50 hover:scale-110 active:scale-[0.95]"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-lg transition-all focus:outline-none ${
                    showEmojiPicker ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  😀
                </button>

                <input
                  type="text"
                  value={newMessage}
                  ref={inputRef}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Напишите message..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm shrink-0">
                  Отправить
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4">
            <span className="text-4xl mb-2">💬</span>
            <p className="text-sm font-medium">Выберите чат из списка слева, чтобы начать общение.</p>
          </div>
        )}
      </div>
    </div>
  );
};
