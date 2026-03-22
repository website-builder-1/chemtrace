import { useState, useEffect, useRef } from 'react';
import type { PipelineResults, ChatMessage } from '@/types/chemtrace';
import SectionLabel from './SectionLabel';

const SUGGESTED_QUESTIONS = [
  'Why is this route preferred?',
  'What is the mechanism of step 2?',
  'What safety precautions are critical?',
  'Are there alternative catalysts?',
  'What are the key impurities to monitor?',
  'How does batch size affect yield?',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chemtrace-agent`;

interface Props {
  results: PipelineResults;
}

export default function AIAgentPanel({ results }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialDone, setInitialDone] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const buildContext = () => {
    const rec = results.routes.find(r => r.id === results.recommendedRouteId)!;
    return `Molecule: ${results.molecule.name} (${results.molecule.smiles}), MW: ${results.molecule.mw}, Location: ${results.location}. Recommended route: ${rec.name} (${rec.status}, yield ${rec.yieldPercent}%, £${rec.costPerGram}/g). Steps: ${rec.steps.map(s => `${s.number}. ${s.description}`).join(' | ')}. Reagents: ${rec.reagents.join(', ')}. ${results.routes.length} total routes evaluated.`;
  };

  const streamResponse = async (userMessages: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: userMessages.map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })),
          context: buildContext(),
        }),
      });

      if (!resp.ok || !resp.body) {
        const fallback = resp.status === 429 ? 'Rate limited. Please try again shortly.' : 'AI service unavailable.';
        setMessages(prev => [...prev, { role: 'agent', content: fallback }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'agent') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: accumulated } : m);
                }
                return [...prev, { role: 'agent', content: accumulated }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'agent', content: 'Connection error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!initialDone) {
      setInitialDone(true);
      const initMsg: ChatMessage = { role: 'user', content: 'Provide an expert analysis of the recommended synthesis route, explaining why it was chosen and what each step accomplishes chemically.' };
      streamResponse([initMsg]);
    }
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    streamResponse(updated);
  };

  return (
    <section>
      <SectionLabel label="CHEMTRACE AI AGENT" />

      {/* Header bar */}
      <div className="rounded-t-[3px] px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: 'hsl(var(--ct-agent-dark))' }}>
        <span className="inline-block w-2 h-2 rounded-full animate-ct-pulse" style={{ backgroundColor: 'hsl(var(--ct-agent-pulse))' }} />
        <span className="font-mono-data uppercase text-[0.63rem] tracking-wider text-white">CHEMTRACE AI · EXPERT CHEMISTRY ASSISTANT</span>
      </div>

      {/* Subheader */}
      <div className="border-x border-b px-4 py-2" style={{ borderColor: 'hsl(var(--ct-border))' }}>
        <p className="font-body text-sm" style={{ color: 'hsl(var(--ct-muted))' }}>
          Ask me anything about this synthesis — mechanisms, reagents, safety, procurement, or alternatives.
        </p>
      </div>

      {/* Messages */}
      <div className="mt-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="border p-4"
            style={{
              borderColor: 'hsl(var(--ct-border))',
              borderLeft: msg.role === 'agent' ? '3px solid hsl(var(--ct-teal))' : undefined,
              backgroundColor: msg.role === 'user' ? 'hsl(var(--ct-paper2))' : 'hsl(var(--card))',
              borderRadius: msg.role === 'agent' ? '0 3px 3px 0' : '3px 0 3px 3px',
            }}
          >
            <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-1" style={{ color: 'hsl(var(--ct-muted))' }}>
              {msg.role === 'agent' ? 'CHEMTRACE AI' : 'YOU'}
            </div>
            <div className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'hsl(var(--ct-ink))' }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && messages.length === 0 && (
          <div className="flex items-center gap-2 p-4">
            <div className="w-4 h-4 border-2 rounded-full animate-ct-spin" style={{ borderColor: 'hsl(var(--ct-teal))', borderTopColor: 'transparent' }} />
            <span className="font-mono-data text-xs" style={{ color: 'hsl(var(--ct-muted))' }}>Agent analysing routes…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested questions */}
      {initialDone && !isLoading && (
        <div className="mt-4">
          <div className="font-mono-data uppercase text-[0.58rem] tracking-wider mb-2" style={{ color: 'hsl(var(--ct-muted))' }}>SUGGESTED QUESTIONS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-left px-3 py-2 border rounded-[2px] font-body text-xs transition-colors duration-150"
                style={{
                  backgroundColor: 'hsl(var(--ct-paper2))',
                  borderColor: 'hsl(var(--ct-border))',
                  color: 'hsl(var(--ct-agent-dark))',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-paper2))'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-agent-dark))'; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat input */}
      <div className="mt-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="e.g. Why is Pd(OAc)₂ used here? What is the mechanism of step 2?"
          className="w-full border rounded-[3px] p-3 font-body text-sm resize-none bg-card"
          style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))' }}
          rows={2}
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="mt-2 px-4 py-1.5 rounded-[3px] font-mono-data text-xs tracking-wider text-white transition-colors duration-150 disabled:opacity-40"
          style={{ backgroundColor: 'hsl(var(--ct-teal))' }}
          onMouseEnter={e => { if (!(e.target as HTMLButtonElement).disabled) (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal-hover))'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; }}
        >
          Send →
        </button>
      </div>
    </section>
  );
}
