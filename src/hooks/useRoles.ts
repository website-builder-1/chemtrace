import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TERMS_VERSION } from '@/content/terms';

export interface RoleState {
  loading: boolean; userId: string | null; email: string | null;
  isAdmin: boolean; isModerator: boolean; isClient: boolean; hasAccess: boolean;
  needsPassword: boolean; needsTerms: boolean; displayName: string | null;
  reload: () => void;
}

const empty = { loading: false, userId: null, email: null, isAdmin: false, isModerator: false, isClient: false, hasAccess: false, needsPassword: false, needsTerms: false, displayName: null };

export function useRoles(): RoleState {
  const [state, setState] = useState<Omit<RoleState, 'reload'>>({ ...empty, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setState(empty); return; }
      const [{ data }, { data: prof }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('profiles').select('display_name, must_change_password, terms_version').eq('id', user.id).maybeSingle(),
      ]);
      const roles = (data ?? []).map(r => r.role as string);
      const isAdmin = roles.includes('admin'), isModerator = roles.includes('moderator'), isClient = roles.includes('client');
      if (active) setState({
        loading: false, userId: user.id, email: user.email ?? null, isAdmin, isModerator, isClient,
        hasAccess: isAdmin || isModerator || isClient,
        needsPassword: !!prof?.must_change_password,
        needsTerms: prof?.terms_version !== TERMS_VERSION,
        displayName: prof?.display_name ?? null,
      });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e !== 'TOKEN_REFRESHED') setTimeout(load, 0); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [tick]);
  return { ...state, reload: () => setTick(t => t + 1) };
}
