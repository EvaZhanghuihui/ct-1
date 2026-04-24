import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, type MistakeRecord } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Loader2, Download, Printer, ChevronDown, ChevronUp, FileText, CheckCircle2, Circle } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { generatePDF } from '../services/pdf';
import { cn } from '../App';

interface HistoryProps {
  userId: string;
}

export default function History({ userId }: HistoryProps) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const printableRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchMistakes();
  }, [userId]);

  const fetchMistakes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'mistakes'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MistakeRecord));
      setMistakes(docs);
    } catch (err) {
      handleFirestoreError(err, 'list', 'mistakes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条错题吗？')) return;
    try {
      await deleteDoc(doc(db, 'mistakes', id));
      setMistakes(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      handleFirestoreError(err, 'delete', `mistakes/${id}`);
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === mistakes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mistakes.map(m => m.id)));
    }
  };

  const handlePrint = async () => {
    if (selectedIds.size === 0) return;
    setPrinting(true);
    try {
      const elementsToPrint = mistakes
        .filter(m => selectedIds.has(m.id))
        .map(m => printableRefs.current[m.id])
        .filter((el): el is HTMLDivElement => el !== null);

      await generatePDF(elementsToPrint, `错题集_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("生成 PDF 失败，请重试");
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-neutral-400">正在获取错题本...</p>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-300">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-neutral-600">空空如也</h3>
          <p className="text-sm text-neutral-400">还没有保存错题，快去扫描一个吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* List Header Actions */}
      <div className="flex items-center justify-between sticky top-16 bg-neutral-50/80 backdrop-blur z-30 py-2">
        <button 
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          {selectedIds.size === mistakes.length ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <Circle className="w-5 h-5" />}
          {selectedIds.size === mistakes.length ? "取消全选" : "全选所有"}
        </button>
        <button
          onClick={handlePrint}
          disabled={selectedIds.size === 0 || printing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          打印所选 ({selectedIds.size})
        </button>
      </div>

      <div className="space-y-4">
        {mistakes.map((m) => (
          <div key={m.id} className="relative">
            {/* Selection Checkbox */}
            <button 
              onClick={(e) => toggleSelect(m.id, e)}
              className="absolute -left-2 top-4 z-10 p-1 bg-white rounded-full shadow-sm border border-neutral-100"
            >
              {selectedIds.has(m.id) ? (
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              ) : (
                <Circle className="w-6 h-6 text-neutral-200" />
              )}
            </button>

            <div 
              onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              className={cn(
                "ml-6 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden transition-all hover:border-blue-200 cursor-pointer",
                expandedId === m.id && "ring-2 ring-blue-100"
              )}
            >
              <div className="p-4 flex gap-4">
                <div className="w-20 h-20 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-200">
                  <img src={m.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {m.knowledgePoint}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {m.createdAt.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 mt-2 line-clamp-2 leading-relaxed">
                    {m.originalText}
                  </p>
                </div>
                <div className="flex flex-col justify-between items-end">
                  <button 
                    onClick={(e) => handleDelete(e, m.id)}
                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === m.id ? <ChevronUp className="w-4 h-4 text-neutral-300" /> : <ChevronDown className="w-4 h-4 text-neutral-300" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === m.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4 bg-neutral-50/50">
                      <div className="h-px bg-neutral-100" />
                      {m.variations.map((v, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm space-y-3">
                          <div className="text-xs font-bold text-neutral-400">变式题 {i + 1}</div>
                          <div className="text-sm font-medium leading-relaxed">{v.question}</div>
                          <div className="space-y-2">
                             <div className="text-[11px] font-bold text-green-600 inline-block bg-green-50 px-2 py-0.5 rounded">答案</div>
                             <div className="text-sm text-neutral-600">{v.answer}</div>
                          </div>
                          <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                             <div className="text-[11px] font-bold text-amber-600">分析</div>
                             <div className="markdown-body mt-1 text-xs">
                               <Markdown>{v.analysis}</Markdown>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hidden Printable Version */}
            <div className="hidden">
              <div 
                ref={el => { if (el) printableRefs.current[m.id] = el; }}
                className="bg-white p-8 w-[210mm] min-h-[297mm] font-sans"
              >
                <div className="mb-8 pb-4 border-b-2 border-black space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                    <span>错题集记录</span>
                    <span>知识点: {m.knowledgePoint}</span>
                    <span>日期: {m.createdAt.toDate().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="space-y-12">
                   <section>
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                       <span className="w-1.5 h-6 bg-black"></span>
                       原题记录
                     </h3>
                     <div className="p-6 border-2 border-neutral-200 rounded-xl mb-6">
                        <img src={m.imageUrl} alt="Mistake" className="max-h-60 mb-4 mx-auto object-contain" />
                        <p className="text-base italic text-neutral-700 leading-relaxed">{m.originalText}</p>
                     </div>
                   </section>

                   <section>
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-black"></span>
                        举一反三变式练习
                      </h3>
                      <div className="space-y-10">
                        {m.variations.map((v, i) => (
                          <div key={i} className="space-y-6">
                            <div className="flex gap-4">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-sm">
                                {i + 1}
                              </span>
                              <div className="text-lg leading-relaxed pt-1 flex-1">
                                {v.question}
                              </div>
                            </div>
                            
                            <div className="ml-12 p-6 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
                               <div className="flex gap-2">
                                  <span className="text-sm font-bold bg-black text-white px-2 py-0.5 rounded">参考答案</span>
                                  <span className="text-base">{v.answer}</span>
                               </div>
                               <div className="space-y-1">
                                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">易错点详析</span>
                                  <div className="text-sm leading-relaxed text-neutral-800">
                                    <Markdown>{v.analysis}</Markdown>
                                  </div>
                               </div>
                            </div>
                            {i < m.variations.length - 1 && <div className="border-t border-dashed border-neutral-300 pt-10" />}
                          </div>
                        ))}
                      </div>
                   </section>
                </div>
                
                <div className="mt-20 pt-8 border-t text-center text-xs text-neutral-400">
                  错题举一反三打印机生成 • 勤能补拙，举一反三
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
