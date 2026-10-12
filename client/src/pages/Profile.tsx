import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { PostCard } from '../components/PostCard';
import { FollowModal } from '../components/FollowModal';

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

  const [searchParams, setSearchParams] = useSearchParams();
  const targetPostId = searchParams.get('post');

  const currentUser = Array.isArray(user) ? user : user;

  const fetchUserPosts = () => {
    if (!currentUser?.id) return;
    setLoading(true);
    fetch('/api/posts/user/' + currentUser.id, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false); // Сначала сохраняем посты, и только потом выключаем loading!
      })
      .catch(() => setLoading(false));
  };

  // Перезапрашиваем посты принудительно, если targetPostId в URL изменился
  useEffect(() => {
    fetchUserPosts();
    if (currentUser?.bio) setBio(currentUser.bio);
  }, [currentUser?.id, currentUser?.bio, targetPostId]);

  // ГАРАНТИРОВАННЫЙ СКРОЛЛ: Следит за флагами loading и posts
  useEffect(() => {
    // Скроллим ТОЛЬКО тогда, когда загрузка завершена и посты физически отрисовались в DOM
    if (targetPostId && posts.length > 0 && !loading) {
      // Ставим небольшую задержку в 200мс, чтобы браузер успел отобразить карточки
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById('profile-post-node-' + targetPostId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('border-blue-500', 'ring-4', 'ring-blue-100');
          
          setTimeout(() => {
            if (el) el.classList.remove('border-blue-500', 'ring-4', 'ring-blue-100');
          }, 2500);

          // Стираем метки из URL, фиксируя фокус
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('post');
          setSearchParams(newParams, { replace: true });
        }
      }, 200);

      return () => clearTimeout(scrollTimer);
    }
  }, [targetPostId, posts, loading]);

  const openFollowModal = (type: 'followers' | 'following') => {
    if (!currentUser?.id) return;
    setModalTitle(type === 'followers' ? 'Подписчики' : 'Подписки');
    fetch('http://localhost:5000/api/users/' + currentUser.id + '/' + type, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        setModalUsers(Array.isArray(data) ? data : []);
        setModalOpen(true);
      });
  };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Вытаскиваем строго первый файл по индексу, а не весь FileList
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file); // Теперь TypeScript видит Blob/File и пропускает сборку!

    fetch('http://localhost:5000/api/users/avatar', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    })
      .then((res) => res.json())
      .then((data: any) => {
        const updated = data.user;
        localStorage.setItem('user', JSON.stringify(updated));
        onUserUpdate(updated);
      })
      .catch((err) => console.error('Ошибка загрузки аватара:', err));
  };


  const handleUpdateBio = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/users/profile', {
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
      });
  };

  const handleLike = (postId: number) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p));
  };

  const handleDeletePost = (postId: number) => {
    if (!window.confirm('Вы уверены?')) return;
    fetch('/api/posts/' + postId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchUserPosts());
  };

  if (!currentUser) return <p className="text-center mt-8 text-slate-400">Загрузка данных...</p>;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div onClick={() => fileInputRef.current?.click()} className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-blue-50 overflow-hidden text-2xl font-black text-blue-600 transition-all hover:opacity-90">
            {currentUser?.avatar_url ? <img src={'http://localhost:5000' + currentUser.avatar_url} alt="Аватар" className="h-full w-full object-cover" /> : currentUser?.username ? currentUser.username.toUpperCase().substring(0, 2) : 'US'}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] text-white font-bold opacity-0 transition-opacity group-hover:opacity-100">Сменить</div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
          <div>
            <h2 className="text-xl font-black text-slate-900">@{currentUser?.username || 'user'}</h2>
            <p className="text-sm text-slate-400">{currentUser?.email || ''}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-6 text-sm text-slate-600 border-t border-slate-100 pt-3">
          <button onClick={() => openFollowModal('following')} className="hover:text-blue-600 hover:underline focus:outline-none">
            <strong className="text-slate-900 font-bold mr-1">{currentUser?.following_count || 0}</strong> подписок
          </button>
          <button onClick={() => openFollowModal('followers')} className="hover:text-blue-600 hover:underline focus:outline-none">
            <strong className="text-slate-900 font-bold mr-1">{currentUser?.followers_count || 0}</strong> подписчиков
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          {isEditing ? (
            <form onSubmit={handleUpdateBio} className="flex flex-col gap-3">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none resize-none" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setIsEditing(false); setBio(currentUser.bio || ''); }} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Отмена</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Сохранить</button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-base text-slate-600 italic">{currentUser?.bio || 'Описание профиля отсутствует.'}</p>
              <button onClick={() => setIsEditing(true)} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">Редактировать профиль</button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Мои публикации ({posts.length})</h3>
      {loading ? <p className="text-center text-slate-400 py-6">Загрузка постов...</p> : posts.length === 0 ? <p className="text-center text-slate-400 italic py-6">Вы еще ничего не опубликовали.</p> : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <div key={p.id} id={'profile-post-node-' + p.id} className="rounded-2xl transition-all duration-700 border border-transparent p-0.5">
              <PostCard post={p} token={token} currentUserId={currentUser.id} onLike={handleLike} onDelete={handleDeletePost} />
            </div>
          ))}
        </div>
      )}

      <FollowModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} users={modalUsers} currentUserId={currentUser.id} />
    </div>
  );
};
