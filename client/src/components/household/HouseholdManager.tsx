import React, { useState, useEffect } from 'react';
import type {
  Household,
  HouseholdRole,
  CreateHouseholdInput,
  HouseholdInvitation
} from '@lumaspend/shared';
import { FinancialApi } from '../../lib/financial-api';
import { Icons } from '../icons';

interface HouseholdManagerProps {
  currentUserId: string;
  activeHouseholdId?: string;
  onSelectHousehold: (householdId?: string) => void;
}

export const HouseholdManager: React.FC<HouseholdManagerProps> = ({
  currentUserId,
  activeHouseholdId,
  onSelectHousehold
}) => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateHouseholdInput>({
    name: '',
    currency: 'INR'
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [generatedInvite, setGeneratedInvite] = useState<{
    invitation: HouseholdInvitation;
    inviteLink: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    setIsLoading(true);
    try {
      const list = await FinancialApi.listHouseholds();
      setHouseholds(list);
    } catch (err: any) {
      console.error('Failed to load households:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeHousehold = households.find((h) => h.id === activeHouseholdId);
  const myMemberRecord = activeHousehold?.members.find((m) => m.userId === currentUserId);
  const isOwner = activeHousehold?.ownerId === currentUserId || myMemberRecord?.role === 'owner';
  const myRole: HouseholdRole = myMemberRecord?.role || (isOwner ? 'owner' : 'viewer');

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    try {
      const created = await FinancialApi.createHousehold(createForm);
      setHouseholds((prev) => [...prev, created]);
      onSelectHousehold(created.id);
      setShowCreateModal(false);
      setCreateForm({ name: '', currency: 'INR' });
      setFeedback({ type: 'success', message: `Shared space "${created.name}" created!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create household space' });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouseholdId || !inviteEmail.trim()) return;
    try {
      const res = await FinancialApi.createHouseholdInvitation(activeHouseholdId, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setGeneratedInvite(res);
      setInviteEmail('');
      await fetchHouseholds();
      setFeedback({
        type: 'success',
        message: `Single-use invitation token created for ${res.invitation.inviteeEmail}!`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create invitation' });
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!activeHouseholdId) return;
    try {
      const updated = await FinancialApi.revokeHouseholdInvitation(activeHouseholdId, invitationId);
      setHouseholds((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setFeedback({ type: 'success', message: 'Invitation token revoked.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke invitation' });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeHouseholdId || !window.confirm(`Are you sure you want to remove ${memberName}?`)) return;
    try {
      const updated = await FinancialApi.removeHouseholdMember(activeHouseholdId, memberId);
      setHouseholds((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setFeedback({ type: 'success', message: `${memberName} has been removed from this shared space.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove member' });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    if (!activeHouseholdId) return;
    try {
      const updated = await FinancialApi.updateHouseholdMemberRole(activeHouseholdId, memberId, newRole);
      setHouseholds((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setFeedback({ type: 'success', message: 'Member role updated.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update member role' });
    }
  };

  const handleDeleteHousehold = async () => {
    if (
      !activeHouseholdId ||
      !window.confirm(
        `Are you sure you want to permanently delete the shared space "${activeHousehold?.name}"?`
      )
    )
      return;
    try {
      await FinancialApi.deleteHousehold(activeHouseholdId);
      setHouseholds((prev) => prev.filter((h) => h.id !== activeHouseholdId));
      onSelectHousehold(undefined);
      setFeedback({ type: 'success', message: 'Shared space deleted.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete household' });
    }
  };

  const copyInviteLink = () => {
    if (!generatedInvite) return;
    const fullUrl = `${window.location.origin}${generatedInvite.inviteLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Space Selector & Creation Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Icons.Users className="w-5 h-5 text-brand-violet" />
            Budget Spaces & Shared Households
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Collaborate on shared household expenses while keeping personal transactions strictly private.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Space Selector */}
          <select
            data-testid="household-space-selector"
            value={activeHouseholdId || ''}
            onChange={(e) => onSelectHousehold(e.target.value || undefined)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
          >
            <option value="">👤 Personal Workspace (Private)</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                👥 {h.name} ({h.members.length} members)
              </option>
            ))}
          </select>

          {isLoading && <Icons.Refresh className="w-3.5 h-3.5 animate-spin text-brand-violet" />}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-white text-xs font-semibold shadow-lg shadow-brand-violet/20 transition-all"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            <span>New Space</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <Icons.Success className="w-4 h-4 shrink-0" />
          ) : (
            <Icons.Error className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* When a Shared Space is Active */}
      {activeHousehold ? (
        <div className="space-y-5">
          {/* Active Space Details Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">{activeHousehold.name}</h4>
                  <span
                    data-testid="household-role-badge"
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                      myRole === 'owner'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : myRole === 'editor'
                        ? 'bg-brand-violet/20 text-brand-violet border-brand-violet/30'
                        : 'bg-slate-500/10 text-slate-400 border-white/10'
                    }`}
                  >
                    {myRole}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Currency: <span className="text-slate-200">{activeHousehold.currency}</span> • Created{' '}
                  {new Date(activeHousehold.createdAt).toLocaleDateString()}
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={handleDeleteHousehold}
                  className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  Delete Space
                </button>
              )}
            </div>

            {/* Permission Scoping Summary */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
              <Icons.Shield className="w-4 h-4 text-brand-violet mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-white">Privacy Guarantee: </span>
                Transactions added inside "{activeHousehold.name}" are visible only to invited members. Your personal transactions outside this space are strictly private.
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Members ({activeHousehold.members.length})
              </h5>
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
                {activeHousehold.members.map((m) => (
                  <div
                    key={m.userId}
                    className="p-3 bg-white/[0.01] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-violet/20 border border-brand-violet/30 flex items-center justify-center text-xs font-bold text-white">
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-1.5">
                          {m.displayName}
                          {m.userId === currentUserId && (
                            <span className="text-[10px] text-slate-500">(You)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{m.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && m.userId !== currentUserId ? (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(m.userId, e.target.value as 'editor' | 'viewer')
                            }
                            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(m.userId, m.displayName)}
                            aria-label={`Remove ${m.displayName}`}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase font-medium text-slate-300">
                          {m.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Form (Owner Only) */}
            {isOwner && (
              <div className="pt-3 border-t border-white/5 space-y-3">
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Invite Member with Role
                </h5>
                <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="partner@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-violet"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
                  >
                    <option value="editor">Editor (Can add/edit)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors shrink-0"
                  >
                    Create Invite Token
                  </button>
                </form>

                {/* Generated Token Link Display */}
                {generatedInvite && (
                  <div className="p-3 rounded-xl bg-brand-violet/10 border border-brand-violet/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-violet">
                        Single-Use Invitation Token Created
                      </span>
                      <span className="text-[10px] text-slate-400">Expires in 7 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${generatedInvite.inviteLink}`}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 font-mono select-all"
                      />
                      <button
                        onClick={copyInviteLink}
                        className="px-3 py-1.5 rounded-lg bg-brand-violet text-white text-xs font-medium flex items-center gap-1 shrink-0"
                      >
                        {copied ? (
                          <>
                            <Icons.Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Icons.Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Share this token link with {generatedInvite.invitation.inviteeEmail}. If they are already registered on LumaSpend, they have also received an in-app alert.
                    </p>
                  </div>
                )}

                {/* Pending Invitations */}
                {activeHousehold.invitations && activeHousehold.invitations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-slate-400 font-medium">Pending Invitations</span>
                    <div className="space-y-1.5">
                      {activeHousehold.invitations
                        .filter((inv) => inv.status === 'pending')
                        .map((inv) => (
                          <div
                            key={inv.id}
                            className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="text-white font-medium">{inv.inviteeEmail}</span>
                              <span className="text-slate-500 ml-2">({inv.role})</span>
                            </div>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="text-[11px] text-rose-400 hover:text-rose-300"
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit Logs Accordion */}
            {activeHousehold.auditLogs && activeHousehold.auditLogs.length > 0 && (
              <div className="pt-3 border-t border-white/5">
                <button
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>{showAuditLogs ? 'Hide' : 'View'} Space Audit History ({activeHousehold.auditLogs.length})</span>
                  <Icons.ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${showAuditLogs ? 'rotate-90' : ''}`}
                  />
                </button>
                {showAuditLogs && (
                  <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                    {activeHousehold.auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-black/20 border border-white/5 text-[11px] text-slate-300 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-white">{log.actorName}:</span>{' '}
                          {log.details}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Personal Space Active Info Card */
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
            <Icons.Shield className="w-4 h-4 text-emerald-400" />
            Personal Workspace Active
          </div>
          <p>
            You are currently working in your strictly private workspace. Transactions, accounts, and budgets created here cannot be accessed by any other household members.
          </p>
        </div>
      )}

      {/* Create Household Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F111A] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Icons.Users className="w-5 h-5 text-brand-violet" />
                Create Shared Budget Space
              </h4>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateHousehold} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Space Name</label>
                <input
                  type="text"
                  placeholder="e.g., Home & Groceries, Apartment 4B"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-violet"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary Currency</label>
                <select
                  value={createForm.currency}
                  onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold transition-all shadow-lg shadow-brand-violet/20"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
