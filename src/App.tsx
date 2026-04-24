import React, { useState, useEffect, useRef } from 'react';
import { auth, googleProvider, db, testConnection, type MistakeRecord } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, User, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, BookOpen, Trash2, LogIn, LogOut, ChevronRight, CheckCircle2, Loader2, Download, Printer, Plus, X } from 'lucide-react';
import Scanner from './components/Scanner';
import History from './components/History';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scanner' | 'history'>('scanner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50">
        <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-neutral-100 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 leading-tight">
            错题举一反三打印机
          </h1>
          <p className="text-neutral-500 leading-relaxed">
            拍照识别错题，智能解析知识点并生成相似变式题，帮助你深度掌握薄弱环节。
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <LogIn className="w-5 h-5" />
            谷歌账号登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-bottom border-neutral-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold">错题打印机</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 hidden sm:block">{user.displayName || user.email}</span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'scanner' ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Scanner userId={user.uid} />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <History userId={user.uid} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-top border-neutral-100 flex justify-around px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => setActiveTab('scanner')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all",
            activeTab === 'scanner' ? "text-blue-600 bg-blue-50" : "text-neutral-400"
          )}
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-medium">识别错题</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all",
            activeTab === 'history' ? "text-blue-600 bg-blue-50" : "text-neutral-400"
          )}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-medium">错题本</span>
        </button>
      </nav>
    </div>
  );
}
