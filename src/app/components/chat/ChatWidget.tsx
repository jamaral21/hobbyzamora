import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, ShoppingBag, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function splitUrlAndSuffix(token: string): { url: string; suffix: string } {
  // Evita que signos de puntuación de cierre queden dentro del href.
  const trailingPunctuation = /[\].,!?;:)}]+$/;
  const match = token.match(trailingPunctuation);

  if (!match) {
    return { url: token, suffix: '' };
  }

  const suffix = match[0];
  return {
    url: token.slice(0, -suffix.length),
    suffix,
  };
}

function linkifyProducts(text: string) {
  // Detecta URLs en el texto y las convierte en <a> clicables
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const { url, suffix } = splitUrlAndSuffix(part);

      if (!url) {
        return <span key={i}>{part}</span>;
      }

      return (
        <span key={i}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            style={{ color: 'var(--primary)' }}
          >
            <ShoppingBag size={12} />
            Ver producto
          </a>
          {suffix}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! 👋 Soy el asistente de HobbyZamora. ¿Buscas algún producto en particular? Puedo ayudarte a encontrar lo que necesitas.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();
      const reply = data.reply || 'No pude procesar tu consulta. Intenta de nuevo.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (!open) {
        setUnread((prev) => prev + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Hubo un error al conectar. Por favor intenta de nuevo.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Panel de chat */}
      <div
        aria-hidden={!open}
        className="fixed bottom-24 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] transition-all duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
          transformOrigin: 'bottom right',
        }}
      >
        <div
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid rgba(255,214,10,0.18)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,214,10,0.06), var(--glow-primary)',
            height: '480px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #12121a 100%)',
              borderBottom: '1px solid rgba(255,214,10,0.12)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--primary)',
                  boxShadow: 'var(--glow-primary)',
                }}
              >
                <Bot size={16} color="#0a0a0f" />
              </div>
              <div>
                <p
                  className="text-xs font-bold tracking-wider uppercase leading-none mb-0.5"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--primary)',
                    fontSize: '9px',
                  }}
                >
                  HobbyZamora
                </p>
                <p className="text-xs leading-none" style={{ color: 'var(--muted-foreground)' }}>
                  Asistente de productos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(0,230,118,0.12)',
                  color: 'var(--success)',
                  border: '1px solid rgba(0,230,118,0.2)',
                }}
              >
                en línea
              </span>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
                aria-label="Cerrar chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,214,10,0.15) transparent' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.2)' }}
                  >
                    <Bot size={12} style={{ color: 'var(--primary)' }} />
                  </div>
                )}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          borderRadius: '1rem 1rem 0.25rem 1rem',
                          fontFamily: 'var(--font-body)',
                        }
                      : {
                          background: 'var(--secondary)',
                          color: 'var(--foreground)',
                          border: '1px solid var(--border)',
                          borderRadius: '1rem 1rem 1rem 0.25rem',
                          fontFamily: 'var(--font-body)',
                        }
                  }
                >
                  {msg.role === 'assistant' ? linkifyProducts(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 flex-row">
                <div
                  className="w-6 h-6 rounded-lg shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.2)' }}
                >
                  <Bot size={12} style={{ color: 'var(--primary)' }} />
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem 1rem 1rem 0.25rem',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--muted-foreground)', animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--muted-foreground)', animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--muted-foreground)', animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,214,10,0.1)', background: 'var(--card)' }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'var(--secondary)',
                border: '1px solid var(--border)',
                transition: 'border-color 0.2s',
              }}
              onFocusCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,214,10,0.35)')}
              onBlurCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="¿Qué producto buscas?"
                disabled={loading}
                className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{
                  background: input.trim() && !loading ? 'var(--primary)' : 'transparent',
                  color: input.trim() && !loading ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}
                aria-label="Enviar mensaje"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p
              className="text-center mt-1.5 text-[10px]"
              style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-body)' }}
            >
              Solo respondo preguntas sobre productos
            </p>
          </div>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat de productos'}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
        style={{
          background: open ? 'var(--secondary)' : 'var(--primary)',
          color: open ? 'var(--foreground)' : 'var(--primary-foreground)',
          boxShadow: open
            ? '0 8px 24px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(0,0,0,0.4), var(--glow-primary)',
          transform: open ? 'scale(0.92)' : 'scale(1)',
          border: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <div
          className="transition-all duration-300"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </div>

        {/* Badge de no leídos */}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--destructive)', color: '#fff' }}
          >
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
