import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, type CurrencyCode } from '@lumaspend/shared';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isRegisterInitial = location.pathname.includes('register');
  const [isRegister, setIsRegister] = useState<boolean>(isRegisterInitial);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: isRegister ? 'Account Created Successfully' : 'Welcome back to LumaSpend',
        description: `Signed in with default currency: ${selectedCurrency} (${SUPPORTED_CURRENCIES[selectedCurrency].symbol})`,
        type: 'success'
      });
      navigate('/dashboard');
    }, 700);
  };

  const handleGoogleSignIn = () => {
    toast({
      title: 'Google OAuth Selected',
      description: 'Proceeding with Google Identity Services bridge...',
      type: 'info'
    });
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-void text-text-primary px-4 py-12 relative overflow-hidden selection:bg-brand-violet/30 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-violet/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-blue/15 blur-3xl pointer-events-none -z-10" />

      {/* Brand Header */}
      <div className="mb-8 text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-violet to-brand-blue shadow-glow-violet">
            <Icons.Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">LumaSpend</span>
        </Link>
        <p className="text-xs text-text-secondary">
          {isRegister ? 'Set up your financial command center' : 'Access your secured portfolio & ledger'}
        </p>
      </div>

      {/* Auth Card Container */}
      <GlassPanel glow="violet" intensity="deep" className="w-full max-w-md p-6 sm:p-8 space-y-6">
        {/* Toggle Pills */}
        <div className="flex p-1 rounded-xl bg-surface-default border border-white/5">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-surface-elevated text-white shadow-sm border border-white/10'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-surface-elevated text-white shadow-sm border border-white/10'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Google OAuth Quick Button */}
        <Button
          variant="secondary"
          className="w-full h-11 border-white/10 hover:border-white/20 text-xs font-semibold gap-2"
          onClick={handleGoogleSignIn}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-white/10" />
          <span className="absolute bg-surface-100 px-3 text-[11px] uppercase tracking-wider text-text-muted">
            Or with email
          </span>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Full Name</label>
              <Input
                type="text"
                required
                placeholder="e.g. Sriteja"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Email Address</label>
            <Input
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-text-secondary">Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => toast({ title: 'Password Recovery', description: 'Reset instructions will be dispatched to your email.', type: 'info' })}
                  className="text-[11px] text-brand-glow hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">
                Primary Currency Preference
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-surface-elevated/60 px-4 py-2.5 text-xs text-text-primary focus:border-brand-violet focus:outline-none"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                  <option key={curr.code} value={curr.code} className="bg-surface-elevated text-white">
                    {curr.code} ({curr.symbol}) — {curr.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1">Default set to Indian Rupee (INR ₹)</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-xs font-bold"
            isLoading={isLoading}
          >
            {isRegister ? 'Complete Registration' : 'Sign In to Dashboard'}
          </Button>
        </form>

        {/* Security Assurance */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <Icons.Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>256-Bit Encrypted Session • Privacy First</span>
        </div>
      </GlassPanel>

      {/* Back to Home Link */}
      <Link to="/" className="mt-8 text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1">
        <span>← Return to Landing Page</span>
      </Link>
    </div>
  );
};
