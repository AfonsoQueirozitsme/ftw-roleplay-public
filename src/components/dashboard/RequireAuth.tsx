import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    // Verifica sessão inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    // Subscreve a mudanças de sessão
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Estado de loading
  if (session === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="px-6 py-4 rounded-xl bg-white/10 border border-white/15">
          A verificar sessão…
        </div>
      </div>
    );
  }

  // Se não estiver autenticado → redireciona para /auth
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Caso contrário → renderiza os filhos (conteúdo protegido)
  return <>{children}</>;
}
