import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FinancialApi } from '../lib/financial-api';
import { Icons } from '../components/icons';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const InviteAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHouseholdName, setSuccessHouseholdName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token in URL.');
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);
    try {
      const hh = await FinancialApi.acceptHouseholdInvitation(token);
      setSuccessHouseholdName(hh.name);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept household invitation.');
      setIsAccepting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center text-white">
        <Icons.Refresh className="w-6 h-6 animate-spin text-brand-violet" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-text-primary flex flex-col items-center justify-center p-4">
      {/* Background gradient blur */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand-violet/15 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-blue flex items-center justify-center shadow-glow-violet">
              <Icons.Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white">LumaSpend</span>
          </Link>
          <h2 className="text-lg font-bold text-white">Shared Budget Invitation</h2>
          <p className="text-xs text-slate-400">
            You have been invited to join a collaborative household budget space.
          </p>
        </div>

        <Card className="glass-card p-6 space-y-5">
          {!isAuthenticated ? (
            <div className="space-y-4 text-center">
              <div className="p-3 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-xs text-slate-300">
                Please log in or create an account with the invited email address to accept this invitation.
              </div>
              <div className="flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/login?redirect=/invite?token=${token}`)}
                  className="w-full text-xs font-semibold"
                >
                  Log In to Accept
                </Button>
                <Button
                  variant="glass"
                  onClick={() => navigate(`/register?redirect=/invite?token=${token}`)}
                  className="w-full text-xs"
                >
                  Create New Account
                </Button>
              </div>
            </div>
          ) : successHouseholdName ? (
            <div className="text-center space-y-3 py-4">
              <Icons.Success className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
              <h3 className="text-base font-bold text-white">Welcome to {successHouseholdName}!</h3>
              <p className="text-xs text-slate-300">
                You are now a member of this shared space. Redirecting to your financial dashboard...
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
                <span className="text-slate-400 block text-[11px]">Logged in as</span>
                <span className="font-semibold text-white block text-sm">{user?.displayName}</span>
                <span className="text-slate-400 block text-[11px] font-mono">{user?.email}</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleAccept}
                disabled={isAccepting || !token}
                className="w-full text-xs font-semibold shadow-glow-violet py-2.5"
              >
                {isAccepting ? 'Accepting Invitation...' : 'Accept Invitation & Join Space'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
