# LumaSpend — Phased Feature Implementation Roadmap

This project is partitioned into 10 sequential, testable engineering phases. Each phase requires explicit deliverables and verification gates before proceeding.

---

### Phase 1: Clean Monorepo, Foundations & Design System *(Active Phase)*
- [x] Monorepo initialization (`/client`, `/server`, `/shared`) with npm workspaces.
- [x] Strict TypeScript configuration, root build/lint/test scripts.
- [x] Shared domain models, API envelopes, and standard error conventions.
- [x] Fintech dark design tokens (colors, surfaces, glows, radii, INR default currency).
- [x] Reusable UI primitives (Button, Card, Badge, GlassPanel) and accessible icon system.
- [x] Zod-based server environment variable validation module.
- [x] Diagnostic health check (`/api/health`) and responsive application shell.
- [x] Architecture and roadmap documentation.

---

### Phase 2: Authentication & User Account Security
- [ ] Email/password registration and authentication with bcrypt hashing.
- [ ] Google OAuth 2.0 integration with server-side token validation.
- [ ] JWT authentication cookies/headers with refresh rotation.
- [ ] User profile schema with currency preferences (INR default) and dark/light themes.
- [ ] Protected route middlewares on server and client.

---

### Phase 3: Core Transaction Ledger & Multi-Account Management
- [ ] Mongoose schemas for Accounts, Categories, and Transactions.
- [ ] CRUD operations for Incomes, Expenses, and Transfers.
- [ ] Transaction filtering by date range, category, merchant, and payment method (UPI, cards, cash).
- [ ] Recurring transaction scheduling and detection.
- [ ] CSV import parser and CSV export generator.

---

### Phase 4: Cinematic 3D Landing Experience & Spatial Visuals
- [ ] React Three Fiber / Drei spatial scene on landing page.
- [ ] Atmospheric lighting, floating fintech geometry, and mouse parallax interaction.
- [ ] Graceful fallback for non-WebGL devices and low-power hardware.
- [ ] `prefers-reduced-motion` compliance to respect accessibility settings.
- [ ] Seamless integration into login/register modals.

---

### Phase 5: Financial Intelligence, Budgets & Trend Analytics
- [ ] Category-based monthly spending limits and threshold alerts.
- [ ] Goal progress tracking (emergency funds, investment milestones).
- [ ] Recharts interactive visualizations (cash flow breakdown, spending trends, category donuts).
- [ ] Monthly financial health reports and rule-based spending notifications.

---

### Phase 6: Gemini-Powered AI Financial Assistant
- [ ] Gemini API server integration with streaming response capability.
- [ ] Context-aware financial Q&A (spending breakdown explanations, savings advice).
- [ ] Automated transaction categorization suggestions based on merchant descriptions.
- [ ] Graceful degradation when offline or when AI quota limits are reached.

---

### Phase 7: Receipt Scanning & OCR Extraction
- [ ] Client-side or server OCR pipeline with Tesseract.js.
- [ ] Receipt image upload with preview, rotation, and compression.
- [ ] Intelligent parsing of merchant name, transaction date, and total amount.
- [ ] Confirmation and review modal before committing extracted data to ledger.

---

### Phase 8: Shared Finances & Multi-User Household Spaces
- [ ] Household workspace schema with role-based access control (Admin, Member, Viewer).
- [ ] Invitation link generation and membership acceptance flow.
- [ ] Clear isolation between private individual transactions and shared household spaces.
- [ ] Split expenses and household budget contribution tracking.

---

### Phase 9: Quality Engineering, End-to-End Tests & Performance
- [ ] Supertest integration test suites for all API routes.
- [ ] Playwright end-to-end user journeys for core ledger workflows.
- [ ] Web Vitals audit (LCP, CLS, FID) and bundle optimization with Vite manualChunks.
- [ ] PWA manifest, service worker caching, and offline support.

---

### Phase 10: Mobile Android APK Packaging & Production Deployment
- [ ] Capacitor integration (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
- [ ] Native Android platform configuration, icon and splash screen generation.
- [ ] Gradle build pipeline generating release/debug `.apk` binary.
- [ ] Cloud deployment configuration for static frontend (Vercel) and backend (Node/MongoDB Atlas).
