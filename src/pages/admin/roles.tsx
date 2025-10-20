import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Permission, RoleWithPermissions } from "@/shared/permissions";

type PermissionGroup = {
  key: string;
  label: string;
  items: Permission[];
};

const GROUP_LABELS: Record<string, string> = {
  admin: "Administração",
  support: "Suporte",
  supervise: "Supervisão",
  management: "Gestão",
  bugs: "Equipa de Bugs",
  group: "Grupos (legado)",
};

const DEFAULT_GROUP_LABEL = "Outros";

function getGroupKey(identifier: string): string {
  const [prefix] = identifier.split(".");
  return prefix || "misc";
}

function getGroupLabel(key: string): string {
  if (!key || key === "misc") return DEFAULT_GROUP_LABEL;
  return GROUP_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function buildRole(entry: RoleWithPermissions): RoleWithPermissions {
  const assigned =
    entry.role_permissions?.map((link) => link.permissions).filter((perm): perm is Permission => Boolean(perm)) ??
    [];
  return { ...entry, permissions: assigned };
}

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: rolesData, error: rolesError }, { data: permsData, error: permsError }] = await Promise.all([
          supabase
            .from("roles")
            .select(
              `
                *,
                role_permissions (
                  permission_id,
                  permissions:permission_id (
                    id,
                    name,
                    identifier,
                    description
                  )
                )
              `,
            )
            .order("name"),
          supabase.from("permissions").select("*").order("identifier"),
        ]);

        if (rolesError) throw rolesError;
        if (permsError) throw permsError;

        if (!alive) return;

        const mapped = (rolesData ?? []).map((role) => buildRole(role as RoleWithPermissions));
        setRoles(mapped);
        setPermissions((permsData ?? []) as Permission[]);

        if (!selectedRoleId && mapped.length > 0) {
          setSelectedRoleId(mapped[0].id);
        }
      } catch (err: any) {
        if (!alive) return;
        console.error("[roles] load failed", err);
        setError(err.message ?? "Ocorreu um erro ao obter os dados.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [selectedRoleId]);

  const selectedRole = useMemo(
    () => (selectedRoleId ? roles.find((role) => role.id === selectedRoleId) ?? null : null),
    [roles, selectedRoleId],
  );

  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const query = roleSearch.trim().toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.identifier.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query),
    );
  }, [roles, roleSearch]);

  const groupedPermissions = useMemo(() => {
    if (permissions.length === 0) return [];

    const groups = new Map<string, PermissionGroup>();

    permissions.forEach((permission) => {
      const key = getGroupKey(permission.identifier);
      if (!groups.has(key)) {
        groups.set(key, { key, label: getGroupLabel(key), items: [] });
      }
      groups.get(key)!.items.push(permission);
    });

    const result = Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.identifier.localeCompare(b.identifier)),
    }));

    return result.sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [permissions]);

  const filteredGroupedPermissions = useMemo(() => {
    if (!permissionSearch.trim()) return groupedPermissions;
    const query = permissionSearch.trim().toLowerCase();

    return groupedPermissions
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (perm) =>
            perm.identifier.toLowerCase().includes(query) ||
            (perm.name ?? "").toLowerCase().includes(query) ||
            (perm.description ?? "").toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedPermissions, permissionSearch]);

  const assignedPermissionIds = useMemo(() => {
    if (!selectedRole) return new Set<number>();
    return new Set((selectedRole.permissions ?? []).map((perm) => perm.id));
  }, [selectedRole]);

  const updateRoleInState = (roleId: number, updatedPermissionIds: Set<number>) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? {
              ...role,
              permissions: permissions.filter((perm) => updatedPermissionIds.has(perm.id)),
            }
          : role,
      ),
    );
  };

  const togglePermission = async (permissionId: number, enable: boolean) => {
    if (!selectedRole) return;
    setSavingPermissions(true);

    try {
      if (enable) {
        const { error } = await supabase.from("role_permissions").insert({
          role_id: selectedRole.id,
          permission_id: permissionId,
        });
        if (error) throw error;
        const next = new Set(assignedPermissionIds);
        next.add(permissionId);
        updateRoleInState(selectedRole.id, next);
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .match({ role_id: selectedRole.id, permission_id: permissionId });
        if (error) throw error;
        const next = new Set(assignedPermissionIds);
        next.delete(permissionId);
        updateRoleInState(selectedRole.id, next);
      }
    } catch (err) {
      console.error("[roles] Failed to toggle permission", err);
    } finally {
      setSavingPermissions(false);
    }
  };

  const togglePermissionGroup = async (group: PermissionGroup, enable: boolean) => {
    if (!selectedRole || group.items.length === 0) return;
    const ids = group.items.map((item) => item.id);
    const assigned = new Set(assignedPermissionIds);
    const targetIds = enable ? ids.filter((id) => !assigned.has(id)) : ids.filter((id) => assigned.has(id));
    if (targetIds.length === 0) return;

    setSavingPermissions(true);
    try {
      if (enable) {
        const payload = targetIds.map((id) => ({
          role_id: selectedRole.id,
          permission_id: id,
        }));
        const { error } = await supabase.from("role_permissions").insert(payload);
        if (error) throw error;
        targetIds.forEach((id) => assigned.add(id));
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", selectedRole.id)
          .in("permission_id", targetIds);
        if (error) throw error;
        targetIds.forEach((id) => assigned.delete(id));
      }
      updateRoleInState(selectedRole.id, assigned);
    } catch (err) {
      console.error("[roles] Failed to toggle group", err);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const { data: result, error: insertError } = await supabase
        .from("roles")
        .insert({
          name: (data.get("name") as string).trim(),
          identifier: (data.get("identifier") as string).trim(),
          description: (data.get("description") as string)?.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!result) return;

      const next: RoleWithPermissions = { ...(result as RoleWithPermissions), permissions: [] };
      setRoles((prev) => [...prev, next].sort((a, b) => a.name.localeCompare(b.name, "pt")));
      setSelectedRoleId(next.id);
      form.reset();
    } catch (err) {
      console.error("[roles] Failed to create role", err);
    }
  };

  const handleCreatePermission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const { data: result, error: insertError } = await supabase
        .from("permissions")
        .insert({
          name: (data.get("name") as string).trim(),
          identifier: (data.get("identifier") as string).trim(),
          description: (data.get("description") as string)?.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!result) return;

      setPermissions((prev) => [...prev, result as Permission].sort((a, b) => a.identifier.localeCompare(b.identifier)));
      form.reset();
    } catch (err) {
      console.error("[roles] Failed to create permission", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-black/40 p-12 text-center text-white/70">
          A carregar gestão de roles...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 p-6 text-white">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-400/40 bg-rose-500/20 p-8 text-center text-sm text-rose-50">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-zinc-900 p-6 text-white">
      <header className="max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de roles e permissões</h1>
        <p className="mt-2 text-sm text-white/70">
          Consulta todas as permissões disponíveis, cria perfis de acesso e aplica grupos completos com um clique.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Roles</h2>
                <p className="text-xs uppercase tracking-wide text-white/50">{roles.length} registo(s)</p>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="search"
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder="Filtrar por nome ou identificador..."
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <ul className="mt-4 space-y-2">
              {filteredRoles.map((role) => {
                const isActive = role.id === selectedRoleId;
                const totalPerms = role.permissions?.length ?? 0;
                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-emerald-400/50 bg-emerald-400/10 text-white"
                          : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{role.name}</div>
                          <div className="text-xs text-white/50">{role.identifier}</div>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                          {totalPerms} perm.
                        </span>
                      </div>
                      {role.description && (
                        <p className="mt-2 text-xs text-white/60">{role.description}</p>
                      )}
                    </button>
                  </li>
                );
              })}
              {filteredRoles.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
                  Sem roles para o filtro aplicado.
                </li>
              )}
            </ul>
          </div>

          <form
            onSubmit={handleCreateRole}
            className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <h3 className="text-lg font-semibold">Criar novo role</h3>
            <p className="text-xs text-white/60">Define nome, identificador único e uma descrição opcional.</p>

            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Nome
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Identificador
                <input
                  name="identifier"
                  required
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Descrição
                <textarea
                  name="description"
                  rows={3}
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-2xl border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:border-emerald-400/60 hover:bg-emerald-400/30"
            >
              Guardar role
            </button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            {selectedRole ? (
              <div className="space-y-6">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedRole.name}</h2>
                    <p className="text-xs uppercase tracking-wide text-white/50">{selectedRole.identifier}</p>
                    {selectedRole.description && (
                      <p className="mt-2 text-sm text-white/70">{selectedRole.description}</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">
                    {selectedRole.permissions?.length ?? 0} permissões atribuídas
                  </div>
                </header>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="search"
                      value={permissionSearch}
                      onChange={(event) => setPermissionSearch(event.target.value)}
                      placeholder="Filtrar permissões..."
                      className="flex-1 min-w-[200px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <div className="text-xs text-white/40">
                      {assignedPermissionIds.size} / {permissions.length} atribuídas
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {filteredGroupedPermissions.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
                      Sem permissões para o filtro aplicado.
                    </div>
                  )}

                  {filteredGroupedPermissions.map((group) => {
                    const allChecked = group.items.every((perm) => assignedPermissionIds.has(perm.id));
                    const partiallyChecked =
                      !allChecked && group.items.some((perm) => assignedPermissionIds.has(perm.id));

                    return (
                      <article key={group.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{group.label}</h3>
                            <p className="text-xs text-white/50">{group.items.length} permissões</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => togglePermissionGroup(group, !allChecked)}
                              disabled={savingPermissions}
                              className="rounded-xl border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-60"
                            >
                              {allChecked ? "Remover todas" : "Atribuir todas"}
                            </button>
                            {partiallyChecked && (
                              <span className="rounded-full border border-amber-400/50 bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-100">
                                Parcial
                              </span>
                            )}
                          </div>
                        </header>

                        <ul className="space-y-2">
                          {group.items.map((permission) => {
                            const checked = assignedPermissionIds.has(permission.id);
                            return (
                              <li
                                key={permission.id}
                                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                              >
                                <label className="flex flex-1 cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => togglePermission(permission.id, event.target.checked)}
                                    disabled={savingPermissions}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40"
                                  />
                                  <div>
                                    <div className="font-medium text-white">{permission.name}</div>
                                    <div className="text-xs uppercase tracking-wide text-white/40">
                                      {permission.identifier}
                                    </div>
                                    {permission.description && (
                                      <p className="mt-1 text-sm text-white/60">{permission.description}</p>
                                    )}
                                  </div>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-white/60">
                Seleciona um role para gerir as permissões.
              </div>
            )}
          </div>

          <form
            onSubmit={handleCreatePermission}
            className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <h3 className="text-lg font-semibold">Adicionar nova permissão</h3>
            <p className="text-xs text-white/60">
              Utiliza prefixos consistentes (ex.: <code className="font-mono">admin.*</code>,{" "}
              <code className="font-mono">support.*</code>) para agrupar automaticamente.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Nome
                <input
                  name="name"
                  required
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Identificador
                <input
                  name="identifier"
                  required
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-white/70">
                Descrição
                <textarea
                  name="description"
                  rows={3}
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-2xl border border-indigo-400/40 bg-indigo-400/20 px-4 py-2 text-sm font-semibold text-indigo-50 transition hover:border-indigo-400/60 hover:bg-indigo-400/30"
            >
              Guardar permissão
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default RolesManagement;

