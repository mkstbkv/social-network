import React, { useState, useEffect } from 'react';
import { PostCard } from '../components/PostCard';
import { API_URL } from '../api';

interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface FeedProps {
  token: string;
  currentUserId: number;
}

export const Feed: React.FC<FeedProps> = ({ token, currentUserId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
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

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);

    fetch(API_URL + '/api/posts', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData,
    })
      .then((res) => res.json())
      .then(() => {
        setContent('');
        setImage(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchPosts();
      })
      .catch((err) => alert(err.message));
  };

  const handleLike = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
  };

  const handleDeletePost = (postId: number) => {
    if (!window.confirm('Вы уверены?')) return;
    fetch(API_URL + '/api/posts/' + postId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => fetchPosts());
  };
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex border-b border-slate-200 font-semibold text-sm">
        <button onClick={() => setActiveTab('all')} className={`flex-1 pb-3 text-center transition-colors focus:outline-none ${activeTab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          Все публикации
        </button>
        <button onClick={() => setActiveTab('followed')} className={`flex-1 pb-3 text-center transition-colors focus:outline-none ${activeTab === 'followed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          Мои подписки
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleCreatePost} className="flex flex-col gap-3">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Что у вас нового? Поделитесь мыслями..." rows={3} className="w-full rounded-xl border border-slate-100 p-2 text-base text-slate-800 focus:border-blue-500 focus:outline-none resize-none" />
          <div className="flex items-center justify-between border-t border-slate-50 pt-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 select-none">
              <span>🖼️</span> Прикрепить фото
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  // Проверяем, что файлы выбраны, и берём строго первый файл по индексу [0]
                  const selectedFile = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                  setImage(selectedFile); // Теперь типы идеально совпадают!
                }}
                className="hidden"
              />            </label>
            {image && <span className="text-xs text-emerald-600 font-semibold truncate max-w-[150px]">Файл: {image.name}</span>}
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Опубликовать</button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-center text-slate-400 font-medium py-6">Загрузка ленты публикаций...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-400 italic py-6">В этой ленте пока нет ни одного поста.</p>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} token={token} currentUserId={currentUserId} onLike={handleLike} onDelete={handleDeletePost} />
          ))
        )}
      </div>
    </div>
  );
};
