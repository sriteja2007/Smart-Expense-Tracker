import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Procedural 3D Floating Fintech Glass Card
function FloatingCard({
  position,
  rotation,
  color,
  emissive,
  reducedMotion
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  emissive: string;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.08;
    meshRef.current.rotation.z = rotation[2] + Math.sin(t * 0.5) * 0.03;
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Outer Card Body */}
      <RoundedBox
        ref={meshRef}
        args={[3.4, 2.1, 0.08]}
        radius={0.12}
        smoothness={4}
      >
        <meshPhysicalMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.25}
          roughness={0.2}
          metalness={0.65}
          transparent
          opacity={0.88}
          reflectivity={0.9}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>

      {/* Decorative Golden Microchip */}
      <RoundedBox args={[0.45, 0.35, 0.02]} radius={0.02} smoothness={2} position={[-1.1, 0.45, 0.06]}>
        <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
      </RoundedBox>

      {/* Subtle Holographic Strip */}
      <mesh position={[0, -0.4, 0.05]}>
        <planeGeometry args={[3.2, 0.28]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

// Glowing Energy Ring around Centerpiece
function EnergyRing({ reducedMotion }: { reducedMotion: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    ringRef.current.rotation.x = 1.3 + Math.sin(t * 0.4) * 0.05;
    ringRef.current.rotation.y = t * 0.25;
  });

  return (
    <mesh ref={ringRef} position={[0, 0, -0.5]}>
      <torusGeometry args={[2.5, 0.03, 16, 100]} />
      <meshBasicMaterial color="#8B5CF6" transparent opacity={0.6} />
    </mesh>
  );
}

// Check WebGL availability safely
function isWebGLAvailable(): boolean {
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

// 2D High-Fidelity Fintech Glass Card Fallback (for WebGL-disabled or low-power environments)
export const WebGLFallbackCard: React.FC = () => (
  <div
    role="img"
    aria-label="3D Fintech Obsidian and Sapphire Cards preview"
    className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center p-6 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-tr from-violet-900/10 via-indigo-900/10 to-blue-900/10 rounded-2xl" />

    {/* Secondary Sapphire Card */}
    <div className="absolute -translate-y-8 -translate-x-6 rotate-[-6deg] w-72 sm:w-80 h-44 rounded-2xl bg-gradient-to-br from-indigo-900/80 via-slate-900/90 to-indigo-950/80 border border-indigo-500/30 shadow-2xl backdrop-blur-xl p-5 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono tracking-widest text-indigo-300">LUMASPEND SAPPHIRE</span>
        <div className="w-8 h-6 rounded bg-amber-400/80 border border-amber-300/40" />
      </div>
      <div className="text-sm font-mono tracking-wider text-slate-300">•••• •••• •••• 4892</div>
      <div className="flex justify-between items-center text-xs text-indigo-200">
        <span>SHARED SPACE</span>
        <span>09/29</span>
      </div>
    </div>

    {/* Primary Obsidian Card */}
    <div className="relative translate-y-6 translate-x-4 rotate-[4deg] w-72 sm:w-80 h-44 rounded-2xl bg-gradient-to-br from-slate-900/90 via-violet-950/80 to-slate-900/90 border border-violet-500/40 shadow-2xl backdrop-blur-xl p-5 flex flex-col justify-between z-10 hover:rotate-[0deg] transition-transform duration-300">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono tracking-widest text-violet-300">LUMASPEND OBSIDIAN</span>
        <div className="w-8 h-6 rounded bg-amber-400/90 border border-amber-200/50 shadow-sm" />
      </div>
      <div className="text-base font-mono tracking-widest text-white drop-shadow">•••• •••• •••• 1048</div>
      <div className="flex justify-between items-center text-xs text-violet-200">
        <span>PREMIUM VAULT</span>
        <span>12/30</span>
      </div>
    </div>
  </div>
);

// React Error Boundary for WebGL runtime / shader compilation errors
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[Hero3DScene] WebGL error caught, rendering 2D fallback:', error);
  }

  render() {
    if (this.state.hasError) {
      return <WebGLFallbackCard />;
    }
    return this.props.children;
  }
}

// Scene Root Container
export const Hero3DScene: React.FC = () => {
  const [hasWebGL, setHasWebGL] = React.useState<boolean>(true);

  React.useEffect(() => {
    setHasWebGL(isWebGLAvailable());
  }, []);

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hasWebGL) {
    return <WebGLFallbackCard />;
  }

  return (
    <WebGLErrorBoundary>
      <div className="relative w-full h-[420px] sm:h-[480px]">
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          className="w-full h-full pointer-events-auto"
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#FFFFFF" />
          <pointLight position={[-4, 3, 2]} intensity={2.5} color="#8B5CF6" distance={10} />
          <pointLight position={[4, -3, 2]} intensity={2} color="#3B82F6" distance={10} />

          {/* Ambient Subtle Particle Dust */}
          {!reducedMotion && (
            <Stars
              radius={15}
              depth={20}
              count={120}
              factor={2.5}
              saturation={0.5}
              fade
              speed={0.6}
            />
          )}

          {/* Floating Fintech Layered Stack */}
          <Float
            speed={reducedMotion ? 0 : 1.5}
            rotationIntensity={reducedMotion ? 0 : 0.4}
            floatIntensity={reducedMotion ? 0 : 0.6}
          >
            {/* Secondary Back Card (Electric Indigo / Sapphire) */}
            <FloatingCard
              position={[-0.4, 0.35, -0.7]}
              rotation={[-0.1, 0.2, -0.12]}
              color="#1E1B4B"
              emissive="#4338CA"
              reducedMotion={reducedMotion}
            />

            {/* Primary Foreground Card (Violet / Obsidian) */}
            <FloatingCard
              position={[0.2, -0.15, 0.3]}
              rotation={[0.1, -0.15, 0.08]}
              color="#171A27"
              emissive="#7C3AED"
              reducedMotion={reducedMotion}
            />

            {/* Centerpiece Energy Ring */}
            <EnergyRing reducedMotion={reducedMotion} />
          </Float>
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
};

export default Hero3DScene;
