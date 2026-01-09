import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingBoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotationSpeed: number;
  floatSpeed: number;
  floatAmplitude: number;
  delay: number;
  scrollY?: number;
}

const FloatingBox = ({ position, size, color, rotationSpeed, floatSpeed, floatAmplitude, delay, scrollY = 0 }: FloatingBoxProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = position[1];
  const initialX = position[0];

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      meshRef.current.rotation.x = time * rotationSpeed * 0.3;
      meshRef.current.rotation.y = time * rotationSpeed * 0.4;
      meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;
      meshRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude - scrollY * 0.002;
      meshRef.current.position.x = initialX + Math.cos(time * floatSpeed * 0.5) * floatAmplitude * 0.3;
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={size}
      position={position}
      radius={0.06}
      smoothness={4}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={color}
        roughness={0.2}
        metalness={0.05}
        clearcoat={0.3}
        clearcoatRoughness={0.2}
        envMapIntensity={0.8}
      />
    </RoundedBox>
  );
};

// Pacote com fita decorativa
const PackageWithTape = ({ position, size, color, rotationSpeed, floatSpeed, floatAmplitude, delay, scrollY = 0 }: FloatingBoxProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const initialY = position[1];
  const initialX = position[0];

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime + delay;
      groupRef.current.rotation.x = time * rotationSpeed * 0.25;
      groupRef.current.rotation.y = time * rotationSpeed * 0.35;
      groupRef.current.rotation.z = Math.sin(time * 0.4) * 0.08;
      groupRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude - scrollY * 0.002;
      groupRef.current.position.x = initialX + Math.cos(time * floatSpeed * 0.5) * floatAmplitude * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Caixa principal */}
      <RoundedBox args={size} radius={0.04} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={0.25} metalness={0.03} clearcoat={0.2} />
      </RoundedBox>
      {/* Fita horizontal */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size[0] + 0.02, 0.06, size[2] + 0.02]} />
        <meshStandardMaterial color="#ea580c" roughness={0.4} />
      </mesh>
      {/* Fita vertical */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.06, size[1] + 0.02, size[2] + 0.02]} />
        <meshStandardMaterial color="#ea580c" roughness={0.4} />
      </mesh>
    </group>
  );
};

interface FloatingBoxesProps {
  scrollY?: number;
}

const FloatingBoxes = ({ scrollY = 0 }: FloatingBoxesProps) => {
  const boxes = useMemo(() => [
    // Caixas grandes - fundo
    { position: [-5, 3, -6] as [number, number, number], size: [1.8, 1.8, 1.8] as [number, number, number], color: '#fcd9b6', rotationSpeed: 0.15, floatSpeed: 0.5, floatAmplitude: 0.5, delay: 0, hasTape: true },
    { position: [5.5, 2, -7] as [number, number, number], size: [2, 1.4, 1.4] as [number, number, number], color: '#f5c99d', rotationSpeed: 0.12, floatSpeed: 0.4, floatAmplitude: 0.6, delay: 1.5, hasTape: true },
    { position: [0, 4, -8] as [number, number, number], size: [1.5, 1.5, 1.5] as [number, number, number], color: '#e8b888', rotationSpeed: 0.1, floatSpeed: 0.35, floatAmplitude: 0.4, delay: 3, hasTape: true },
    
    // Caixas médias - meio
    { position: [-3.5, 0, -3] as [number, number, number], size: [1.1, 1.1, 1.1] as [number, number, number], color: '#fde4c8', rotationSpeed: 0.22, floatSpeed: 0.7, floatAmplitude: 0.35, delay: 0.8, hasTape: false },
    { position: [4, -1, -4] as [number, number, number], size: [1.2, 0.9, 1.2] as [number, number, number], color: '#f0d4a8', rotationSpeed: 0.2, floatSpeed: 0.65, floatAmplitude: 0.4, delay: 2, hasTape: true },
    { position: [-1, 2.5, -4] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: '#ffe6c7', rotationSpeed: 0.18, floatSpeed: 0.55, floatAmplitude: 0.45, delay: 4, hasTape: false },
    { position: [2.5, 0.5, -3] as [number, number, number], size: [0.9, 0.9, 0.9] as [number, number, number], color: '#f7dbb5', rotationSpeed: 0.25, floatSpeed: 0.75, floatAmplitude: 0.3, delay: 1.2, hasTape: true },
    
    // Caixas pequenas - frente
    { position: [-2, -1.5, -1] as [number, number, number], size: [0.6, 0.6, 0.6] as [number, number, number], color: '#fff0db', rotationSpeed: 0.35, floatSpeed: 1, floatAmplitude: 0.2, delay: 2.5, hasTape: false },
    { position: [1.5, 1.5, -1.5] as [number, number, number], size: [0.7, 0.5, 0.7] as [number, number, number], color: '#fce5c9', rotationSpeed: 0.3, floatSpeed: 0.9, floatAmplitude: 0.25, delay: 3.5, hasTape: false },
    { position: [-0.5, -0.5, -0.5] as [number, number, number], size: [0.5, 0.5, 0.5] as [number, number, number], color: '#ffe8d0', rotationSpeed: 0.4, floatSpeed: 1.1, floatAmplitude: 0.18, delay: 5, hasTape: false },
    { position: [3, 2.5, -2] as [number, number, number], size: [0.65, 0.65, 0.65] as [number, number, number], color: '#f8dfc0', rotationSpeed: 0.32, floatSpeed: 0.85, floatAmplitude: 0.22, delay: 1.8, hasTape: false },
    
    // Extras para profundidade
    { position: [-4.5, -2, -5] as [number, number, number], size: [0.8, 0.8, 0.8] as [number, number, number], color: '#eed9b6', rotationSpeed: 0.28, floatSpeed: 0.8, floatAmplitude: 0.3, delay: 4.5, hasTape: true },
    { position: [2, -2, -2] as [number, number, number], size: [0.55, 0.55, 0.55] as [number, number, number], color: '#fff5e6', rotationSpeed: 0.38, floatSpeed: 1.05, floatAmplitude: 0.15, delay: 2.2, hasTape: false },
  ], []);

  return (
    <group>
      {boxes.map((box, index) => (
        box.hasTape ? (
          <PackageWithTape key={index} {...box} scrollY={scrollY} />
        ) : (
          <FloatingBox key={index} {...box} scrollY={scrollY} />
        )
      ))}
    </group>
  );
};

export default FloatingBoxes;
