import { Link, useLocation } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';

/** Every page the signed-in person can open. */
export function usePages() {
  const { isAdmin, isModerator, hasAccess } = useRoles();
  return [
    { to: '/', label: 'Home' },
    ...(hasAccess ? [{ to: '/app', label: 'Synthesis tool' }, { to: '/research', label: 'Research' }] : []),
    { to: '/team', label: 'Team' },
    ...(isAdmin || isModerator ? [{ to: '/moderator', label: 'Moderator' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];
}

export default function PagesMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pages = usePages();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Pages" className="flex flex-col gap-1">
      <div className="font-mono-data text-[0.6rem] uppercase tracking-wider px-1 mb-1" style={{ color: 'hsl(var(--ct-sidebar-label))' }}>Go to</div>
      {pages.map(p => (
        <Link key={p.to} to={p.to} onClick={onNavigate}
          className="px-3 py-2 rounded-[3px] font-mono-data text-xs uppercase tracking-wider border"
          style={{ borderColor: pathname === p.to ? 'hsl(var(--ct-teal))' : 'transparent', color: 'hsl(var(--ct-sidebar-text))' }}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
