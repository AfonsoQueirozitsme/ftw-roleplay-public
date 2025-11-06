// src/components/admin/layout/useAdminGuard.ts
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getUserPermissions, clearPermissionsCache } from "@/shared/permissions";

type Perms = string[];

function isStaffByPerms(perms?: Perms | null): boolean {
  return !!perms?.some(
    (value) =>
      value.startsWith("ftw.") ||
      value.startsWith("group.ftw_") ||
      value === "admin.access" ||
      value.startsWith("admin.") ||
      value.startsWith("support.") ||
      value.startsWith("supervise.") ||
      value.startsWith("management.") ||
      value.startsWith("roles.") ||
      value.startsWith("users.") ||
      value.startsWith("logs.") ||
      value.startsWith("settings.") ||
      value.startsWith("resources.") ||
      value.startsWith("applications.") ||
      value.startsWith("analytics.") ||
      value.startsWith("vehicles.")
  );
}

export function useAdminGuard() {
  const [ready, setReady] = useState(false);
  const [perms, setPerms] = useState<Perms | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        setLoading(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) {
            navigate("/admin/login", { replace: true });
            setLoading(false);
            setReady(false);
          }
          return;
        }

        try {
          const userPerms = await getUserPermissions(user.id);
          
          if (cancelled) return;

          if (!isStaffByPerms(userPerms)) {
            console.warn("[admin-guard] User does not have staff permissions", { userId: user.id, perms: userPerms });
            navigate("/admin/login", { replace: true });
            setLoading(false);
            setReady(false);
            return;
          }

          setPerms(userPerms);
          setReady(true);
        } catch (permError) {
          console.error("[admin-guard] Failed to load permissions", permError);
          if (!cancelled) {
            navigate("/admin/login", { replace: true });
            setReady(false);
          }
        }
      } catch (err) {
        console.error("[admin-guard] Error checking access", err);
        if (!cancelled) {
          navigate("/admin/login", { replace: true });
          setReady(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkAccess();

    // Subscrever mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === "SIGNED_OUT" || !session) {
        clearPermissionsCache();
        navigate("/admin/login", { replace: true });
        setPerms(null);
        setReady(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearPermissionsCache(session.user.id);
        try {
          const userPerms = await getUserPermissions(session.user.id);
          if (!cancelled) {
            if (!isStaffByPerms(userPerms)) {
              navigate("/admin/login", { replace: true });
              setReady(false);
            } else {
              setPerms(userPerms);
              setReady(true);
            }
          }
        } catch (err) {
          console.error("[admin-guard] Failed to reload permissions on auth change", err);
          if (!cancelled) {
            navigate("/admin/login", { replace: true });
            setReady(false);
          }
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return { ready, perms, loading };
}

