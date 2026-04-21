"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Cropper from 'react-easy-crop'; // Шинэ сан

export default function SMSchoolPortal() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosts, setMyPosts] = useState<string[]>([]);
  const [myLikes, setMyLikes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<any>(null);

  // Форм болон Зураг засах стэйтүүд
  const [form, setForm] = useState({ title: '', content: '', author: '' });
  const [imageSrc, setImageSrc] = useState<any>(null); // Сонгосон зургийн URL
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [finalImage, setFinalImage] = useState<Blob | null>(null);

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

  // Зураг сонгох үед дуудагдах
  const onFileChange = async (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setShowEditor(true); // Засах цонхыг нээх
      });
      reader.readAsDataURL(file);
    }
  };

  // Тайрсан зургийг боловсруулах (Canvas ашиглан)
  const createCroppedImage = useCallback(async () => {
    try {
      const image = new Image();
      image.src = imageSrc;
      await new Promise((resolve) => (image.onload = resolve));
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !croppedAreaPixels) return;

      const { x, y, width, height }: any = croppedAreaPixels;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

      canvas.toBlob((blob) => {
        setFinalImage(blob);
        setShowEditor(false);
      }, 'image/jpeg');
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return alert("Бөглөнө үү.");
    setIsSubmitting(true);

    let image_url = '';
    if (finalImage) {
      const fileName = `${Date.now()}.jpg`;
      const { data: imgData } = await supabase.storage.from('news-images').upload(fileName, finalImage);
      if (imgData) image_url = supabase.storage.from('news-images').getPublicUrl(fileName).data.publicUrl;
    }

    const { data } = await supabase.from('posts').insert([{ ...form, image_url, likes: 0 }]).select().single();
    if (data) {
      setPosts([data, ...posts]);
      setForm({ title: '', content: '', author: '' });
      setFinalImage(null);
      setImageSrc(null);
    }
    setIsSubmitting(false);
  };

  const handleLike = async (id: string, currentLikes: number) => {
    const isLiked = myLikes.includes(id);
    const newCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: newCount } : p));
    let updated = isLiked ? myLikes.filter(l => l !== id) : [...myLikes, id];
    setMyLikes(updated);
    localStorage.setItem('user_likes', JSON.stringify(updated));
    if (!isLiked) confetti({ particleCount: 100, spread: 70, colors: ['#cc0000'] });
    await supabase.from('posts').update({ likes: newCount }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Устгах уу?")) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-red-600">
      
      {/* 🟢 ЗУРАГ ЗАСАХ MODAL */}
      <AnimatePresence>
        {showEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="relative flex-grow bg-zinc-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9} // CNN Style
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels as any)}
              />
            </div>
            <div className="p-6 bg-black border-t border-zinc-800 flex justify-between items-center">
              <button onClick={() => setShowEditor(false)} className="text-zinc-500 font-bold uppercase tracking-widest">Цуцлах</button>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e:any) => setZoom(e.target.value)} className="w-32 accent-red-600" />
                <button onClick={createCroppedImage} className="bg-red-600 text-black px-8 py-3 font-black uppercase italic">Зургийг бэлэн болгох</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 HEADER & TICKER (Өмнөх хэвээрээ) */}
      <div className="bg-[#cc0000] text-black py-2 overflow-hidden flex whitespace-nowrap sticky top-0 z-50">
        <div className="animate-marquee inline-block font-black uppercase text-sm px-4">СУРГУУЛИЙН МЭДЭЭНИЙ НЭГДСЭН СҮЛЖЭЭ • LIVE SYSTEM ONLINE</div>
      </div>

      <header className="bg-black border-b border-zinc-800 py-8 text-center backdrop-blur-md sticky top-10 z-40">
        <div className="bg-[#cc0000] text-black font-black px-6 py-2 text-5xl inline-block tracking-tighter mb-4 shadow-xl">SM</div>
        <h1 className="text-2xl font-black uppercase tracking-[0.2em] italic">Сургуулийн Мэдээ</h1>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-16">
          {posts.map((post, idx) => (
            <motion.article 
              layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={post.id}
              className={`border-b border-zinc-800 pb-12 ${idx === 0 ? 'block' : 'grid md:grid-cols-2 gap-8'}`}
            >
              {post.image_url && (
                <div className="aspect-video overflow-hidden bg-zinc-900 border border-zinc-800 group cursor-pointer">
                  <img src={post.image_url} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt="news" />
                </div>
              )}
              <div className="pt-4 flex flex-col justify-between">
                <div>
                  <h2 className={`${idx === 0 ? 'text-4xl md:text-7xl' : 'text-2xl md:text-3xl'} font-black leading-tight uppercase text-red-600 italic mb-4`}>{post.title}</h2>
                  <p className="text-zinc-400 font-medium italic line-clamp-4 mb-6">{post.content}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest border-t border-zinc-900 pt-4">
                  <span>{post.author} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: mn })}</span>
                  <button onClick={() => handleLike(post.id, post.likes)} className="bg-zinc-900 px-4 py-2 border border-zinc-800 hover:bg-red-600 hover:text-black transition-all">👍 {post.likes}</button>
                </div>
              </div>
</motion.article>          ))}
        </div>

        <aside className="lg:col-span-4">
          <section className="bg-zinc-900/30 p-8 border-t-4 border-red-600 shadow-2xl sticky top-40">
            <h3 className="font-black text-red-600 uppercase tracking-widest mb-8 italic">Мэдээ оруулах</h3>
            <form onSubmit={handlePostSubmit} className="space-y-4">
              <input value={form.title} onChange={e=>setForm({...form, title: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 font-black text-red-600 outline-none focus:border-red-600 placeholder:text-zinc-800" placeholder="ГАРЧИГ" />
              <input value={form.author} onChange={e=>setForm({...form, author: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 font-black text-red-600 outline-none focus:border-red-600 placeholder:text-zinc-800" placeholder="НИЙТЛЭГЧ" />
              <textarea value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 h-32 outline-none text-zinc-400 focus:border-red-600 placeholder:text-zinc-800" placeholder="АГУУЛГА..." />
              
              <div className="bg-zinc-800 p-4 flex flex-col items-center gap-2 border border-zinc-700">
                {finalImage ? (
                  <div className="text-green-500 font-bold text-[10px] flex items-center gap-2">✅ ЗУРАГ БЭЛЭН БОЛЛОО <button onClick={()=>setImageSrc(null)} className="text-zinc-500 underline">Солих</button></div>
                ) : (
                  <input type="file" accept="image/*" onChange={onFileChange} className="text-[10px] text-zinc-400 w-full" />
                )}
              </div>

              <button disabled={isSubmitting} className="w-full bg-red-600 text-black font-black py-5 uppercase hover:bg-white transition-all">
                {isSubmitting ? "ИЛГЭЭЖ БАЙНА..." : "НИЙТЛЭХ 🚀"}
              </button>
            </form>
          </section>
        </aside>
      </main>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
    </div>
  );
}
