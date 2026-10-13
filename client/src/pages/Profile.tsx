import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { PostCard } from '../components/PostCard';
import { FollowModal } from '../components/FollowModal';
import { API_URL } from '../api';

interface Post {
  id: number;
  user_id: number;
  username: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface FollowUser {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileProps {
  token: string;
  user: any;
  onUserUpdate: (updatedUser: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ token, user, onUserUpdate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [bio, setBio] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalUsers, setModalUsers] = useState<FollowUser[]>([]);
  const [profileInfo, setProfileInfo] = useState<any>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const targetPostId = searchParams.get('post');

  const currentUser = Array.isArray(user) ? user : user;

  const fetchProfileData = () => {
    if (!currentUser?.id) return;
    fetch(API_URL + '/api/users/' + currentUser.id, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          setProfileInfo(data.user);
          if (data.user.bio) setBio(data.user.bio);
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchUserPosts = () => {
    if (!currentUser?.id) return;
    setLoading(true);
    fetch(API_URL + '/api/posts/user/' + currentUser.id, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUserPosts();
    fetchProfileData();
  }, [currentUser?.id, targetPostId]);

  useEffect(() => {
    if (targetPostId && posts.length > 0 && !loading) {
      setTimeout(() => {
        const el = document.getElementById('profile-post-node-' + targetPostId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('border-blue-500', 'ring-4', 'ring-blue-100');
          
          setTimeout(() => {
            if (el) el.classList.remove('border-blue-500', 'ring-4', 'ring-blue-100');
          }, 2000);

          const newParams = new URLSearchParams(searchParams);
          newParams.delete('post');
          setSearchParams(newParams, { replace: true });
        }
      }, 450);
    }
  }, [targetPostId, posts, loading]);

  const openFollowModal = (type: 'followers' | 'following') => {
    if (!currentUser?.id) return;
    setModalTitle(type === 'followers' ? 'Подписчики' : 'Подписки');
    fetch(API_URL + '/api/users/' + currentUser.id + '/' + type, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        setModalUsers(Array.isArray(data) ? data : []);
        setModalOpen(true);
      })
      .catch((err) => console.error(err));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ИСПРАВЛЕНО: Извлекаем строго первый файл коллекции, убирая ошибку Overload
    const selectedFile = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    fetch(API_URL + '/api/users/avatar', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    })
      .then((res) => res.json())
      .then((data: any) => {
        const updated = data.user;
        localStorage.setItem('user', JSON.stringify(updated));
        onUserUpdate(updated);
        fetchProfileData();
      })
      .catch((err) => console.error('Ошибка загрузки аватара:', err));
  };

  const handleUpdateBio = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(API_URL + '/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ bio })
    })
      .then((res) => res.json())
      .then((data: any) => {
        const updated = data.user;
        localStorage.setItem('user', JSON.stringify(updated));
        onUserUpdate(updated);
        setIsEditing(false);
        fetchProfileData();
      });
  };

  const handleLike = (postId: number) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p));
  };

  const handleDeletePost = (postId: number) => {
    if (!window.confirm('Вы уверены?')) return;
    fetch(API_URL + '/api/posts/' + postId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchUserPosts());
  };

  if (!currentUser) return <p className="text-center mt-8 text-slate-400 text-sm">Загрузка данных...</p>;
  return (
    <div className="mx-auto w-full max-w-2xl transition-all">
      {/* Карточка профиля: flex-col на смартфонах, flex-row на мониторах */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          
          {/* Смена аватарки (исправленная типизация) */}
          <div onClick={() => fileInputRef.current?.click()} className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-blue-50 overflow-hidden text-2xl font-black text-blue-600 transition-all hover:opacity-90 shadow-inner">
            {profileInfo?.avatar_url || currentUser?.avatar_url ? (
              <img src={API_URL + (profileInfo?.avatar_url || currentUser?.avatar_url)} alt="Аватар" className="h-full w-full object-cover" />
            ) : (
              currentUser?.username ? currentUser.username.toUpperCase().substring(0, 2) : 'US'
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white font-bold opacity-0 transition-opacity group-hover:opacity-100">Сменить</div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
          
          <div className="flex flex-col min-w-0 w-full">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">@{currentUser?.username || 'user'}</h2>
            <p className="text-xs sm:text-sm text-slate-400 truncate mt-0.5">{currentUser?.email || ''}</p>
          </div>
        </div>

        {/* Интерактивные счетчики подписок */}
        <div className="mt-4 flex justify-center sm:justify-start gap-6 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 font-medium">
          <button onClick={() => openFollowModal('following')} className="hover:text-blue-600 hover:underline focus:outline-none transition-colors active:scale-95">
            <strong className="text-slate-900 font-black mr-1">
              {profileInfo !== null ? profileInfo.following_count : (currentUser?.following_count || 0)}
            </strong> подписок
          </button>
          <button onClick={() => openFollowModal('followers')} className="hover:text-blue-600 hover:underline focus:outline-none transition-colors active:scale-95">
            <strong className="text-slate-900 font-black mr-1">
              {profileInfo !== null ? profileInfo.followers_count : (currentUser?.followers_count || 0)}
            </strong> подписчиков
          </button>
        </div>

        {/* Раздел Био (О себе) */}
        <div className="mt-4 border-t border-slate-100 pt-3 w-full">
          {isEditing ? (
            <form onSubmit={handleUpdateBio} className="flex flex-col gap-3">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm focus:border-blue-500 focus:outline-none resize-none bg-slate-50/50" placeholder="Расскажите немного о себе..." />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setIsEditing(false); setBio(profileInfo?.bio || currentUser.bio || ''); }} className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-600 active:scale-95 transition-transform">Отмена</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-transform">Сохранить</button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center sm:items-start">
              <p className="text-sm sm:text-base text-slate-600 italic text-center sm:text-left leading-relaxed max-w-full break-words">
                {profileInfo?.bio || currentUser?.bio || 'Описание профиля отсутствует.'}
              </p>
              <button onClick={() => setIsEditing(true)} className="mt-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline focus:outline-none p-1 rounded-lg hover:bg-blue-50/50 transition-colors">
                ✏️ Редактировать профиль
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Список личных постов */}
      <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 mb-3 px-1">
        Мои публикации ({posts.length})
      </h3>
      
      {loading ? (
        <p className="text-center text-slate-400 py-6 text-xs sm:text-sm font-medium">Загрузка постов...</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-400 italic py-6 text-xs sm:text-sm bg-white rounded-2xl border border-slate-100 shadow-sm">
          Вы еще ничего не опубликовали.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4 w-full">
          {posts.map((p) => (
            <div key={p.id} id={'profile-post-node-' + p.id} className="w-full rounded-2xl transition-all duration-700 border border-transparent p-0.5">
              <PostCard post={p} token={token} currentUserId={currentUser.id} onLike={handleLike} onDelete={handleDeletePost} />
            </div>
          ))}
        </div>
      )}

      <FollowModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} users={modalUsers} currentUserId={currentUser.id} />
    </div>
  );
};