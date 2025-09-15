import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Se o provider devolveu erro via query string:
    const error_description = params.get("error_description");
    if (error_description) {
      setErr(error_description);
      return;
    }

    // Após o redirect OAuth, o Supabase já deve ter sessão armazenada.
    // Confirmamos e seguimos.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate("/dashboard", { replace: true });
      else setErr("Não foi possível concluir o login. Tenta novamente.");
    })();
  }, [navigate, params]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl p-10 backdrop-blur-xl bg-white/10 border border-white/15 text-center">
        <h1 className="text-xl font-semibold mb-2">A finalizar login…</h1>
        {!err ? (
          <p className="text-white/70">Aguarda um momento.</p>
        ) : (
          <p className="text-red-300">{err}</p>
        )}
      </div>
    </main>
  );
}
