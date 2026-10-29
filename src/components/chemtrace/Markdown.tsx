import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Shared renderer for all AI-generated text. Handles tables, maths/chemical
 * equations (\[ \], \( \), $$ $$) and consistent brand typography so raw
 * markdown or LaTeX never leaks into the UI.
 */
export function normaliseMarkdown(src: string): string {
  return (src || '')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)
    // Bare "[ \text{...} ]" blocks some models emit instead of \[ \]
    .replace(/^\s*\[\s*(\\[a-zA-Z][\s\S]*?)\s*\]\s*$/gm, (_, m) => `\n$$\n${m}\n$$\n`)
    // Table rows glued onto one line: "| a | b | | c | d |" → split rows
    .replace(/\|\s+\|(?=\s*[-:A-Za-z*])/g, '|\n|');
}

const c: Components = {
  h1: (p) => <h3 className="font-display text-lg mt-5 mb-2" {...p} />,
  h2: (p) => <h3 className="font-display text-base mt-5 mb-2" {...p} />,
  h3: (p) => <h4 className="font-body font-semibold text-sm mt-4 mb-1.5" {...p} />,
  h4: (p) => <h5 className="font-body font-semibold text-sm mt-3 mb-1" {...p} />,
  p: (p) => <p className="my-2 leading-relaxed" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 my-2 space-y-1" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 my-2 space-y-1" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold" {...p} />,
  a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
  hr: () => <hr className="my-4 border-border" />,
  blockquote: (p) => <blockquote className="border-l-2 border-primary pl-3 my-3 text-muted-foreground" {...p} />,
  code: ({ className, children, ...p }) => (
    <code className={`font-mono-data text-[0.8em] bg-muted px-1 py-0.5 rounded-[3px] ${className ?? ''}`} {...p}>{children}</code>
  ),
  pre: (p) => <pre className="bg-muted p-3 rounded-[3px] overflow-x-auto my-3 text-xs" {...p} />,
  table: (p) => (
    <div className="overflow-x-auto my-3 border border-border rounded-[3px]">
      <table className="w-full border-collapse text-xs" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-muted" {...p} />,
  th: (p) => <th className="text-left font-semibold px-3 py-2 border-b border-border align-top" {...p} />,
  td: (p) => <td className="px-3 py-2 border-b border-border align-top" {...p} />,
};

export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`ct-markdown font-body text-sm text-foreground max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={c}>
        {normaliseMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
