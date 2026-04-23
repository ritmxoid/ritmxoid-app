import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Trash2, Loader2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const AIAgent: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const modelMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      const errorMessage: Message = { 
        role: 'model', 
        parts: [{ text: `Ошибка: ${err.message}. Пожалуйста, проверьте настройки API ключа в .env.` }] 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-[#1b2531] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#33b5e5]/20 flex items-center justify-center text-[#33b5e5] shadow-[0_0_15px_rgba(51,181,229,0.3)]">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tighter">AI Агент Аналитик</h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Онлайн | Поиск матчей</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])}
          className="p-2 text-slate-500 hover:text-red-500 transition-colors"
          title="Очистить историю"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-[#33b5e5]/40">
              <Sparkles size={32} />
            </div>
            <div>
              <h3 className="text-white font-black uppercase text-sm mb-1 tracking-widest">Задайте вопрос агенту</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-bold tracking-tighter">
                Пример: "Найди сегодняшний матч Реала и проанализируй основной состав"
              </p>
            </div>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-[#33b5e5] text-black font-bold shadow-[0_4px_15px_rgba(51,181,229,0.3)]' 
                  : 'bg-white/5 border border-white/10 text-slate-200'
              }`}>
                {m.parts[0].text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-2">
              <Loader2 className="animate-spin text-[#33b5e5]" size={14} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Анализирую матч...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#1b2531]/50 border-t border-white/5">
        <div className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Спроси о футбольных ритмах..."
            className="w-full bg-black border border-white/10 rounded-2xl pl-4 pr-12 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white text-xs placeholder:text-slate-700"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#33b5e5] hover:bg-[#33b5e5]/10 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgent;
