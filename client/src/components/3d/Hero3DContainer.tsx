import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Hero3DFallback } from './Hero3DFallback';

// Lazy load the 3D scene to preserve initial bundle performance
const Hero3DScene = lazy(() => import('./Hero3DScene'));

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.warn('[3D WebGL Warning]: Fallback triggered due to:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const Hero3DContainer: React.FC = () => {
  const [canRender3D, setCanRender3D] = useState<boolean>(false);

  useEffect(() => {
    // Check WebGL support and screen capabilities
    const supported = checkWebGLSupport();
    setCanRender3D(supported);
  }, []);

  if (!canRender3D) {
    return <Hero3DFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<Hero3DFallback />}>
      <Suspense fallback={<Hero3DFallback />}>
        <Hero3DScene />
      </Suspense>
    </WebGLErrorBoundary>
  );
};
