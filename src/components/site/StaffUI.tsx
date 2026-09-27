import { ReactNode } from 'react';

export const inputCls = 'w-full px-3 py-2 rounded-[3px] font-body text-sm border bg-card focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ct-teal))]';
export const inputStyle = { borderColor: 'hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))' };

export function Btn({ children, onClick, variant = 'primary', disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' }) {
  const bg = variant === 'primary' ? 'hsl(var(--ct-teal))' : variant === 'danger' ? 'hsl(var(--ct-status-red))' : 'transparent';
  const color = variant === 'ghost' ? 'hsl(var(--ct-ink))' : 'hsl(var(--ct-paper))';
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-[3px] font-mono-data text-[0.65rem] uppercase tracking-wider border disabled:opacity-50"
      style={{ backgroundColor: bg, color, borderColor: variant === 'ghost' ? 'hsl(var(--ct-border))' : bg }}>
      {children}
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-[3px] mt-6" style={{ backgroundColor: 'hsl(var(--ct-paper2))' }}>
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className="px-4 py-2 rounded-[2px] font-mono-data text-xs uppercase tracking-wider"
          style={{ backgroundColor: value === k ? 'hsl(var(--ct-teal))' : 'transparent', color: value === k ? 'hsl(var(--ct-paper))' : 'hsl(var(--ct-muted))' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="bg-card border rounded-[3px] p-4 mt-4" style={{ borderColor: 'hsl(var(--ct-border))' }}>{children}</div>;
}

export const muted = { color: 'hsl(var(--ct-muted))' };
export const ink = { color: 'hsl(var(--ct-ink))' };
