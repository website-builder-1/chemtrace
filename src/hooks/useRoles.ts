import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleState { loading: boolean; userId: string | null; isAdmin: boolean; isModerator: boolean }

export function useRoles(): RoleState {
  const [state, setState] = useState<RoleState>({ loading: true, userId: null, isAdmin: false, isModerator: false });
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setState({ loading: false, userId: null, isAdmin: false, isModerator: false }); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const roles = (data ?? []).map(r => r.role);
      if (active) setState({ loading: false, userId: user.id, isAdmin: roles.includes('admin'), isModerator: roles.includes('moderator') });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(load, 0); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return state;
}
