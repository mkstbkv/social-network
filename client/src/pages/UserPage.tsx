import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { PostCard } from '../components/PostCard';
import { FollowModal } from '../components/FollowModal';
import { API_URL } from '../api'; // ИМПОРТИРУЕМ НАШ НАДЁЖНЫЙ URL

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

interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
}

interface UserPageProps {
  token: string;
  currentUserId: number;
}

export const UserPage: React.FC<UserPageProps> = ({ token, currentUserId }) => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalUsers, setModalUsers] = useState<any[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const targetPostId = searchParams.get('post');
  const targetCommentId = searchParams.get('comment');

  const fetchProfileAndPosts = async () => {
    try {
      const profileRes = await fetch(API_URL + '/api/users/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const profileData = await profileRes.json();
      setUser(profileData.user);
      setIsFollowing(profileData.isFollowing);

      const postsRes = await fetch(API_URL + '/api/posts/user/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const postsData = await postsRes.json();
      setPosts(Array.isArray(postsData) ? postsData : []);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndPosts();
  }, [id, targetPostId]);

  useEffect(() => {
    if (targetPostId && posts.length > 0 && !loading) {
      if (targetCommentId) return;

      setTimeout(() => {
        const el = document.getElementById('user-post-node-' + targetPostId);
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
      }, 350);
    }
  }, [targetPostId, posts, loading]);

  // ИСПРАВЛЕНО: Теперь модальное окно подписок запрашивает данные с облачного API_URL!
  const openFollowModal = (type: 'followers' | 'following') => {
    if (!id) return;
    setModalTitle(type === 'followers' ? 'Подписчики' : 'Подписки');
    fetch(API_URL + '/api/users/' + id + '/' + type, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка сервера при загрузке подписок');
        return res.json();
      })
      .then((data) => {
        setModalUsers(Array.isArray(data) ? data : []);
        setModalOpen(true);
      })
      .catch((err) => console.error(err));
  };

  const handleFollowToggle = () => {
    fetch(API_URL + '/api/follows/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ following_id: id })
    }).then(() => fetchProfileAndPosts());
  };

  const handleLike = (postId: number) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p));
  };

  if (loading) return <p className="text-center mt-8 text-slate-400 font-medium">Загрузка профиля...</p>;
  if (!user) return <p className="text-center mt-8 text-rose-600 font-bold">Пользователь не найден</p>;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 overflow-hidden text-xl font-bold text-slate-600">
              {user.avatar_url ? <img src={API_URL + user.avatar_url} alt="Аватар" className="h-full w-full object-cover" /> : user.username ? user.username.toUpperCase().substring(0, 2) : 'US'}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">@{user.username}</h2>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          {currentUserId.toString() !== user.id.toString() && (
            <div className="flex gap-2">
              <Link to={'/messages?chat=' + user.id} className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                Написать
              </Link>
              <button 
                onClick={handleFollowToggle} 
                className={'rounded-xl px-5 py-2 text-sm font-bold text-white transition-colors ' + (isFollowing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 hover:bg-blue-700')}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-6 text-sm text-slate-600 border-t border-slate-100 pt-3">
          <button onClick={() => openFollowModal('following')} className="hover:text-blue-600 hover:underline focus:outline-none">
            <strong className="text-slate-900 font-bold mr-1">{user.following_count || 0}</strong> подписок
          </button>
          <button onClick={() => openFollowModal('followers')} className="hover:text-blue-600 hover:underline focus:outline-none">
            <strong className="text-slate-900 font-bold mr-1">{user.followers_count || 0}</strong> подписчиков
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-base text-slate-600 italic">{user.bio || 'Описание профиля отсутствует.'}</p>
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Публикации @{user.username}</h3>
      <div className="flex flex-col gap-4">
        {posts.length === 0 ? <p className="text-center text-slate-400 italic">Публикаций нет.</p> : posts.map((post) => (
          <div key={post.id} id={'user-post-node-' + post.id} className="rounded-2xl transition-all duration-700 border border-transparent p-0.5">
            <PostCard post={post} token={token} currentUserId={currentUserId} onLike={handleLike} onDelete={() => {}} />
          </div>
        ))}
      </div>

      <FollowModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} users={modalUsers} currentUserId={currentUserId} />
    </div>
  );
};
