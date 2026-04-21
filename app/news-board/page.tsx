"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function SMSchoolPortal() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosts, setMyPosts] = useState<string[]>([]);
  const [myLikes, setMyLikes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  const [form, setForm] = useState({ title: '', content: '', author: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const { data: ps } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (ps) setPosts(ps);
    setMyLikes(JSON.parse(localStorage.getItem('user_likes') || '[]'));
    setMyPosts(JSON.parse(localStorage.getItem('my_posts') || '[]'));
    setLoading(false);
  }

  const handleLike = async (id: string, currentLikes: number) => {
    const isLiked = myLikes.includes(id);
    const newCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: newCount } : p));
    let updated = isLiked ? myLikes.filter(l => l !== id) : [...myLikes, id];
    setMyLikes(updated);
    localStorage.setItem('user_likes', JSON.stringify(updated));
    if (!isLiked) confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#cc0000', '#ffffff'] });
    await supabase.from('posts').update({ likes: newCount }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Энэ мэдээг устгах уу?")) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) {
        setPosts(prev => prev.filter(p => p.id !== id));
        alert("Амжилттай устгагдлаа.");
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return alert("Гарчиг болон агуулга бөглөнө үү.");
    setIsSubmitting(true);
    let image_url = '';
    if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const { data: imgData } = await supabase.storage.from('news-images').upload(fileName, imageFile);
        if (imgData) image_url = supabase.storage.from('news-images').getPublicUrl(fileName).data.publicUrl;
    }
    const { data } = await supabase.from('posts').insert([{ ...form, image_url, likes: 0 }]).select().single();
    if (data) {
      setPosts([data, ...posts]);
      const newMy = [...myPosts, data.id];
      setMyPosts(newMy);
      localStorage.setItem('my_posts', JSON.stringify(newMy));
      setForm({ title: '', content: '', author: '' });
      setImageFile(null);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      
      {/* 🔴 BREAKING NEWS TICKER */}
      <div className="bg-[#cc0000] text-black flex items-center h-10 overflow-hidden sticky top-0 z-50 border-b border-black">
        <div className="bg-black text-white h-full px-6 flex items-center font-black italic border-r border-red-600">
          <span>ШУУРХАЙ</span>
        </div>
        <div className="flex-1 px-4 overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-block font-black tracking-tight uppercase text-sm">
            СУРГУУЛИЙН МЭДЭЭНИЙ НЭГДСЭН СҮЛЖЭЭ • {posts[0]?.title || "ШИНЭ МЭДЭЭ ОРЛОО"} • ШИНЭЧЛЭГДСЭН ХУВИЛБАР • 
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="bg-black border-b border-zinc-800 py-6 sticky top-10 z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-[#cc0000] text-black font-black px-4 py-1 text-4xl tracking-tighter shadow-[0_0_20px_rgba(204,0,0,0.3)]">SM</div>
            <div className="hidden md:block">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none text-white italic">Сургуулийн Мэдээ</h1>
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-[0.3em]">Нэгдсэн Сүлжээ</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-red-600 animate-pulse uppercase tracking-widest italic">● ШУУД ДАРУУЛГА</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 📰 MAIN FEED */}
        <div className="lg:col-span-8 space-y-16">
          
          {/* FEATURED STORY */}
          {!loading && posts[0] && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-zinc-800 pb-12">
              <div className="relative aspect-video overflow-hidden mb-8 bg-zinc-900 border border-zinc-800">
                {posts[0].image_url && (
                  <img src={posts[0].image_url} className="w-full h-full object-cover transition-transform duration-[3s] hover:scale-110 grayscale-[0.3] hover:grayscale-0" alt="hero" />
                )}
                <div className="absolute top-4 left-4 bg-red-600 text-black px-3 py-1 font-black text-xs uppercase italic">Гол мэдээ</div>
              </div>
              <h2 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tighter uppercase mb-6 text-red-600 italic">
                {posts[0].title}
              </h2>
              <p className="text-zinc-400 text-xl leading-relaxed mb-8 font-medium whitespace-pre-wrap italic">
                {posts[0].content}
              </p>
              <div className="flex items-center gap-4 text-xs font-black text-zinc-500 uppercase tracking-widest">
                <span className="bg-red-600 text-black px-2 py-0.5">SM REPORTER</span>
                <span>Бичсэн: {posts[0].author} • {formatDistanceToNow(new Date(posts[0].created_at), { addSuffix: true, locale: mn })}</span>
              </div>
            </motion.section>
          )}

          {/* SECONDARY STORIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            <AnimatePresence>
              {posts.slice(1).map((post) => (
                <motion.article 
                  layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={post.id}
                  className="flex flex-col border-b border-zinc-900 pb-10 group relative"
                >
                  {post.image_url && (
                    <div className="aspect-video overflow-hidden mb-6 bg-zinc-900 border border-zinc-800">
                      <img src={post.image_url} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-1000" alt="news" />
                    </div>
                  )}
                  <h3 className="text-2xl font-black leading-tight uppercase mb-4 group-hover:text-red-600 transition-colors tracking-tighter italic">
                    {post.title}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-6 line-clamp-3 font-bold italic">
                    {post.content}
                  </p>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-[10px] font-black text-zinc-600 uppercase italic">
                      {formatDistanceToNow(new Date(post.created_at), { locale: mn })}
                    </span>
                    <button onClick={() => handleLike(post.id, post.likes)} className="text-red-600 font-black flex items-center gap-2 border border-red-900/30 px-4 py-2 hover:bg-red-600 hover:text-black transition-all">
                      👍 {post.likes}
                    </button>
                  </div>

                  {myPosts.includes(post.id) && (
                    <button 
                      onMouseDown={()=>(timerRef.current = setTimeout(()=>handleDelete(post.id), 800))} 
                      onMouseUp={()=>clearTimeout(timerRef.current)}
                      className="absolute top-0 right-0 text-[8px] font-black bg-red-600 text-black px-2 py-1 uppercase"
                    >
                      Удаан дарж устга
                    </button>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* 🛠️ SIDEBAR */}
        <aside className="lg:col-span-4 space-y-12">
          <section className="bg-zinc-900/30 p-8 border-t-4 border-red-600 shadow-2xl backdrop-blur-sm sticky top-32">
            <h3 className="font-black text-xs uppercase tracking-widest mb-8 text-red-600 border-b border-zinc-800 pb-2 italic text-center">Мэдээ оруулах цонх</h3>
            <form onSubmit={handlePostSubmit} className="space-y-5">
              <input value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 font-black text-sm text-red-600 outline-none focus:border-red-600 transition-all placeholder:text-zinc-800" placeholder="МЭДЭЭНИЙ ГАРЧИГ" />
              <input value={form.author} onChange={e=>setForm({...form, author: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 font-black text-sm text-red-600 outline-none focus:border-red-600 transition-all placeholder:text-zinc-800" placeholder="СУРВАЛЖЛАГЧИЙН НЭР" />
              <textarea value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 text-sm h-40 outline-none text-zinc-400 focus:border-red-600 transition-all placeholder:text-zinc-800" placeholder="ДЭЛГЭРЭНГҮЙ МЭДЭЭЛЭЛ..." />
              <div className="bg-black p-4 border border-zinc-800 rounded-sm">
                 <input type="file" onChange={e=>setImageFile(e.target.files?.item(0) || null)} className="text-[10px] text-zinc-600 w-full" />
              </div>
              <button disabled={isSubmitting} className="w-full bg-red-600 text-black font-black py-5 uppercase tracking-[0.2em] text-sm hover:bg-white transition-all active:scale-95">
                {isSubmitting ? "ИЛГЭЭЖ БАЙНА..." : "МЭДЭЭ НИЙТЛЭХ 🚀"}
              </button>
            </form>
          </section>
        </aside>

      </main>

      <footer className="bg-black border-t border-zinc-900 py-24 mt-24 text-center">
        <div className="text-8xl font-black mb-6 italic tracking-tighter text-zinc-900 opacity-50">SM</div>
        <p className="text-red-600 text-[10px] font-black uppercase tracking-[1em] mb-4">Сургуулийн Мэдээний Нэгдсэн Сүлжээ</p>
        <p className="text-zinc-700 text-[9px] font-bold uppercase tracking-[0.5em]">System Status: Online • 2024</p>
      </footer>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #cc0000; }
      `}</style>
    </div>
  );
}
