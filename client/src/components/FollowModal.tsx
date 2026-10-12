import React from 'react';
import { Link } from 'react-router';
import { API_URL } from '../api';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold focus:outline-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
          {users.length === 0 ? (
            <p className="text-center text-xs text-slate-400 italic py-4">Список пуст</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-sm">
                    {u.avatar_url ? (
                      <img src={API_URL + u.avatar_url} alt="Аватар" className="h-full w-full object-cover" />
                    ) : (
                      u.username.toUpperCase().substring(0, 2)
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <Link 
                      to={u.id.toString() === currentUserId.toString() ? "/profile" : '/user/' + u.id} 
                      onClick={onClose}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline truncate"
                    >
                      @{u.username}
                    </Link>
                    <span className="text-[11px] text-slate-400 truncate">{u.bio || 'Нет описания'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
