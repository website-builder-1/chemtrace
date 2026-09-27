import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader, SiteFooter } from '@/components/site/SiteChrome';
import { EvidenceBadge, toEvidenceLevel } from '@/components/chemtrace/EvidenceBadge';
import { toast } from 'sonner';
import { Loader2, ExternalLink, BookmarkPlus } from 'lucide-react';

interface Evidence { id: string; kind: string; title: string; source: string; year?: number; url?: string; excerpt: string }
interface Claim { text: string; label: string; evidence: string[] }
interface Result { tier?: string; answer: string; claims: Claim[]; evidence: Evidence[]; trace?: string[]; model?: string; blocked?: boolean; latency_ms?: number }

const RATINGS = [
  { v: 'good', l: 'Good' }, { v: 'bad', l: 'Bad' }, { v: 'correct_this', l: 'Correct this' },
  { v: 'source_wrong', l: 'Source is wrong' }, { v: 'chemistry_wrong', l: 'Chemistry is wrong' }, { v: 'missing_info', l: 'Missing information' },
];

const muted = { color: 'hsl(var(--ct-muted))' };
const ink = { color: 'hsl(var(--ct-ink))' };

export default function Research() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'auto' | 'easy' | 'medium' | 'hard'>('auto');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [asked, setAsked] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [fbRating, setFbRating] = useState<string | null>(null);
  const [fbText, setFbText] = useState('');
  const [fbSource, setFbSource] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true); setRes(null); setFbRating(null); setAsked(q.trim());
    const { data, error } = await supabase.functions.invoke('orchestrator', { body: { question: q.trim(), tier } });
    setLoading(false);
    if (error || data?.error) {
      let msg = data?.error ?? error?.message ?? 'Something went wrong';
      try { const ctx = (error as { context?: Response })?.context; if (ctx) msg = (await ctx.json()).error ?? msg; } catch { /* keep msg */ }
      toast.error(msg);
      return;
    }
    setRes(data as Result);
  }

  async function sendFeedback() {
    if (!userId || !res || !fbRating) return;
    const needsText = fbRating !== 'good';
    if (needsText && !fbText.trim()) { toast.error('Please describe what was wrong.'); return; }
    const { error } = await supabase.from('feedback').insert({
      user_id: userId, question: asked, answer: res.answer, rating: fbRating,
      correction: fbText.trim() || null, reason: RATINGS.find(r => r.v === fbRating)?.l ?? null, source: fbSource.trim() || null,
    });
    if (error) toast.error(error.message); else { toast.success('Thanks — your feedback was recorded for review.'); setFbRating(null); setFbText(''); setFbSource(''); }
  }

  async function saveToProject() {
    if (!userId || !res) return;
    let { data: proj } = await supabase.from('projects').select('id').eq('user_id', userId).order('created_at').limit(1).maybeSingle();
    if (!proj) {
      const { data: created, error } = await supabase.from('projects').insert({ user_id: userId, name: 'My research' }).select('id').single();
      if (error) { toast.error(error.message); return; }
      proj = created;
    }
    const { error } = await supabase.from('project_items').insert({
      project_id: proj!.id, user_id: userId, item_type: 'answer', title: asked.slice(0, 120),
      payload: { answer: res.answer, claims: res.claims, evidence: res.evidence } as never,
    });
    if (error) toast.error(error.message); else toast.success('Saved to "My research".');
  }

  const counts = res?.claims.reduce<Record<string, number>>((a, c) => { const k = toEvidenceLevel(c.label); a[k] = (a[k] ?? 0) + 1; return a; }, {}) ?? {};

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'hsl(var(--ct-paper))' }}>
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-5 py-12 w-full">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--ct-teal))' }}>Chemical Intelligence Engine</div>
        <h1 className="font-serif-display text-3xl sm:text-4xl mt-3" style={ink}>Ask a chemistry question</h1>
        <p className="font-body mt-3 max-w-2xl" style={muted}>
          Answers are built from PubChem, a reaction database, open literature (Europe PMC, OpenAlex) and RDKit calculations.
          Every claim is labelled by how well it is supported.
        </p>

        <form onSubmit={ask} className="mt-8 bg-card border rounded-[3px] p-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>
          <textarea
            value={q} onChange={e => setQ(e.target.value)} rows={3} maxLength={2000}
            placeholder="e.g. How is paracetamol made, and under what conditions?"
            className="w-full bg-transparent font-body text-base outline-none resize-none" style={ink}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask(); }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex gap-1 font-mono-data text-[0.65rem] uppercase">
              {(['auto', 'easy', 'medium', 'hard'] as const).map(t => (
                <button type="button" key={t} onClick={() => setTier(t)} className="px-2 py-1 rounded-[2px] border"
                  style={{ borderColor: 'hsl(var(--ct-border))', backgroundColor: tier === t ? 'hsl(var(--ct-teal))' : 'transparent', color: tier === t ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-muted))' }}>
                  {t === 'auto' ? 'Auto depth' : t}
                </button>
              ))}
            </div>
            <button type="submit" disabled={loading || !q.trim()} className="px-5 py-2 rounded-[3px] font-mono-data text-xs uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2"
              style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {loading ? 'Researching…' : 'Ask'}
            </button>
          </div>
        </form>

        {loading && <p className="font-mono-data text-xs mt-4" style={muted}>Checking databases, literature and chemistry tools… this can take 20–60 seconds on free AI models.</p>}

        {res && (
          <div className="mt-8 space-y-6">
            <section className="bg-card border rounded-[3px] p-6" style={{ borderColor: 'hsl(var(--ct-border))' }}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {res.tier && <span className="font-mono-data text-[0.6rem] uppercase tracking-wider" style={muted}>Depth: {res.tier}</span>}
                {Object.entries(counts).map(([k, n]) => <span key={k} className="inline-flex items-center gap-1"><EvidenceBadge level={k as never} /><span className="font-mono-data text-[0.6rem]" style={muted}>×{n}</span></span>)}
              </div>
              <div className="prose prose-sm max-w-none font-body" style={ink}><ReactMarkdown>{res.answer}</ReactMarkdown></div>
              {!res.blocked && userId && (
                <button onClick={saveToProject} className="mt-4 inline-flex items-center gap-1 font-mono-data text-[0.65rem] uppercase" style={{ color: 'hsl(var(--ct-teal))' }}>
                  <BookmarkPlus className="w-3.5 h-3.5" /> Save to my research
                </button>
              )}
            </section>

            {res.claims.length > 0 && (
              <section>
                <h2 className="font-mono-data text-xs uppercase tracking-wider mb-3" style={muted}>Key claims and their support</h2>
                <ul className="space-y-2">
                  {res.claims.map((c, i) => (
                    <li key={i} className="bg-card border rounded-[3px] p-3 flex flex-col sm:flex-row sm:items-start gap-2" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                      <EvidenceBadge level={toEvidenceLevel(c.label)} className="shrink-0" />
                      <span className="font-body text-sm flex-1" style={ink}>{c.text}</span>
                      {c.evidence.length > 0 && <span className="font-mono-data text-[0.65rem]" style={muted}>{c.evidence.map(e => `[${e}]`).join(' ')}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {res.evidence.length > 0 && (
              <details className="bg-card border rounded-[3px] p-4" style={{ borderColor: 'hsl(var(--ct-border))' }} open>
                <summary className="font-mono-data text-xs uppercase tracking-wider cursor-pointer" style={muted}>Sources ({res.evidence.length})</summary>
                <ol className="mt-3 space-y-3">
                  {res.evidence.map(e => (
                    <li key={e.id} className="font-body text-sm">
                      <span className="font-mono-data text-xs mr-2" style={{ color: 'hsl(var(--ct-teal))' }}>[{e.id}]</span>
                      <span style={ink}>{e.title}</span>
                      <span className="font-mono-data text-[0.65rem] ml-2" style={muted}>{e.kind} · {e.source}{e.year ? ` · ${e.year}` : ''}</span>
                      {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex ml-2 align-middle" style={{ color: 'hsl(var(--ct-teal))' }}><ExternalLink className="w-3 h-3" /></a>}
                      <p className="text-xs mt-1 line-clamp-3" style={muted}>{e.excerpt}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {!res.blocked && (
              <section className="bg-card border rounded-[3px] p-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>
                <h2 className="font-mono-data text-xs uppercase tracking-wider mb-3" style={muted}>Was this answer right?</h2>
                {!userId ? (
                  <p className="font-body text-sm" style={muted}><Link to="/auth" className="underline" style={{ color: 'hsl(var(--ct-teal))' }}>Sign in</Link> to rate answers and submit corrections.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {RATINGS.map(r => (
                        <button key={r.v} onClick={() => setFbRating(r.v)} className="px-2.5 py-1 rounded-[2px] border font-mono-data text-[0.65rem] uppercase"
                          style={{ borderColor: 'hsl(var(--ct-border))', backgroundColor: fbRating === r.v ? 'hsl(var(--ct-teal))' : 'transparent', color: fbRating === r.v ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-ink))' }}>
                          {r.l}
                        </button>
                      ))}
                    </div>
                    {fbRating && (
                      <div className="mt-3 space-y-2">
                        {fbRating !== 'good' && (
                          <textarea value={fbText} onChange={e => setFbText(e.target.value)} rows={3} maxLength={2000} placeholder="What's wrong, and what's the correct information?"
                            className="w-full border rounded-[2px] p-2 font-body text-sm bg-transparent" style={{ borderColor: 'hsl(var(--ct-border))', ...ink }} />
                        )}
                        {fbRating !== 'good' && (
                          <input value={fbSource} onChange={e => setFbSource(e.target.value)} maxLength={500} placeholder="Source (DOI or URL), optional"
                            className="w-full border rounded-[2px] p-2 font-body text-sm bg-transparent" style={{ borderColor: 'hsl(var(--ct-border))', ...ink }} />
                        )}
                        <button onClick={sendFeedback} className="px-4 py-1.5 rounded-[3px] font-mono-data text-xs uppercase" style={{ backgroundColor: 'hsl(var(--ct-teal))', color: 'hsl(var(--ct-paper))' }}>Submit</button>
                        <p className="font-body text-xs" style={muted}>Corrections are reviewed before anything is treated as validated knowledge.</p>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {res.trace && (
              <details className="font-mono-data text-[0.65rem]" style={muted}>
                <summary className="cursor-pointer uppercase">How this answer was built</summary>
                <ul className="mt-2 space-y-0.5">{res.trace.map((t, i) => <li key={i}>• {t}</li>)}</ul>
                {res.latency_ms && <div className="mt-1">{(res.latency_ms / 1000).toFixed(1)} s</div>}
              </details>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
