import React, { useState, useRef } from 'react';
import { X, Send, User, Calendar, MessageSquare, CheckCircle, Clock, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { PDFComment, FileInfo } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAuth } from '../contexts/AuthContext';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFReviewerProps {
  files: FileInfo[];
  comments: PDFComment[];
  onSaveComment: (comment: PDFComment) => void;
  onResolveComment: (commentId: string) => void;
  onClose: () => void;
  title: string;
}

export default function PDFReviewer({ 
  files, 
  comments, 
  onSaveComment, 
  onResolveComment, 
  onClose,
  title
}: PDFReviewerProps) {
  const { user } = useAuth();
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeFile = files[activeFileIndex];
  const isImage = activeFile?.type.startsWith('image/') || 
                  activeFile?.url.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i) ||
                  (activeFile?.url.includes('unsplash.com') && !activeFile?.url.includes('.pdf'));

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setClickPosition({ x, y });
    setIsAddingComment(true);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !clickPosition) return;

    const comment: PDFComment = {
      id: Math.random().toString(36).substr(2, 9),
      page: pageNumber,
      x: clickPosition.x,
      y: clickPosition.y,
      text: newComment,
      user: user?.name || 'Sistema',
      date: new Date().toISOString(),
      resolved: false
    };

    onSaveComment(comment);
    setNewComment('');
    setIsAddingComment(false);
    setClickPosition(null);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0c10] z-[60] flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {/* Heavy-Duty Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0c10]/80 backdrop-blur-xl shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3 transition-transform hover:rotate-0">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">{title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-[9px] font-black text-indigo-400 rounded uppercase tracking-widest border border-indigo-500/20">
                Audit Mode
              </span>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80">
                {activeFile?.name}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {/* PDF Controls - Only visible if not an image */}
          {!isImage && (
            <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
              <button 
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="p-2.5 hover:bg-white/10 rounded-xl text-white/70 disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-3 min-w-[80px] text-center text-[10px] font-black text-white uppercase tracking-widest group">
                <span className="group-hover:text-indigo-400 transition-colors">Página {pageNumber}</span>
                <span className="text-white/30 mx-1">/</span>
                <span className="text-white/40">{numPages || '?'}</span>
              </div>
              <button 
                onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                disabled={pageNumber >= (numPages || 1)}
                className="p-2.5 hover:bg-white/10 rounded-xl text-white/70 disabled:opacity-20 transition-all"
              >
                <ChevronRight size={20} />
              </button>
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              <button 
                onClick={() => setScale(s => Math.min(3, s + 0.2))}
                className="p-2.5 hover:bg-white/10 rounded-xl text-white/70 transition-all"
              >
                <ZoomIn size={20} />
              </button>
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                className="p-2.5 hover:bg-white/10 rounded-xl text-white/70 transition-all"
              >
                <ZoomOut size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            <a 
              href={activeFile?.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 pr-4 pl-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-2xl shadow-indigo-500/30 transition-all group"
            >
              <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
              Descargar
            </a>
          </div>
          <button 
            onClick={onClose}
            className="group flex items-center gap-3 pl-4 pr-3 py-2 bg-rose-500/10 hover:bg-rose-500 rounded-xl transition-all border border-rose-500/20 text-rose-500 hover:text-white shadow-2xl hover:shadow-rose-500/20"
          >
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">Salir</span>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Workspace */}
        <div className="flex-1 relative overflow-auto p-12 flex items-start justify-center bg-[#05070a] shadow-inner custom-scrollbar bg-dots-grid">
          <div 
            ref={containerRef}
            className="relative shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)] cursor-crosshair group/view overflow-visible"
          >
            {isImage ? (
              <div className="relative w-full bg-white rounded-sm overflow-hidden" onClick={handleCanvasClick}>
                <img 
                  src={activeFile.url} 
                  alt={activeFile.name}
                  className="w-full h-auto block select-none"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-indigo-900/5 opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            ) : activeFile?.url && activeFile.url !== '#' ? (
              <div className="relative" onClick={handleCanvasClick}>
                <Document
                  file={activeFile.url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center p-20 min-h-[800px] bg-[#1a1c23] w-[800px] rounded-2xl border border-white/5">
                      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-indigo-500/20"></div>
                      <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">
                        Iniciando Motor Renderizado Sole...
                      </p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center p-20 min-h-[800px] bg-[#1a1c23] w-[800px] rounded-2xl border border-rose-500/10">
                      <div className="w-24 h-24 bg-rose-500/5 rounded-[2.5rem] flex items-center justify-center mb-10">
                        <FileText size={48} className="text-rose-500/30" />
                      </div>
                      <p className="text-lg font-black text-white uppercase tracking-tighter">Visualización Técnica no Disponible</p>
                      <p className="text-xs font-bold text-slate-500 mt-6 max-w-sm uppercase tracking-widest text-center leading-relaxed">
                        Este archivo PDF presenta restricciones de seguridad del servidor. Prueba descargándolo directamente.
                      </p>
                    </div>
                  }
                >
                  <div className="relative shadow-2xl bg-white border border-white">
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      className="shadow-2xl select-none"
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                    <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    {/* Page Scanner Effect */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500/50 w-full animate-scan z-20 pointer-events-none shadow-[0_0_15px_rgba(79,70,229,0.8)]"></div>
                  </div>
                </Document>
              </div>
            ) : (
              <div className="w-[850px] min-h-[1100px] bg-[#1a1c23] rounded-3xl border border-white/5 flex flex-col items-center justify-center p-24 text-center">
                <div className="w-32 h-32 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center mb-12 shadow-inner border border-white/5">
                  <FileText size={56} className="text-indigo-600/30" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Error de Referencia</h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  No se ha detectado el recurso fuente para este arte.
                </p>
              </div>
            )}

            {/* Comments Indicators - Logic Updated to handle scaling */}
            {comments.map((comment, index) => (
              <motion.div 
                key={comment.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-2xl flex items-center justify-center shadow-2xl transition-all cursor-pointer group/pin z-40 border-2 ${
                  comment.resolved 
                    ? 'bg-emerald-500 border-emerald-300 text-white opacity-40 grayscale-[0.5]' 
                    : 'bg-indigo-600 border-indigo-300 text-white hover:scale-110 active:scale-95 shadow-indigo-500/50'
                }`}
                style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
              >
                <span className="text-[14px] font-black font-mono">{index + 1}</span>
                
                {/* Floating Preview - Enhanced Design */}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 w-80 p-8 bg-white/95 backdrop-blur shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-[2.5rem] opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-all scale-90 group-hover/pin:scale-100 z-[100] border border-white/20">
                  <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[12px]">
                        {comment.user.charAt(0)}
                      </div>
                      <div>
                        <span className="block text-[11px] font-black uppercase text-slate-800 tracking-widest">{comment.user}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block"> Auditor Técnico</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-800 leading-relaxed italic pr-4">"{comment.text}"</p>
                  <div className="mt-6 pt-5 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{format(new Date(comment.date), 'dd MMM · HH:mm')}</span>
                    {comment.resolved ? (
                      <span className="px-3 py-1 bg-emerald-500/10 rounded-lg text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 border border-emerald-500/20">
                        <CheckCircle size={12} /> Validado
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 border border-indigo-500/20">
                        <Clock size={12} /> Sugerido
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* New Comment Cursor */}
            {clickPosition && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute w-16 h-16 -ml-8 -mt-8 bg-indigo-600 border-4 border-white rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl z-50 overflow-hidden"
                style={{ left: `${clickPosition.x}%`, top: `${clickPosition.y}%` }}
              >
                <Plus size={32} strokeWidth={4} />
                <motion.div 
                  className="absolute inset-0 bg-white/20"
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Audit Sidebar */}
        <div className="w-[480px] bg-[#0a0c10] border-l border-white/5 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.6)] shrink-0 z-10">
          <div className="p-10 border-b border-white/5 bg-[#0a0c10]/50 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                Observaciones Técnicas
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 transition-all hover:bg-white/10 group/stat">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Pendientes</p>
                  <Clock size={14} className="text-rose-400 opacity-40" />
                </div>
                <p className="text-4xl font-black text-white">{comments.filter(c => !c.resolved).length}</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 transition-all hover:bg-white/10 group/stat">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Atendidos</p>
                  <CheckCircle size={14} className="text-emerald-400 opacity-40" />
                </div>
                <p className="text-4xl font-black text-white">{comments.filter(c => c.resolved).length}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              {isAddingComment && (
                <motion.div 
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="bg-indigo-600 rounded-[3rem] p-10 shadow-3xl shadow-indigo-900/50 border border-indigo-400/30"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <span className="block text-[13px] font-black text-white uppercase tracking-widest leading-none">Nuevos hallazgos</span>
                      <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-tighter opacity-70 mt-1 block">Ubicación guardada</span>
                    </div>
                  </div>
                  
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Describe la observación técnica detallada..."
                    className="w-full bg-indigo-900/40 border-2 border-white/20 rounded-[2rem] p-6 text-base font-semibold text-white placeholder:text-indigo-200/50 focus:outline-none focus:ring-8 focus:ring-white/10 focus:border-white transition-all resize-none h-48"
                    autoFocus
                  />
                  
                  <div className="flex gap-4 mt-8">
                    <button 
                      onClick={() => {
                        setIsAddingComment(false);
                        setNewComment('');
                        setClickPosition(null);
                      }}
                      className="flex-1 py-5 text-[12px] font-black text-indigo-100 uppercase tracking-[0.2em] hover:bg-white/10 rounded-2xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="flex-1 bg-white hover:bg-indigo-50 py-5 rounded-[1.5rem] text-[12px] font-black text-indigo-700 uppercase tracking-[0.2em] transition-all shadow-2xl disabled:opacity-50 active:scale-95"
                    >
                      Notificar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              {comments.length === 0 && !isAddingComment ? (
                <div className="py-32 text-center px-12 opacity-30">
                  <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/5">
                    <MessageSquare size={32} className="text-slate-500" />
                  </div>
                  <h4 className="text-base font-black text-slate-400 uppercase tracking-[0.3em]">Auditoría Limpia</h4>
                  <p className="text-[10px] font-bold text-slate-600 mt-6 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                    No se han detectado observaciones críticas hasta el momento.
                  </p>
                </div>
              ) : (
                comments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((comment, i) => (
                  <motion.div 
                    key={comment.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-10 rounded-[3rem] border-2 transition-all group/card ${
                      comment.resolved 
                        ? 'bg-emerald-500/5 border-emerald-500/10' 
                        : 'bg-white/[0.03] border-white/5 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20">
                          #{comments.length - i}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-white uppercase tracking-widest leading-none">{comment.user}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1.5">{format(new Date(comment.date), 'dd MMM · HH:mm')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[16px] font-semibold text-slate-200 leading-relaxed italic pl-6 border-l-4 border-indigo-600 mb-8">
                      "{comment.text}"
                    </p>
                    
                    {!comment.resolved ? (
                      <button 
                        onClick={() => onResolveComment(comment.id)}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-500 hover:bg-emerald-400 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest shadow-2xl shadow-emerald-500/30 transition-all border border-emerald-400/50 active:scale-95"
                      >
                        <CheckCircle size={16} /> Mark as Resolved
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-3 py-4 bg-emerald-500/10 rounded-2xl text-[11px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20 cursor-default">
                        <CheckCircle size={16} /> Validated Correctly
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
          
          {/* Thumbnails */}
          <div className="p-10 bg-black/40 border-t border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-5 px-2">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Versiones del Arte</span>
              <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-500/10 px-3 py-1 rounded-lg">{activeFileIndex + 1} / {files.length}</span>
            </div>
            <div className="flex items-center gap-5 overflow-x-auto pb-4 custom-scrollbar-thin">
              {files.map((file, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`group relative shrink-0 w-24 h-24 rounded-[2rem] transition-all border-2 overflow-hidden ${
                    activeFileIndex === idx ? 'border-indigo-500 scale-110 shadow-2xl shadow-indigo-500/40' : 'border-white/10 opacity-30 hover:opacity-100 hover:border-white/20'
                  }`}
                >
                  {(file.type.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i) || (file.url.includes('unsplash.com') && !file.url.includes('.pdf'))) ? (
                    <img src={file.url} className="w-full h-full object-cover transition-transform group-hover:scale-125" />
                  ) : (
                    <div className="w-full h-full bg-indigo-950 flex flex-col items-center justify-center text-center p-3">
                      <FileText size={20} className="text-indigo-400/50 mb-1" />
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">PDF</div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 bg-black/60 backdrop-blur rounded-lg border border-white/10 text-[9px] font-black text-white">V{idx + 1}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Plus = ({ size, strokeWidth = "4", className }: { size: number, strokeWidth?: string | number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
