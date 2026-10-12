import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

interface SearchedUser {
  id: number;
  username: string;
  bio: string | null;
}

interface SearchUsersProps {
  token: string;
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ token }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // "Живой" поиск при изменении строки ввода
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`http://localhost:5000/api/users/search?query=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setShowDropdown(true);
        })
        .catch((err) => console.error(err));
    }, 300); // Задержка в 300мс (Debounce), чтобы не спамить базу при каждой нажатой букве

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);

  // Закрытие выпадающего списка при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (userId: number) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate(`/user/${userId}`);
  };

  return (
    <div className="relative w-full max-w-xs" ref={dropdownRef}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowDropdown(true);
        }}
        placeholder="Поиск пользователей..."
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      {/* Выпадающий Instagram-style список подсказок */}
      {showDropdown && searchQuery.trim() && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
          {results.length === 0 ? (
            <p className="p-2 text-center text-xs text-slate-400 italic">Пользователи не найдены</p>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  className="flex items-center gap-3 w-full rounded-lg p-2 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">@{u.username}</p>
                    <p className="text-xs text-slate-400 truncate">{u.bio || 'Нет описания'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
