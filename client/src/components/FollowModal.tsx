import React from 'react';
import { useNavigate } from 'react-router';

interface FollowUser {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: FollowUser[];
  currentUserId: number;
}

export const FollowModal: React.FC<FollowModalProps> = ({ isOpen, onClose, title, users, currentUserId }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUserClick = (userId: number) => {
    onClose();
    if (userId.toString() === currentUserId.toString()) {
      navigate('/profile');
    } else {
      navigate(`/user/${userId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      {/* Задняя подложка для закрытия по клику мимо */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Контентное окно */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl animate-fade-in flex flex-col max-h-[400px]">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-3">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">{title}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
          {users.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic py-6">Список пуст</p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleUserClick(u.id)}
                className="flex items-center gap-3 w-full rounded-xl p-2 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-blue-50 overflow-hidden font-bold text-xs text-blue-600">
                  {u.avatar_url ? (
                    <img src={`http://localhost:5000${u.avatar_url}`} alt="Аватар" className="h-full w-full object-cover" />
                  ) : (
                    u.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">@{u.username}</p>
                  <p className="text-xs text-slate-400 truncate">{u.bio || 'Нет описания'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
