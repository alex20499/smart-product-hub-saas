
import React, { useState } from 'react';
import { UserPlus, Trash2, Key, ShieldAlert, Edit3, X, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void | Promise<void>;
  onUpdateUser: (user: User) => void | Promise<void>;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  t: (key: string) => string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users = [], onAddUser, onUpdateUser, onDeleteUser, currentUser, t }) => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) return;

    const isDuplicate = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (isDuplicate) {
      setFormError(t('username_exists'));
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: trimmedUsername,
      password: newPassword || '111111',
      role: newRole,
      avatar: `https://picsum.photos/seed/${trimmedUsername}/100/100`
    };
    if (trimmedUsername.includes('@')) newUser.email = trimmedUsername;

    try {
      await Promise.resolve(onAddUser(newUser));
      setIsAddFormOpen(false);
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      setFormError(err?.message || t('create_user_failed'));
    }
  };

  const openEditForm = (user: User) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(user.password || '');
    setNewRole(user.role);
    setFormError(null);
    setIsEditFormOpen(true);
    setIsAddFormOpen(false);
  };

  const closeEditForm = () => {
    setIsEditFormOpen(false);
    setEditingUserId(null);
  };

  const updateExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    const trimmedUsername = newUsername.trim();
    const isDuplicate = users.some(u => u.id !== editingUserId && u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (isDuplicate) {
      setFormError(t('username_exists'));
      return;
    }

    const update: User = {
      id: editingUserId,
      username: trimmedUsername,
      password: newPassword,
      role: newRole,
      avatar: `https://picsum.photos/seed/${trimmedUsername}/100/100`
    };
    if (trimmedUsername.includes('@')) update.email = trimmedUsername;
    try {
      await Promise.resolve(onUpdateUser(update));
      closeEditForm();
    } catch (err: any) {
      setFormError(err?.message || t('update_user_failed'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-12 sm:pb-20 font-['Inter']" data-page="users-inline-v2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-8 text-left">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-normal uppercase">{t('users')}</h1>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] sm:tracking-[0.5em] mt-1 sm:mt-2">{t('users_subtitle')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setIsAddFormOpen(!isAddFormOpen);
              if (isAddFormOpen) {
                setNewUsername('');
                setNewPassword('');
                setFormError(null);
              }
              setIsEditFormOpen(false);
            }}
            className={`flex items-center gap-3 sm:gap-4 px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-[2rem] font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] shadow-xl sm:shadow-2xl transition-all ${
              isAddFormOpen ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-[#38BDF8] text-slate-950 hover:brightness-110'
            }`}
          >
            <UserPlus size={18} /> {isAddFormOpen ? t('cancel') : t('provision_access')}
          </button>
        )}
      </div>

      {/* 新建用户 - 页面内联表单 */}
      {isAddFormOpen && (
        <div className="premium-card p-6 sm:p-8 border-white/5 border border-[#38BDF8]/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#38BDF8]/20 text-[#38BDF8] rounded-xl flex items-center justify-center border border-[#38BDF8]/20 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">{t('new_clearance')}</h3>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{t('add_member_subtitle')}</p>
            </div>
          </div>
          <form onSubmit={addUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('identifier')}</label>
                <input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder={t('username_placeholder')}
                  className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest transition-all ${formError ? 'border-red-500/50' : 'border-white/5 focus:border-[#38BDF8]/50'}`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('security_key')}</label>
                <input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  type="password"
                  placeholder={t('password_placeholder')}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest focus:border-[#38BDF8]/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('clearance')}</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest focus:border-[#38BDF8]/50 appearance-none"
                >
                  <option value="viewer" className="bg-slate-900">{t('role_viewer')}</option>
                  <option value="editor" className="bg-slate-900">{t('role_editor')}</option>
                  <option value="admin" className="bg-slate-900">{t('role_admin')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {formError && (
                <span className="text-red-400 text-[9px] font-black uppercase flex items-center gap-1.5">
                  <AlertCircle size={12} className="shrink-0" /> {formError}
                </span>
              )}
              <button type="submit" className="bg-[#38BDF8] text-slate-950 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">
                {t('execute_provision')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 编辑用户 - 页面内联表单 */}
      {isEditFormOpen && (
        <div className="premium-card p-6 sm:p-8 border-white/5 border border-[#A3E635]/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#A3E635]/20 text-[#A3E635] rounded-xl flex items-center justify-center border border-[#A3E635]/20 shrink-0">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">{t('edit_user')}</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{t('edit_member_subtitle')}</p>
              </div>
            </div>
            <button onClick={closeEditForm} className="p-2 text-slate-500 hover:text-white rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={updateExistingUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('identifier')}</label>
                <input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder={t('username_placeholder')}
                  className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest transition-all ${formError ? 'border-red-500/50' : 'border-white/5 focus:border-[#A3E635]/50'}`}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('security_key')}</label>
                <input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  type="password"
                  placeholder={t('password_placeholder_optional')}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest focus:border-[#A3E635]/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{t('clearance')}</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-black uppercase text-white outline-none tracking-widest focus:border-[#A3E635]/50 appearance-none"
                  disabled={editingUserId === currentUser.id}
                >
                  <option value="viewer" className="bg-slate-900">{t('role_viewer')}</option>
                  <option value="editor" className="bg-slate-900">{t('role_editor')}</option>
                  <option value="admin" className="bg-slate-900">{t('role_admin')}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {formError && (
                <span className="text-red-400 text-[9px] font-black uppercase flex items-center gap-1.5">
                  <AlertCircle size={12} className="shrink-0" /> {formError}
                </span>
              )}
              <button type="submit" className="bg-[#A3E635] text-slate-950 py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">
                {t('save_changes')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 用户列表 */}
      <div className="premium-card overflow-hidden border-white/5 shadow-2xl">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="bg-slate-800/20 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] sm:tracking-[0.4em] border-b border-white/5">
                <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">{t('entity_identifier')}</th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">{t('clearance')}</th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">{t('security')}</th>
                <th className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 text-right">{t('protocol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=818CF8&color=fff`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border border-white/10 p-0.5 shrink-0" alt={user.username} />
                      <div className="text-left">
                        <p className="font-black text-white uppercase tracking-widest text-sm">{user.username}</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]" title={user.email || (user.username?.includes('@') ? user.username : `${user.username || ''}@internal.local`)}>
                          {t('login_id')}: {user.email || (user.username?.includes('@') ? user.username : `${user.username || ''}@internal.local`)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
                    <span className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
                    {isAdmin && (
                      <button
                        onClick={() => openEditForm(user)}
                        className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[#38BDF8] transition-colors flex items-center gap-1.5 sm:gap-2 group/btn"
                      >
                        <Edit3 size={12} className="group-hover/btn:scale-110 transition-transform sm:w-3.5 sm:h-3.5 shrink-0" /> {t('edit')}
                      </button>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 text-right">
                    {isAdmin && user.id !== currentUser.id && (
                      <button
                        onClick={() => confirm(t('delete_confirm')) && onDeleteUser(user.id)}
                        className="p-3 rounded-xl transition-all text-slate-600 hover:text-red-500"
                      >
                        <Trash2 size={22} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
