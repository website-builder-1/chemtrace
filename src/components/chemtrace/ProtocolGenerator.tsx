import { useState } from 'react';
import type { PipelineResults } from '@/types/chemtrace';
import ReactMarkdown from 'react-markdown';
import SectionLabel from './SectionLabel';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chemtrace-agent`;

export default function ProtocolGenerator({ results }: { results: PipelineResults }) {
  const [protocol, setProtocol] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = async () => {
    setIsGenerating(true);
    setProtocol('');
    const rec = results.routes.find(r => r.id === results.recommendedRouteId)!;
    const prompt = `Generate a detailed synthesis protocol for ${results.molecule.name} using the ${rec.name} route. Batch size: ${results.batchSizeMg} mg. Include: equipment list, reagent quantities, step-by-step procedure with temperatures and times, safety precautions, purification steps, expected yield, and QC checkpoints. Production location: ${results.location}.`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: `Molecule: ${results.molecule.name}, SMILES: ${results.molecule.smiles}. Route: ${rec.name}. Steps: ${rec.steps.map(s => `${s.number}. ${s.description}`).join(' | ')}. Reagents: ${rec.reagents.join(', ')}.`,
          type: 'protocol',
        }),
      });

      if (!resp.ok || !resp.body) {
        setProtocol('Error generating protocol. Please try again.');
        setIsGenerating(false);
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
            if (content) { accumulated += content; setProtocol(accumulated); }
          } catch { /* partial */ }
        }
      }
    } catch {
      setProtocol('Connection error. Please try again.');
    }
    setIsGenerating(false);
  };

  const downloadProtocol = () => {
    const blob = new Blob([protocol], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chemtrace_protocol_${results.molecule.name.toLowerCase()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <SectionLabel label="PROTOCOL GENERATOR" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <button
          onClick={generate}
          disabled={isGenerating}
          className="px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider text-white transition-colors duration-150 disabled:opacity-50"
          style={{ backgroundColor: 'hsl(var(--ct-teal))' }}
          onMouseEnter={e => { if (!(e.target as HTMLButtonElement).disabled) (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal-hover))'; }}
          onMouseLeave={e => (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'}
        >
          {isGenerating ? 'Generating…' : 'Generate Synthesis Protocol (AI)'}
        </button>
        {protocol && (
          <button
            onClick={downloadProtocol}
            className="px-4 py-2.5 rounded-[3px] font-mono-data text-xs tracking-wider border transition-colors duration-150"
            style={{ borderColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-teal))' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.backgroundColor = 'hsl(var(--ct-teal))'; (e.target as HTMLElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; (e.target as HTMLElement).style.color = 'hsl(var(--ct-teal))'; }}
          >
            ↓ Download Protocol (.txt)
          </button>
        )}
      </div>
      <div
        className="bg-card border rounded-[3px] p-5 font-body text-sm leading-[1.75] whitespace-pre-wrap min-h-[160px]"
        style={{ borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))' }}
      >
        {protocol}
      </div>
    </section>
  );
}
