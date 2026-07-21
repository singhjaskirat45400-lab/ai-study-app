'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Plus, 
  Mic, 
  MicOff,
  ChevronDown, 
  Copy, 
  Check,
  Square,
  RotateCcw,
  Paperclip,
  Camera,
  FileText,
  X
} from 'lucide-react';

interface AttachedFile {
  base64: string;
  mimeType: string;
  fileName: string;
  previewUrl?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
}

const fileToBase64 = (file: File): Promise<AttachedFile> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputMimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMimeType, 0.75);
        const base64String = dataUrl.split(',')[1];

        URL.revokeObjectURL(objectUrl);
        resolve({
          base64: base64String,
          mimeType: outputMimeType,
          fileName: file.name,
          previewUrl: dataUrl,
        });
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        resolve({
          base64: base64String,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name,
          previewUrl: undefined,
        });
      };
      reader.onerror = (error) => reject(error);
    }
  });
};

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-neutral-800/80 bg-[#121316]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1b1e] text-xs text-neutral-400 border-b border-neutral-800/60 select-none">
        <span className="font-mono text-neutral-300 lowercase">{language || 'code'}</span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <SyntaxHighlighter
        language={language || 'javascript'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.85rem',
          lineHeight: '1.5',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default function EdithMinimal() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const secondaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('edith_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved chat history', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('edith_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
    if (secondaryTextareaRef.current) {
      secondaryTextareaRef.current.style.height = 'auto';
      secondaryTextareaRef.current.style.height = `${Math.min(secondaryTextareaRef.current.scrollHeight, 160)}px`;
    }
  }, [query]);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setQuery(currentTranscript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
    setShowPlusMenu(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFileSelector = () => fileInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const handleNewChat = () => {
    if (loading) handleStopGeneration();
    setMessages([]);
    setSelectedFiles([]);
    localStorage.removeItem('edith_chat_history');
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (loading) {
      handleStopGeneration();
      return;
    }

    if (!query.trim() && selectedFiles.length === 0) return;

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
    }

    const currentQuery = query.trim();
    const currentFiles = [...selectedFiles];
    
    setQuery('');
    setSelectedFiles([]);

    const processedFiles: AttachedFile[] = [];
    const imagePreviews: string[] = [];

    for (const file of currentFiles) {
      try {
        const fileObj = await fileToBase64(file);
        processedFiles.push(fileObj);
        if (fileObj.previewUrl) {
          imagePreviews.push(fileObj.previewUrl);
        }
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }

    // Capture history before adding current message
    const previousHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev, 
      { 
        role: 'user', 
        content: currentQuery, 
        imageUrls: imagePreviews.length > 0 ? imagePreviews : undefined 
      },
      { role: 'assistant', content: '' }
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: previousHistory,
          query: currentQuery,
          files: processedFiles
        }), 
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[${res.status}] ${errorText || res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx] && updated[lastIdx].role === 'assistant') {
            updated[lastIdx].content += chunkText;
          }
          return updated;
        });
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx] && updated[lastIdx].role === 'assistant') {
            updated[lastIdx].content = `⚠️ Connection error: ${error.message || 'Failed to generate response'}`;
          }
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatContent = (raw: string) => {
    let clean = raw;
    if (clean.startsWith('{"text":')) {
      try {
        const parsed = JSON.parse(clean);
        clean = parsed.text || clean;
      } catch {
        clean = clean.replace(/^{"text":"/, '').replace(/"}$/, '');
      }
    }
    return clean.replace(/\\n/g, '\n');
  };

  const FileBadgeList = () => (
    selectedFiles.length > 0 ? (
      <div className="mb-2 flex flex-wrap gap-2 animate-in fade-in zoom-in-95">
        {selectedFiles.map((file, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-[#282a2e] border border-neutral-700/50 rounded-xl px-3 py-1.5 text-xs text-neutral-200 w-fit">
            <Paperclip size={13} className="text-blue-400" />
            <span className="truncate max-w-[150px]">{file.name}</span>
            <button type="button" onClick={() => removeFile(idx)} className="hover:text-white ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="h-screen bg-[#0b0b0d] text-[#e3e3e3] font-sans overflow-hidden flex flex-col relative bg-[radial-gradient(circle_at_center,rgba(28,45,88,0.48)_0%,rgba(11,11,13,1)_65%)]">
      
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/*"
        capture="environment"
        ref={cameraInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />

      {messages.length > 0 && (
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 z-30 bg-gradient-to-b from-[#0b0b0d]/90 to-transparent backdrop-blur-sm">
          <div className="text-sm font-semibold text-neutral-400 tracking-wider select-none">EDITH</div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-[#1e1f22]/80 hover:bg-[#282a2e] border border-neutral-700/40 rounded-full transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw size={13} />
            <span>New Chat</span>
          </button>
        </header>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col z-10 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-2xl w-full mx-auto space-y-[26px]">
            <h1 className="text-[34px] md:text-[38px] font-normal text-neutral-200/95 tracking-normal text-center select-none">
              What's the vibe today?
            </h1>
            
            <form onSubmit={handleSearch} className="w-full relative">
              <FileBadgeList />

              <div className="flex items-end bg-[#1e1f22]/60 border border-neutral-700/30 rounded-3xl pl-3 pr-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl w-full focus-within:border-neutral-600/50 transition-all relative">
                <div className="relative" ref={menuRef}>
                  <button 
                    type="button" 
                    onClick={() => setShowPlusMenu((prev) => !prev)}
                    title="Add attachment or take photo"
                    className={`w-[34px] h-[34px] flex items-center justify-center text-neutral-300 rounded-full transition-all shrink-0 mb-0.5 cursor-pointer ${
                      showPlusMenu ? 'bg-[#404249] text-white rotate-45' : 'bg-[#2b2c30] hover:bg-[#38393e]'
                    }`}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>

                  {showPlusMenu && (
                    <div className="absolute bottom-12 left-0 w-48 bg-[#1e1f22] border border-neutral-700/60 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <button
                        type="button"
                        onClick={openFileSelector}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-200 hover:bg-[#282a2e] rounded-xl transition-colors text-left"
                      >
                        <FileText size={15} className="text-blue-400" />
                        <span>Attach Files / Images</span>
                      </button>
                      <button
                        type="button"
                        onClick={openCamera}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-200 hover:bg-[#282a2e] rounded-xl transition-colors text-left"
                      >
                        <Camera size={15} className="text-emerald-400" />
                        <span>Capture Photo</span>
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Listening..." : "Ask Edith"}
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-neutral-500 px-3 py-1.5 text-[16px] focus:outline-none resize-none overflow-y-auto max-h-40 leading-relaxed custom-scrollbar"
                />

                <div className="flex items-center gap-1 bg-[#282a2e]/80 border border-neutral-700/30 rounded-lg pl-3 pr-2.5 py-1.5 text-neutral-400 text-xs mr-2 mb-1 hover:text-white transition-all cursor-pointer shrink-0 select-none">
                  <span className="font-medium tracking-wide">Flash</span>
                  <ChevronDown size={12} className="opacity-70" />
                </div>

                {loading ? (
                  <button 
                    type="button" 
                    onClick={handleStopGeneration}
                    className="w-[34px] h-[34px] flex items-center justify-center text-white bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold transition-all cursor-pointer shrink-0 mb-0.5"
                  >
                    <Square size={13} className="fill-white" />
                  </button>
                ) : query.trim() || selectedFiles.length > 0 ? (
                  <button 
                    type="submit" 
                    className="w-[34px] h-[34px] flex items-center justify-center text-black bg-white rounded-full font-bold transition-all cursor-pointer text-base shrink-0 hover:bg-neutral-200 mb-0.5 animate-in fade-in zoom-in-75 duration-200"
                  >
                    ↑
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    title="Speak prompt"
                    className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all shrink-0 mb-0.5 cursor-pointer ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'text-neutral-300 bg-[#2b2c30] hover:bg-[#38393e]'
                    }`}
                  >
                    {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 pt-20 pb-36 space-y-8">
            {messages.map((msg, index) => (
              <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-[#2b2c30] text-neutral-100 p-3 rounded-2xl max-w-[85%] text-sm font-medium self-end space-y-2">
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.imageUrls.map((url, imgIdx) => (
                          <div key={imgIdx} className="rounded-xl overflow-hidden border border-neutral-700/60 max-w-xs">
                            <img 
                              src={url} 
                              alt="Uploaded attachment" 
                              className="w-full h-auto object-cover max-h-64 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                ) : (
                  <div className="group relative w-full pt-2">
                    <button 
                      onClick={() => handleCopy(msg.content, index)} 
                      className="absolute -top-3 right-0 p-1.5 bg-[#2b2c30]/80 border border-neutral-700/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-white cursor-pointer z-10"
                    >
                      {copiedIndex === index ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>

                    <div className="text-neutral-200 text-sm leading-relaxed break-words space-y-4">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-6 mb-2 text-white tracking-wide" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-3 space-y-2.5 marker:text-neutral-400" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-3 space-y-2.5 marker:text-neutral-400" {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');

                            return !inline && match ? (
                              <CodeBlock language={match[1]} value={codeString} />
                            ) : (
                              <code className="bg-neutral-800/80 px-1.5 py-0.5 rounded text-neutral-300 text-xs font-mono" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {formatContent(msg.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.content === '' && (
              <div className="flex items-center gap-1.5 py-2">
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/95 to-transparent pt-14 z-20">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <FileBadgeList />

            <div className="flex items-end bg-[#1e1f22]/90 border border-neutral-700/30 rounded-3xl pl-3 pr-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="relative" ref={menuRef}>
                <button 
                  type="button" 
                  onClick={() => setShowPlusMenu((prev) => !prev)}
                  title="Add attachment or take photo"
                  className={`w-[34px] h-[34px] flex items-center justify-center text-neutral-300 rounded-full transition-all shrink-0 mb-0.5 cursor-pointer ${
                    showPlusMenu ? 'bg-[#404249] text-white rotate-45' : 'bg-[#2b2c30] hover:bg-[#38393e]'
                  }`}
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>

                {showPlusMenu && (
                  <div className="absolute bottom-12 left-0 w-48 bg-[#1e1f22] border border-neutral-700/60 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={openFileSelector}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-200 hover:bg-[#282a2e] rounded-xl transition-colors text-left"
                    >
                      <FileText size={15} className="text-blue-400" />
                      <span>Attach Files / Images</span>
                    </button>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-200 hover:bg-[#282a2e] rounded-xl transition-colors text-left"
                    >
                      <Camera size={15} className="text-emerald-400" />
                      <span>Capture Photo</span>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={secondaryTextareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask Edith"}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-neutral-500 px-3 py-1.5 text-[16px] focus:outline-none resize-none overflow-y-auto max-h-40 leading-relaxed custom-scrollbar"
              />

              <div className="flex items-center gap-1 bg-[#282a2e]/80 border border-neutral-700/30 rounded-lg pl-3 pr-2.5 py-1.5 text-neutral-400 text-xs mr-2 mb-1 shrink-0 select-none">
                <span className="font-medium">Flash</span>
                <ChevronDown size={12} />
              </div>

              {loading ? (
                <button 
                  type="button" 
                  onClick={handleStopGeneration}
                  className="w-[34px] h-[34px] flex items-center justify-center text-white bg-neutral-700 hover:bg-neutral-600 rounded-full font-bold transition-all cursor-pointer shrink-0 mb-0.5"
                >
                  <Square size={13} className="fill-white" />
                </button>
              ) : query.trim() || selectedFiles.length > 0 ? (
                <button 
                  type="submit" 
                  className="w-[34px] h-[34px] flex items-center justify-center text-black bg-white rounded-full font-bold transition-all cursor-pointer text-base shrink-0 hover:bg-neutral-200 mb-0.5"
                >
                  ↑
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={toggleListening}
                  title="Speak prompt"
                  className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all shrink-0 mb-0.5 cursor-pointer ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'text-neutral-300 bg-[#2b2c30] hover:bg-[#38393e]'
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

    </div>
  );
}