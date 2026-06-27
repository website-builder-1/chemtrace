import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { ScreeningResult } from '@/lib/controlledSubstances';

interface Props {
  result: ScreeningResult;
  query: string;
  onClose: () => void;
  /** Only invoked when the screening action is 'warn'. */
  onAcknowledge?: () => void;
}

/**
 * Blocking modal for controlled / illegal substances and dual-use precursors.
 * Renders inline (no portal) — sits over the main view via fixed positioning.
 */
export default function ControlledSubstanceDialog({ result, query, onClose, onAcknowledge }: Props) {
  const isBlock = result.action === 'block';
  const Icon = isBlock ? ShieldAlert : AlertTriangle;
  const accent = isBlock ? 'hsl(var(--ct-status-red))' : 'hsl(var(--ct-status-gold))';
  const accentBg = isBlock ? 'hsl(0,90%,96%)' : 'hsl(38,90%,96%)';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(20,24,28,0.6)' }}>
      <div className="bg-card rounded-[4px] max-w-xl w-full overflow-hidden shadow-2xl" style={{ border: `1.5px solid ${accent}` }}>
        <div className="flex items-start justify-between px-5 py-4" style={{ backgroundColor: accentBg, borderBottom: `1px solid ${accent}` }}>
          <div className="flex items-start gap-3">
            <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: accent }} />
            <div>
              <h2 className="font-serif-display font-bold text-base" style={{ color: 'hsl(var(--ct-ink))' }}>
                {isBlock ? 'Synthesis planning refused' : 'Heightened-disclaimer review'}
              </h2>
              <p className="font-mono-data uppercase text-[0.6rem] tracking-wider mt-0.5" style={{ color: accent }}>
                {result.category.replace(/_/g, ' ')} · matched: {result.matchedName}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[hsl(var(--ct-muted))] hover:text-[hsl(var(--ct-ink))]" style={{ minWidth: 32, minHeight: 32 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="font-body text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>
            You searched for <span className="font-mono-data px-1.5 py-0.5 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))' }}>{query}</span>.
          </p>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>
            {result.reason}
          </p>

          <div className="p-3 rounded-[3px]" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderLeft: `3px solid ${accent}` }}>
            <div className="font-mono-data uppercase text-[0.6rem] tracking-wider mb-1" style={{ color: 'hsl(var(--ct-muted))' }}>RELEVANT AUTHORITY</div>
            <p className="font-body text-xs leading-relaxed" style={{ color: 'hsl(var(--ct-ink))' }}>{result.authority}</p>
          </div>

          {isBlock ? (
            <p className="font-body italic text-xs leading-relaxed" style={{ color: 'hsl(var(--ct-muted))' }}>
              Chemtraceit will not return synthesis routes, reagent lists, or procurement intelligence for this substance. If you are an accredited researcher with a legitimate need, work through your institution's controlled-substances officer and authorised supplier channels — not this tool.
            </p>
          ) : (
            <p className="font-body italic text-xs leading-relaxed" style={{ color: 'hsl(var(--ct-muted))' }}>
              You may continue if your work is for a lawful and licensed purpose (academic research, regulated manufacturing, analytical reference standards, forensic analysis). By proceeding you confirm that you accept full responsibility for compliance with the applicable legislation above in your jurisdiction.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ backgroundColor: 'hsl(var(--ct-paper2))', borderTop: '1px solid hsl(var(--ct-border))' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[3px] font-mono-data text-xs uppercase tracking-wider"
            style={{ border: '1px solid hsl(var(--ct-border))', color: 'hsl(var(--ct-ink))', minHeight: 36 }}
          >
            {isBlock ? 'Close' : 'Cancel'}
          </button>
          {!isBlock && onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="px-4 py-2 rounded-[3px] font-mono-data text-xs uppercase tracking-wider text-white"
              style={{ backgroundColor: accent, minHeight: 36 }}
            >
              I acknowledge — proceed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
