import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Save, X } from 'lucide-react';
import { analyzeMistake, generateVariations, type Variation, type OCRResult } from '../services/gemini';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../App';

interface ScannerProps {
  userId: string;
}

export default function Scanner({ userId }: ScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'generated' | 'saving' | 'saved'>('idle');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setStatus('idle');
        setOcrResult(null);
        setVariations([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setStatus('analyzing');
    setError(null);
    try {
      const result = await analyzeMistake(image);
      setOcrResult(result);
      const generated = await generateVariations(result.knowledgePoint, result.text);
      setVariations(generated);
      setStatus('generated');
    } catch (err: any) {
      setError(err.message || "分析失败，请重试");
      setStatus('idle');
    }
  };

  const handleSave = async () => {
    if (!ocrResult || variations.length === 0) return;
    setStatus('saving');
    try {
      await addDoc(collection(db, 'mistakes'), {
        userId,
        originalText: ocrResult.text,
        imageUrl: image,
        knowledgePoint: ocrResult.knowledgePoint,
        variations,
        createdAt: Timestamp.now()
      });
      setStatus('saved');
    } catch (err) {
      handleFirestoreError(err, 'create', 'mistakes');
    }
  };

  const handleRetry = () => {
    setStatus('analyzing');
    handleAnalyze();
  };

  return (
    <div className="space-y-6">
      {!image ? (
        <div 
          onClick={handleCapture}
          className="aspect-[3/4] bg-white border-2 border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">上传错题图片</h2>
          <p className="text-neutral-400 text-sm max-w-[200px]">支持拍照或相册选择，请确保题目内容清晰可见</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-6 pb-12">
          {/* Image Preview */}
          <div className="relative aspect-video bg-neutral-100 rounded-3xl overflow-hidden shadow-inner border border-neutral-200">
            <img src={image} alt="Preview" className="w-full h-full object-contain" />
            <button 
              onClick={() => { setImage(null); setStatus('idle'); }}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.button
                key="analyze-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleAnalyze}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                <Sparkles className="w-5 h-5" />
                识别并生成举一反三
              </motion.button>
            )}

            {status === 'analyzing' && (
              <motion.div
                key="analyzing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col items-center gap-4 text-center"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">AI 正在深度解析...</h3>
                  <p className="text-blue-700/70 text-sm mt-1">正在识别题目并匹配核心知识点</p>
                </div>
              </motion.div>
            )}

            {(status === 'generated' || status === 'saving' || status === 'saved') && ocrResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Knowledge Point Badge */}
                <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">核心知识点</span>
                  </div>
                  <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    {ocrResult.knowledgePoint}
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-neutral-400 mb-1 leading-relaxed">识别到的原题文本：</p>
                    <div className="p-4 bg-neutral-50 rounded-xl text-neutral-700 text-sm italic border border-neutral-100">
                      {ocrResult.text}
                    </div>
                  </div>
                </div>

                {/* Variations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      举一反三特选变式题
                    </h3>
                  </div>
                  
                  {variations.map((v, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <span>题型变式 {i + 1}</span>
                      </div>
                      <div className="text-neutral-900 font-medium leading-relaxed">
                        {v.question}
                      </div>
                      <div className="pt-4 border-t border-neutral-50 space-y-3">
                        <div>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">答案</span>
                          <p className="mt-1 text-sm">{v.answer}</p>
                        </div>
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                          <span className="text-xs font-bold text-amber-600">易错点分析</span>
                          <div className="markdown-body mt-1">
                            <Markdown>{v.analysis}</Markdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 sticky bottom-24 bg-neutral-50/80 backdrop-blur pb-4 pt-2">
                   {status !== 'saved' ? (
                     <>
                        <button 
                          onClick={handleRetry}
                          className="flex-1 py-4 bg-white border border-neutral-200 rounded-xl font-semibold text-neutral-600 hover:bg-neutral-50"
                        >
                          重新生成
                        </button>
                        <button 
                          onClick={handleSave}
                          disabled={status === 'saving'}
                          className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100"
                        >
                          {status === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                          保存到错题本
                        </button>
                     </>
                   ) : (
                     <div className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                        <CheckCircle2 className="w-5 h-5" />
                        已保存成功
                     </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
