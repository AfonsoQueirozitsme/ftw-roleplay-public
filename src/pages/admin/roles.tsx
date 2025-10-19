import React from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import type { Role, Permission } from '@/shared/permissions';

const RolesManagement: React.FC = () => {
  const { user } = useUser();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Fetch roles and permissions
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, permsRes] = await Promise.all([
          supabase.from('roles').select('*'),
          supabase.from('permissions').select('*')
        ]);

        if (rolesRes.error) throw rolesRes.error;
        if (permsRes.error) throw permsRes.error;

        setRoles(rolesRes.data);
        setPermissions(permsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch role permissions when a role is selected
  React.useEffect(() => {
    if (!selectedRole) return;

    const fetchRolePermissions = async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', selectedRole.id);

      if (error) {
        console.error('Error fetching role permissions:', error);
        return;
      }

      const permissionIds = data.map(rp => rp.permission_id);
      setSelectedRole(prev => ({
        ...prev!,
        permissions: permissions.filter(p => permissionIds.includes(p.id))
      }));
    };

    fetchRolePermissions();
  }, [selectedRole?.id, permissions]);

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: formData.get('name') as string,
          identifier: formData.get('identifier') as string,
          description: formData.get('description') as string
        })
        .select()
        .single();

      if (error) throw error;
      setRoles(prev => [...prev, data]);
      form.reset();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleCreatePermission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const { data, error } = await supabase
        .from('permissions')
        .insert({
          name: formData.get('name') as string,
          identifier: formData.get('identifier') as string,
          description: formData.get('description') as string
        })
        .select()
        .single();

      if (error) throw error;
      setPermissions(prev => [...prev, data]);
      form.reset();
    } catch (error) {
      console.error('Error creating permission:', error);
    }
  };

  const handleUpdateRolePermissions = async (permissionId: number, checked: boolean) => {
    if (!selectedRole) return;

    try {
      if (checked) {
        await supabase
          .from('role_permissions')
          .insert({
            role_id: selectedRole.id,
            permission_id: permissionId
          });
      } else {
        await supabase
          .from('role_permissions')
          .delete()
          .match({
            role_id: selectedRole.id,
            permission_id: permissionId
          });
      }

      // Refresh role permissions
      setSelectedRole(prev => ({
        ...prev!,
        permissions: checked
          ? [...(prev?.permissions || []), permissions.find(p => p.id === permissionId)!]
          : prev?.permissions?.filter(p => p.id !== permissionId) || []
      }));
    } catch (error) {
      console.error('Error updating role permissions:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Gestão de Roles e Permissões</h2>
        <p className="text-white/70 mb-6">Gere os roles e permissões do sistema.</p>

        <div className="grid grid-cols-2 gap-8">
          {/* Roles List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Roles</h3>
            <form onSubmit={handleCreateRole} className="space-y-4 border border-white/10 bg-black/40 p-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input type="text" name="name" required className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Identificador</label>
                <input type="text" name="identifier" required className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea name="description" className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <button type="submit" className="btn-primary w-full">Criar Role</button>
            </form>

            <div className="border border-white/10 bg-black/40 p-4">
              <ul className="space-y-2">
                {roles.map(role => (
                  <li key={role.id} className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedRole(role)}
                      className={`text-left p-2 w-full ${selectedRole?.id === role.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <span className="font-medium">{role.name}</span>
                      <span className="text-sm text-white/60 block">{role.identifier}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Permissions Management */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Permissões</h3>
            <form onSubmit={handleCreatePermission} className="space-y-4 border border-white/10 bg-black/40 p-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input type="text" name="name" required className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Identificador</label>
                <input type="text" name="identifier" required className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea name="description" className="w-full bg-black/40 border border-white/10 p-2 text-white" />
              </div>
              <button type="submit" className="btn-primary w-full">Criar Permissão</button>
            </form>

            {selectedRole ? (
              <div className="border border-white/10 bg-black/40 p-4">
                <h4 className="font-medium mb-4">Permissões de {selectedRole.name}</h4>
                <ul className="space-y-2">
                  {permissions.map(permission => {
                    const isChecked = selectedRole.permissions?.some(p => p.id === permission.id);
                    return (
                      <li key={permission.id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleUpdateRolePermissions(permission.id, e.target.checked)}
                          className="w-4 h-4 bg-black/40 border-white/10"
                        />
                        <div>
                          <span className="font-medium">{permission.name}</span>
                          <span className="text-sm text-white/60 block">{permission.identifier}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="border border-white/10 bg-black/40 p-4 text-white/60">
                Seleciona um role para gerir as suas permissões.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RolesManagement;