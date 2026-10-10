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

// Scene Root Container
export const Hero3DScene: React.FC = () => {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
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
  );
};

export default Hero3DScene;
