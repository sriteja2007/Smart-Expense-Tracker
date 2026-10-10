# 🌌 LumaSpend — Premium 3D Fintech Application

> **LumaSpend** (Smart Expense Tracker) is a production-oriented personal financial management platform built with a TypeScript MERN stack, featuring a cinematic 3D visual layer, an agile transaction ledger, Gemini-powered AI financial insights, and responsive support across desktop/laptop computers and mobile devices (with a final installable Android APK).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.170-black.svg)](https://threejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-green.svg)](https://vitest.dev/)

---

## 🚀 Key Features

* **Dual-Platform Architecture:** Responsive web interface for laptop/desktop workstations and touch-optimized layout for mobile, convertible to a native **Android APK** via Capacitor.
* **Cinematic 3D Design:** GPU-accelerated spatial assets (Three.js, React Three Fiber, Drei) with deep charcoal tones, electric violet/indigo accents, and full `prefers-reduced-motion` compliance.
* **Core Transaction Ledger:** Comprehensive tracking for Incomes, Expenses, and Transfers, with category tagging, payment methods (UPI, Cards, Net Banking), and default **INR (₹)** formatting.
* **Intelligent AI Insights:** Server-side Google Gemini integration for personalized spending analysis and smart categorization suggestions.
* **Receipt OCR Scanning:** Built-in receipt processing using Tesseract.js with manual verification gates.
* **Shared Finances:** Multi-user household spaces with role-based budget boundaries.

---

## 📁 Repository Structure

```text
├── client/          # Frontend application (React 18, Vite, Three.js, Tailwind CSS)
├── server/          # Backend REST API (Node.js, Express, TypeScript, Mongoose, Zod)
├── shared/          # Shared cross-cutting library (types, schemas, errors, utilities)
├── docs/            # Architecture guidelines and 10-phase roadmap
├── .env.example     # Environment variable documentation template
├── tsconfig.base.json # Shared strict TypeScript configuration
└── package.json     # Monorepo workspaces orchestrator
```

---

## 🛠️ Quick Start

### 1. Prerequisites
* **Node.js:** v18.0.0 or higher (v24.x tested)
* **npm:** v9.0.0 or higher
* **Git:** Installed and configured

### 2. Installation
Install all dependencies across the monorepo workspaces:
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to create local environment files:
```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```
*(Never commit `.env` files to git. All secret keys are strictly excluded via `.gitignore`.)*

### 4. Running the Development Environment
Run both backend API and frontend client concurrently:
```bash
npm run dev
```

Or start them individually:
```bash
npm run dev:server   # Starts Express API at http://localhost:5000
npm run dev:client   # Starts Vite Dev Server at http://localhost:5173
```

---

## 🧪 Verification & Quality Scripts

| Command | Action |
| :--- | :--- |
| `npm run build` | Compiles `@lumaspend/shared`, `@lumaspend/server`, and `@lumaspend/client` |
| `npm run typecheck` | Executes strict TypeScript compiler checks without emitting files |
| `npm run test` | Runs unit and integration test suites with Vitest |
| `npm run test:run` | Runs all tests once across all packages |

---

## 📑 Documentation
* [System Architecture](file:///h:/Projects/Smart%20Expense%20Tracker/docs/architecture.md)
* [Phased Feature Roadmap](file:///h:/Projects/Smart%20Expense%20Tracker/docs/roadmap.md)

---

## 🔗 Official Repository
* GitHub: [sriteja2007/Smart-Expense-Tracker](https://github.com/sriteja2007/Smart-Expense-Tracker)
