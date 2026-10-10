# LumaSpend (Smart Expense Tracker) — System Architecture

## 1. System Overview & Vision
**LumaSpend** is a high-precision, production-grade personal finance application combining a cinematic 3D visual layer, an agile transaction ledger, rule-based and AI-powered intelligence, and responsive dual-platform support for **Laptop/Desktop Web** and **Android Mobile (Capacitor APK)**.

### Core Principles
- **Type Safety End-to-End:** Shared TypeScript schemas (`@lumaspend/shared`) guarantee strict contracts between backend routes and frontend clients.
- **Controlled Cinematic Visuals:** 3D elements (Three.js / React Three Fiber) are focused on high-impact landing and summary touchpoints, preserving fast load times and clean accessibility on mobile and data tables.
- **Fail-Fast Configuration:** Backend environments are parsed with Zod at process initialization to prevent silent configuration drifts.
- **INR Default Currency:** Native support for Indian Rupee (₹, INR) formatting by default, with multi-currency extensibility.

---

## 2. Monorepo Structure

```text
/
├── client/                     # Frontend Application (React, Vite, Three.js, Tailwind)
│   ├── src/
│   │   ├── components/         # UI primitives, layout, icons
│   │   ├── theme/              # Design tokens (surfaces, glows, typography)
│   │   ├── lib/                # API client, utility functions
│   │   └── tests/              # Vitest + React Testing Library suites
│   ├── tailwind.config.js      # Custom fintech dark design system
│   └── vite.config.ts          # Vite build config with proxy & aliases
│
├── server/                     # Backend Application API (Node.js, Express, TypeScript)
│   ├── src/
│   │   ├── config/             # Zod-validated environment config
│   │   ├── middlewares/        # Centralized error handling & Zod validators
│   │   ├── routes/             # Express API routing (/api/health, etc.)
│   │   └── tests/              # Vitest + Supertest integration tests
│   └── vitest.config.ts        # Node test runner configuration
│
├── shared/                     # Cross-tier TypeScript Library
│   ├── src/
│   │   ├── types/              # Domain models (API envelopes, User, Transactions, Currency)
│   │   ├── constants/          # Status codes, error identifiers, currency maps
│   │   ├── errors/             # Standard AppError definitions
│   │   └── schemas/            # Zod validation schemas
│
├── docs/                       # Architectural documentation & roadmaps
│   ├── architecture.md
│   └── roadmap.md
│
├── .env.example                # Unified environment variable documentation
├── .gitignore                  # Git exclusions for secrets, builds, and node_modules
├── package.json                # Root workspaces orchestrator
└── tsconfig.base.json          # Shared strict TypeScript configuration
```

---

## 3. Technology Stack & Decision Matrix

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Monorepo** | npm Workspaces | Native, zero-overhead dependency linking between shared library, server, and client. |
| **Frontend Framework** | React 18 + Vite | Predictable compatibility with `@react-three/fiber` v8 and `@react-three/drei` v9; sub-second HMR. |
| **Styling & Tokens** | Tailwind CSS + custom tokens | Utility-first with deep charcoal surfaces (`#07080C`), electric violet glows, and glassmorphism. |
| **3D & Graphics** | Three.js, R3F, Drei | GPU-accelerated spatial assets with graceful fallback when WebGL is absent or reduced-motion is requested. |
| **Animations** | Motion for React (framer-motion) | Declarative layout transitions, spring physics, and screen transitions. |
| **Charts & Analytics** | Recharts | Responsive SVG charts tailored for financial trends and cashflows. |
| **Backend API** | Express.js + TypeScript | Battle-tested, lightweight HTTP microservices with typed middleware pipelines. |
| **Validation** | Zod | Runtime type safety and schema coercion for environment variables and API payloads. |
| **Database** | MongoDB Atlas + Mongoose | Scalable document storage well-suited for varied transaction records, budgets, and audit trails. |
| **Testing** | Vitest + RTL + Supertest | Blazing fast ESM-native test runner unified across frontend and backend. |
| **Mobile Deployment** | Capacitor (Android) | Converts the responsive Vite web build into a native Android APK without codebase divergence. |

---

## 4. API Envelope & Error Protocol

All API responses follow a uniform contract defined in `@lumaspend/shared`:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human readable description",
  "timestamp": "2026-10-10T17:52:35.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload validation failed",
    "details": [
      { "field": "amount", "message": "Amount must be greater than 0" }
    ]
  },
  "timestamp": "2026-10-10T17:52:35.000Z"
}
```

---

## 5. Security & Isolation Architecture

1. **Strict Secrets Boundary:**
   - Private environment variables (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) reside exclusively in `server/.env`.
   - Frontend accesses only variables explicitly prefixed with `VITE_` in `client/.env`.
   - Git ignores all `.env` files across the monorepo.
2. **Defensive Middlewares:**
   - Helmet sets HTTP security headers.
   - CORS strictly whitelists designated client domains.
   - Centralized error handlers strip internal stack traces in production environments.
