import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { Hero3DFallback } from '../components/3d/Hero3DFallback';
import { NotFoundPage } from '../pages/NotFoundPage';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { ToastProvider } from '../components/ui/toast';

describe('LumaSpend Visual Foundation & Navigation Suite', () => {
  it('renders landing page with headline, branding, and INR default badges', () => {
    render(<App />);
    expect(screen.getAllByText(/LumaSpend/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/3D Spatial Clarity/i)).toBeInTheDocument();
    expect(screen.getAllByText(/INR/i).length).toBeGreaterThan(0);
  });

  it('renders Hero 3D fallback with liquid balance and security tag', () => {
    render(<Hero3DFallback />);
    expect(screen.getByText(/RESERVE ACCOUNT/i)).toBeInTheDocument();
    expect(screen.getByText(/LUMASPEND ELITE/i)).toBeInTheDocument();
    expect(screen.getByText(/ALEXANDER CHEN/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart AI Audit: Optimized/i)).toBeInTheDocument();
  });

  it('renders Dashboard shell with sidebar, INR stats, and ledger table', () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ToastProvider>
    );

    // Verify key metrics & tabs
    expect(screen.getByText(/Total Inflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Outflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Savings Reserve/i)).toBeInTheDocument();

    // Verify Tab Switching to Ledger (Desktop sidebar button)
    const ledgerBtns = screen.getAllByRole('button', { name: /Ledger/i });
    fireEvent.click(ledgerBtns[0]!);
    expect(screen.getByText(/Transaction Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/Software Development Salary/i)).toBeInTheDocument();
  });

  it('allows recording a new transaction via modal in Dashboard', async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </ToastProvider>
    );

    // Open Add Transaction Dialog
    const addBtn = screen.getByRole('button', { name: /\+ Record Transaction/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/Record New Transaction/i)).toBeInTheDocument();

    // Fill form
    const merchantInput = screen.getByPlaceholderText(/e\.g\. Swiggy, Apple Store/i);
    const amountInput = screen.getByPlaceholderText(/0\.00/i);

    fireEvent.change(merchantInput, { target: { value: 'Blue Tokai Coffee' } });
    fireEvent.change(amountInput, { target: { value: '450' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save Transaction/i });
    fireEvent.click(saveBtn);

    // Verify dialog closes and transaction added
    await waitFor(() => {
      expect(screen.queryByText(/Record New Transaction/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Blue Tokai Coffee/i)).toBeInTheDocument();
    });
  });

  it('renders 404 page with return actions', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/404 — Ledger Void/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return Home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Dashboard/i })).toBeInTheDocument();
  });
});
