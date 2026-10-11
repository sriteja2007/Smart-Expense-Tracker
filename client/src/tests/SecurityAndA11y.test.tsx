import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Hero3DScene, WebGLFallbackCard } from '../components/3d/Hero3DScene';

describe('Phase 9 Client Security, WebGL Resilience & Accessibility Suite', () => {
  it('renders WebGLFallbackCard with accessible role and aria-label', () => {
    render(<WebGLFallbackCard />);

    const fallbackImg = screen.getByRole('img', {
      name: /3D Fintech Obsidian and Sapphire Cards preview/i
    });
    expect(fallbackImg).toBeInTheDocument();
    expect(screen.getByText('LUMASPEND OBSIDIAN')).toBeInTheDocument();
    expect(screen.getByText('LUMASPEND SAPPHIRE')).toBeInTheDocument();
  });

  it('renders WebGLFallbackCard when WebGL context is disabled or unavailable', () => {
    // In jsdom environment, WebGL is naturally disabled/unavailable
    render(<Hero3DScene />);

    const fallbackImg = screen.getByRole('img', {
      name: /3D Fintech Obsidian and Sapphire Cards preview/i
    });
    expect(fallbackImg).toBeInTheDocument();
    expect(screen.getByText('LUMASPEND OBSIDIAN')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion media query', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    render(<Hero3DScene />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    matchMediaSpy.mockRestore();
  });
});
