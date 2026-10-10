import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Icons } from '@/components/icons';
import { Hero3DContainer } from '@/components/3d/Hero3DContainer';
import { formatCurrency, DEFAULT_CURRENCY } from '@lumaspend/shared';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFeatureTab, setActiveFeatureTab] = useState<'ledger' | 'budget' | 'ai' | 'analytics'>('ledger');

  const featureTabs = [
    { id: 'ledger' as const, label: 'Real-Time Ledger', icon: <Icons.Wallet className="h-4 w-4" /> },
    { id: 'budget' as const, label: 'Adaptive Budgets', icon: <Icons.Shield className="h-4 w-4" /> },
    { id: 'ai' as const, label: 'Gemini Intelligence', icon: <Icons.AI className="h-4 w-4" /> },
    { id: 'analytics' as const, label: 'Predictive Trends', icon: <Icons.Income className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-void text-text-primary selection:bg-brand-violet/30 selection:text-white">
      {/* Top Navigation */}
      <Header isApiConnected={true} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
          {/* Atmospheric Mesh Lighting */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-brand-violet/20 via-brand-blue/10 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Value Proposition & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-violet/30 bg-brand-violet/10 backdrop-blur-md shadow-glow-violet">
                  <Icons.AI className="h-3.5 w-3.5 text-brand-glow animate-pulse" />
                  <span className="text-xs font-semibold text-brand-glow">
                    Next-Generation Fintech Operating System
                  </span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Master Your Finances with{' '}
                  <span className="gradient-text-brand">3D Spatial Clarity</span>
                </h1>

                <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  LumaSpend merges institutional-grade expense tracking, AI-powered predictive
                  budgeting, and real-time INR ledger analytics into an immaculate experience on laptops and mobile devices.
                </p>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/dashboard')}
                    className="shadow-glow-violet"
                  >
                    <Icons.Activity className="mr-2 h-4 w-4" />
                    Enter Dashboard
                  </Button>
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => navigate('/register')}
                  >
                    <span>Create Free Account</span>
                    <Icons.ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Icons.Shield className="h-4 w-4 text-emerald-400" />
                    <span>Zero Bank-Cred Storage</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.Rupee className="h-4 w-4 text-brand-glow" />
                    <span>Native {DEFAULT_CURRENCY} Currency</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.Mobile className="h-4 w-4 text-blue-400" />
                    <span>Android APK Compatible</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive 3D Centerpiece */}
              <div className="lg:col-span-5 flex items-center justify-center">
                <Hero3DContainer />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SHOWCASE TABS */}
        <section className="py-20 border-t border-white/5 bg-surface-300/40 relative">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <Badge variant="violet">Interactive Previews</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Engineered for High-Clarity Control
              </h2>
              <p className="text-sm text-text-secondary">
                Explore how LumaSpend organizes wealth, monitors recurring commitments, and projects runway.
              </p>
            </div>

            {/* Feature Tab Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 max-w-xl mx-auto rounded-2xl bg-surface-100/60 border border-white/10 backdrop-blur-md">
              {featureTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeFeatureTab === tab.id
                      ? 'bg-gradient-to-r from-brand-violet to-brand-indigo text-white shadow-sm'
                      : 'text-text-secondary hover:text-white hover:bg-surface-elevated/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Dynamic Tab Content Preview */}
            <div className="max-w-4xl mx-auto">
              {activeFeatureTab === 'ledger' && (
                <GlassPanel glow="violet" intensity="medium" className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Real-Time Transaction Ledger</h3>
                      <p className="text-xs text-text-muted">Multi-account categorization with UPI & Card support</p>
                    </div>
                    <Badge variant="success">Auto-Categorized</Badge>
                  </div>

                  <div className="space-y-3">
                    {[
                      { name: 'Amazon Web Services', category: 'Cloud Infrastructure', date: 'Today, 2:15 PM', amount: -6450, icon: <Icons.Expense className="text-finance-expense h-4 w-4" /> },
                      { name: 'Client Retainer — Fintech UI', category: 'Freelance & Consulting', date: 'Yesterday', amount: 85000, icon: <Icons.Income className="text-finance-income h-4 w-4" /> },
                      { name: 'Zepto Groceries & Staples', category: 'Household Essentials', date: '08 Oct 2026', amount: -1840, icon: <Icons.Expense className="text-finance-expense h-4 w-4" /> },
                      { name: 'Savings Account Auto-Sweep', category: 'Emergency Reserve', date: '05 Oct 2026', amount: -25000, icon: <Icons.Transfer className="text-finance-transfer h-4 w-4" /> }
                    ].map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-default/50 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-surface-elevated border border-white/5">
                            {tx.icon}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{tx.name}</p>
                            <p className="text-[10px] text-text-muted">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${tx.amount > 0 ? 'text-finance-income' : 'text-text-primary'}`}>
                          {tx.amount > 0 ? `+${formatCurrency(tx.amount, 'INR')}` : formatCurrency(Math.abs(tx.amount), 'INR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              )}

              {activeFeatureTab === 'budget' && (
                <GlassPanel glow="blue" intensity="medium" className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Adaptive Category Limits</h3>
                      <p className="text-xs text-text-muted">Enforce proactive budget caps before overspending occurs</p>
                    </div>
                    <Badge variant="blue">Monthly Cycle: Oct 2026</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { cat: 'Dining & Entertainment', spent: 14200, cap: 20000, pct: 71, status: 'warning' as const },
                      { cat: 'Cloud & Tech Subscriptions', spent: 18500, cap: 25000, pct: 74, status: 'violet' as const },
                      { cat: 'Groceries & Provisions', spent: 9300, cap: 18000, pct: 51, status: 'success' as const },
                      { cat: 'Urban Commute & Fuel', spent: 3400, cap: 10000, pct: 34, status: 'success' as const }
                    ].map((b, i) => (
                      <div key={i} className="p-4 rounded-xl bg-surface-default/60 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-white">{b.cat}</span>
                          <span className="text-text-muted">{b.pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              b.pct > 70 ? 'bg-amber-400' : 'bg-brand-violet'
                            }`}
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-text-muted">
                          <span>Spent: {formatCurrency(b.spent, 'INR')}</span>
                          <span>Cap: {formatCurrency(b.cap, 'INR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              )}

              {activeFeatureTab === 'ai' && (
                <GlassPanel glow="violet" intensity="medium" className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-brand-violet/20 border border-brand-violet/30">
                      <Icons.AI className="h-5 w-5 text-brand-glow" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Gemini 2.5 Financial Reasoning</h3>
                      <p className="text-xs text-text-muted">Conversational insights grounded in your actual spending behavior</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-default/70 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                      <Icons.Terminal className="h-3.5 w-3.5 text-brand-glow" />
                      <span>User Query:</span>
                    </div>
                    <p className="text-xs text-white italic">
                      "Why did my discretionary expenditure increase by 18% in the first week of October?"
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-glow">
                        <Icons.AI className="h-3.5 w-3.5" />
                        <span>Gemini Synthesis:</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Your spike is primarily driven by three annual cloud subscription renewals (₹11,400 total)
                        plus an uncharacteristic dining weekend on Oct 3rd. Your baseline grocery and utility outflows remain strictly on budget.
                      </p>
                    </div>
                  </div>
                </GlassPanel>
              )}

              {activeFeatureTab === 'analytics' && (
                <GlassPanel glow="emerald" intensity="medium" className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Predictive Savings & Runway</h3>
                      <p className="text-xs text-text-muted">Statistical trend extrapolation based on seasonal outflow patterns</p>
                    </div>
                    <Badge variant="success">+22.4% Net Savings Margin</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-surface-default/60 border border-white/5 space-y-1">
                      <span className="text-[11px] text-text-muted">Average Daily Burn</span>
                      <p className="text-lg font-bold text-white">{formatCurrency(1850, 'INR')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-default/60 border border-white/5 space-y-1">
                      <span className="text-[11px] text-text-muted">Projected Month-End Balance</span>
                      <p className="text-lg font-bold text-finance-income">{formatCurrency(312400, 'INR')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-default/60 border border-white/5 space-y-1">
                      <span className="text-[11px] text-text-muted">Emergency Reserve Runway</span>
                      <p className="text-lg font-bold text-brand-glow">8.4 Months</p>
                    </div>
                  </div>
                </GlassPanel>
              )}
            </div>
          </div>
        </section>

        {/* DUAL PLATFORM SPOTLIGHT */}
        <section className="py-20 border-t border-white/5">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <Badge variant="blue">Universal Architecture</Badge>
                <h2 className="text-3xl font-extrabold text-white">
                  Built for Desktop Workstations. Packaged for Android Mobile.
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Enjoy the expansive spatial visualization of a full desktop monitor while keeping instant receipt-scanning and budget alerts on your mobile device via the built-in Capacitor Android compilation pipeline.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <Button variant="primary" onClick={() => navigate('/dashboard')}>
                    Launch Web Workspace
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card-interactive">
                  <CardHeader>
                    <Icons.Laptop className="h-6 w-6 text-brand-blue mb-2" />
                    <CardTitle className="text-base">Laptop & Desktop</CardTitle>
                    <CardDescription>Multi-column dashboards, CSV exports, and full Recharts visualizers.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="glass-card-interactive">
                  <CardHeader>
                    <Icons.Mobile className="h-6 w-6 text-brand-violet mb-2" />
                    <CardTitle className="text-base">Android APK</CardTitle>
                    <CardDescription>Touch bottom-bar navigation, camera receipt OCR, and native performance.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
