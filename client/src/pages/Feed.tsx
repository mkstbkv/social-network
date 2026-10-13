import React, { useState, useEffect } from 'react';
import { PostCard } from '../components/PostCard';
import type { Post } from '../components/PostCard';
import { API_URL } from '../api';

interface FeedProps {
  token: string;
  currentUserId: number;
}

export const Feed: React.FC<FeedProps> = ({ token, currentUserId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'followed'>('all');
  const [loading, setLoading] = useState(true);

  const fetchPosts = () => {
    setLoading(true);
    const endpoint = activeTab === 'all' 
      ? API_URL + '/api/posts' 
      : API_URL + '/api/follows/feed';

    fetch(endpoint, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, token]);

  const handleLike = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p
      )
    );
  };

  // ИСПРАВЛЕНО: Кнопка удаления теперь полностью активна и на главной странице!
  const handleDeletePost = (postId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту публикацию?')) return;
    fetch(API_URL + '/api/posts/' + postId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchPosts());
  };

  return (
    <div className="mx-auto w-full max-w-2xl transition-all">
      <div className="mb-4 flex border-b border-slate-200 font-semibold text-xs sm:text-sm bg-white rounded-xl p-1 shadow-sm">
        <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-center rounded-lg transition-all focus:outline-none ${activeTab === 'all' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          Все публикации
        </button>
        <button onClick={() => setActiveTab('followed')} className={`flex-1 py-2 text-center rounded-lg transition-all focus:outline-none ${activeTab === 'followed' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          Мои подписки
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        {loading ? (
          <p className="text-center text-slate-400 font-medium py-6 text-xs sm:text-sm">Загрузка ленты публикаций...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-400 italic py-6 text-xs sm:text-sm">В этой ленте пока нет ни одного поста.</p>
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              token={token} 
              currentUserId={currentUserId} 
              onLike={handleLike} 
              onDelete={handleDeletePost} // Передали рабочую функцию
            />
          ))
        )}
      </div>
    </div>
  );
};