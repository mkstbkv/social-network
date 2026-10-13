import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { API_URL } from '../api';

interface Comment {
  id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  parent_id: number | null;
}

interface PostCardProps {
  post: any;
  token: string;
  currentUserId: number;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, token, currentUserId, onDelete }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const targetPostId = searchParams.get('post');
  const targetCommentId = searchParams.get('comment');

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [currentPostContent, setCurrentPostContent] = useState(post.content);
  const [replyToId, setReplyToId] = useState<number | null>(null);

  const [postLikesCount, setPostLikesCount] = useState<number>(post.likes_count || 0);
  const [isPostLiked, setIsLocalPostLiked] = useState<boolean>(post.is_liked || false);

  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hasScrolledRef = useRef<boolean>(false);

  useEffect(() => {
    setLocalCommentsCount(post.comments_count || 0);
    setPostLikesCount(post.likes_count || 0);
    setIsLocalPostLiked(post.is_liked || false);
  }, [post.comments_count, post.likes_count, post.is_liked]);

  const fetchComments = () => {
    fetch(API_URL + '/api/comments/' + post.id, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => res.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (targetCommentId && targetPostId && post.id.toString() === targetPostId.toString() && !hasScrolledRef.current) {
      if (!showComments) {
        setShowComments(true);
      }
    }
  }, [targetCommentId, targetPostId, post.id, showComments]);

  useEffect(() => {
    if (targetCommentId && targetPostId && post.id.toString() === targetPostId.toString() && comments.length > 0 && !hasScrolledRef.current) {
      const hasTarget = comments.some(c => c.id.toString() === targetCommentId.toString());
      if (hasTarget) {
        hasScrolledRef.current = true;

        setTimeout(() => {
          const el = document.getElementById('comment-node-' + targetCommentId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-amber-100/60');
            
            setTimeout(() => {
              if (el) el.classList.remove('bg-amber-100/60');
            }, 2000);

            const newParams = new URLSearchParams(searchParams);
            newParams.delete('comment');
            newParams.delete('post');
            setSearchParams(newParams, { replace: true });
          }
        }, 400);
      }
    }
  }, [targetCommentId, targetPostId, post.id, comments]);

  useEffect(() => {
    if (showComments) {
      fetchComments();
      const interval = setInterval(fetchComments, 5000);
      return () => clearInterval(interval);
    }
  }, [showComments, post.id]);

  useEffect(() => {
    const atIndex = commentContent.lastIndexOf('@');
    if (atIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    const query = commentContent.substring(atIndex + 1);
    if (query.trim().length === 0 || query.includes(' ')) {
      setShowSuggestions(false);
      return;
    }

    const delayDebounceTimer = setTimeout(() => {
      fetch(API_URL + '/api/users/search?query=' + query, {
        headers: { 'Authorization': 'Bearer ' + token }
      })
        .then((res) => res.json())
        .then((data) => {
          setSearchSuggestions(data);
          setShowSuggestions(true);
        })
        .catch((err) => console.error(err));
    }, 400);

    return () => clearTimeout(delayDebounceTimer);
  }, [commentContent, token]);

  const handleSuggestionClick = (usernameToInsert: string) => {
    const atIndex = commentContent.lastIndexOf('@');
    if (atIndex !== -1) {
      const startText = commentContent.substring(0, atIndex);
      setCommentContent(startText + '@' + usernameToInsert + ' ');
      setShowSuggestions(false);
    }
  };

  const handleMentionTextClick = (rawText: string) => {
    const cleanUsername = rawText.replace(/[@.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

    fetch(API_URL + '/api/users/by-username/' + encodeURIComponent(cleanUsername), {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Такого пользователя не существует');
        return res.json();
      })
      .then((data) => {
        const profileId = data.user ? data.user.id : data.id;
        if (profileId.toString() === currentUserId.toString()) navigate('/profile');
        else navigate('/user/' + profileId);
      })
      .catch((err) => alert(err.message));
  };

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\u0400-\u04FF]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <button key={index} type="button" onClick={() => handleMentionTextClick(part)} className="text-blue-600 font-bold hover:underline inline focus:outline-none p-0 bg-transparent cursor-pointer">
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handlePostLikeClick = () => {
    const nextLikedState = !isPostLiked;
    setIsLocalPostLiked(nextLikedState);
    setPostLikesCount(prev => nextLikedState ? prev + 1 : Math.max(0, prev - 1));

    fetch(API_URL + '/api/posts/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ post_id: post.id }),
    })
      .then((res) => res.json())
      .then((data) => setIsLocalPostLiked(data.liked))
      .catch(() => {
        setIsLocalPostLiked(post.is_liked);
        setPostLikesCount(post.likes_count);
      });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    fetch(API_URL + '/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ post_id: post.id, content: commentContent, parent_id: replyToId }),
    })
      .then(() => {
        setCommentContent('');
        setReplyToId(null);
        setLocalCommentsCount((prev: number) => prev + 1);
        fetchComments();
      });
  };

  const handleReplyClick = (commentId: number, username: string) => {
    setReplyToId(commentId);
    setCommentContent('@' + username + ' ');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedContent.trim()) return;
    fetch(API_URL + '/api/posts/' + post.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content: editedContent }),
    }).then((res) => res.json()).then((data) => {
      setCurrentPostContent(data.post.content);
      setIsEditing(false);
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (!window.confirm('Удалить комментарий?')) return;
    fetch(API_URL + '/api/comments/' + commentId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(() => {
      setLocalCommentsCount((prev: number) => Math.max(0, prev - 1));
      fetchComments();
    });
  };

  const handleCommentLike = (commentId: number) => {
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, is_liked: !c.is_liked, likes_count: c.is_liked ? c.likes_count - 1 : c.likes_count + 1 } : c));
    fetch(API_URL + '/api/comments/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment_id: commentId }),
    });
  };

  const mainComments = comments.filter(c => !c.parent_id);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={post.user_id.toString() === currentUserId.toString() ? "/profile" : '/user/' + post.user_id} className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-slate-500">
            {post.avatar_url ? <img src={API_URL + post.avatar_url} alt="Аватар" className="h-full w-full object-cover" /> : post.username ? post.username.toUpperCase().substring(0, 2) : 'US'}
          </Link>
          <div className="flex flex-col">
            <Link to={post.user_id.toString() === currentUserId.toString() ? "/profile" : '/user/' + post.user_id} className="text-base font-bold text-slate-900 hover:text-blue-600 hover:underline">
              @{post.username}
            </Link>
            <small className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</small>
          </div>
        </div>
        {post.user_id.toString() === currentUserId.toString() && !isEditing && (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500 font-semibold hover:bg-blue-50">✏️ Ред.</button>
            <button onClick={() => onDelete(post.id)} className="rounded-lg bg-slate-50 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">🗑️</button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="mt-3 flex flex-col gap-2">
          <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-base text-slate-800 focus:border-blue-500 focus:outline-none resize-none" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setIsEditing(false); setEditedContent(currentPostContent); }} className="rounded-xl bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600">Отмена</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white">Сохранить</button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{renderTextWithMentions(currentPostContent)}</p>
      )}


      {post.image_url && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <img 
            src={post.image_url.startsWith('http') ? post.image_url : (API_URL + (post.image_url.startsWith('/') ? '' : '/') + post.image_url)} 
            alt="Контент публикации" 
            className="max-h-96 w-full object-cover" 
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-slate-50 pt-3">
        <button onClick={handlePostLikeClick} className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-all active:scale-90 ${isPostLiked ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600 hover:bg-rose-50'}`}>
          <span>{isPostLiked ? '❤️' : '🤍'}</span> <span>{postLikesCount}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="text-sm font-semibold text-slate-500 hover:text-blue-600">
          💬 {showComments ? 'Скрыть ответы' : 'Обсудить (' + localCommentsCount + ')'}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl relative">
          
          <form onSubmit={handleAddComment} className="flex flex-col gap-1.5 relative">
            {replyToId && (
              <div className="text-xs text-blue-600 font-semibold flex items-center justify-between bg-blue-50/60 px-3 py-1 rounded-lg">
                <span>Ответ на комментарий...</span>
                <button type="button" onClick={() => { setReplyToId(null); setCommentContent(''); }} className="text-slate-400 hover:text-slate-600 font-bold">✕ Отмена</button>
              </div>
            )}
            
            <div className="relative flex gap-2">
              <input type="text" id={'input-comment-' + post.id} value={commentContent} autoComplete="off" onChange={(e) => setCommentContent(e.target.value)} placeholder={replyToId ? "Напишите ответ..." : "Напишите комментарий..."} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Отправить</button>

              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-slate-100 bg-white p-1.5 shadow-2xl flex flex-col gap-0.5">
                  {searchSuggestions.map((u) => (
                    <button key={u.id} type="button" onClick={() => handleSuggestionClick(u.username)} className="flex items-center gap-2 w-full rounded-lg p-1.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50">
                      <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] text-blue-600 overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={API_URL + u.avatar_url} className="h-full w-full object-cover" /> : u.username.substring(0,2).toUpperCase()}
                      </div>
                      <span className="truncate">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          <div className="mt-4 flex flex-col gap-3">
            {mainComments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Комментариев пока нет.</p>
            ) : (
              mainComments.map((comment) => {
                const canDeleteMain = comment.user_id.toString() === currentUserId.toString() || post.user_id.toString() === currentUserId.toString();
                const isMainAuthor = comment.user_id.toString() === post.user_id.toString();
                const childReplies = comments.filter(c => c.parent_id === comment.id);

                return (
                  <div key={comment.id} id={'comment-node-' + comment.id} className="flex flex-col gap-2 border-b border-slate-100/30 last:border-0 pb-2 last:pb-0 rounded-xl transition-all duration-500 p-2">
                    
                    <div className="group flex items-center justify-between text-sm py-0.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link to={comment.user_id.toString() === currentUserId.toString() ? "/profile" : '/user/' + comment.user_id} className="font-bold text-slate-800 hover:text-blue-600">@{comment.username}</Link>
                          {isMainAuthor && <span className="bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">Автор</span>}
                        </div>
                        <span className="text-slate-600 block mt-0.5">{renderTextWithMentions(comment.content)}</span>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 select-none">
                          <span>{new Date(comment.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button type="button" onClick={() => handleReplyClick(comment.id, comment.username)} className="font-bold hover:text-blue-600 hover:underline">Ответить</button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleCommentLike(comment.id)} className={`text-xs font-bold transition-all px-2 py-1 rounded-full flex items-center gap-1 ${comment.is_liked ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-rose-500'}`}>
                          <span>{comment.is_liked ? '❤️' : '🤍'}</span> <span className="text-[11px] font-medium">{comment.likes_count || 0}</span>
                        </button>
                        {canDeleteMain && <button type="button" onClick={() => handleDeleteComment(comment.id)} className="text-xs text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-600">✕</button>}
                      </div>
                    </div>

                    {childReplies.length > 0 && (
                      <div className="pl-8 border-l-2 border-slate-100/70 ml-2 flex flex-col gap-2 mt-1 bg-slate-50/30 p-2 rounded-xl">
                        {childReplies.map((reply) => {
                          const canDeleteReply = reply.user_id.toString() === currentUserId.toString() || post.user_id.toString() === currentUserId.toString();
                          const isReplyAuthor = reply.user_id.toString() === post.user_id.toString();

                          return (
                            <div key={reply.id} id={'comment-node-' + reply.id} className="group flex items-center justify-between text-xs transition-all duration-500 p-1.5 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link to={reply.user_id.toString() === currentUserId.toString() ? "/profile" : '/user/' + reply.user_id} className="font-bold text-slate-800 hover:text-blue-600">@{reply.username}</Link>
                                  {isReplyAuthor && <span className="bg-blue-50 border border-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">Автор</span>}
                                </div>
                                <span className="text-slate-600 block mt-0.5">{renderTextWithMentions(reply.content)}</span>
                                <div className="flex items-center gap-3 text-[9px] text-slate-400 mt-1 select-none">
                                  <span>{new Date(reply.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <button type="button" onClick={() => handleReplyClick(comment.id, reply.username)} className="font-bold hover:text-blue-600 hover:underline">Ответить</button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleCommentLike(reply.id)} className={`text-[11px] font-bold transition-all px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${reply.is_liked ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-rose-500'}`}>
                                  <span>{reply.is_liked ? '❤️' : '🤍'}</span> <span>{reply.likes_count || 0}</span>
                                </button>
                                {canDeleteReply && <button type="button" onClick={() => handleDeleteComment(reply.id)} className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-600">✕</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </article>
  );
};
