import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "user";

export function useAuth() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Subscribe FIRST per Supabase guidance
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Invalidate role queries when auth changes
      qc.invalidateQueries({ queryKey: ["role"] });
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const user: User | null = session?.user ?? null;

  const roleQ = useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole> => {
      const { data, error } = await supabase.rpc("current_user_role");
      if (error) throw error;
      return (data as AppRole) ?? "user";
    },
  });

  return {
    session,
    user,
    role: roleQ.data ?? null,
    isAdmin: roleQ.data === "admin",
    isLoading: authLoading || (!!user && roleQ.isLoading),
  };
}
