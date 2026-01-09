import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingBoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotationSpeed: number;
  floatSpeed: number;
  floatAmplitude: number;
  delay: number;
}

const FloatingBox = ({ position, size, color, rotationSpeed, floatSpeed, floatAmplitude, delay }: FloatingBoxProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      meshRef.current.rotation.x += rotationSpeed * 0.005;
      meshRef.current.rotation.y += rotationSpeed * 0.008;
      meshRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude;
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={size}
      position={position}
      radius={0.08}
      smoothness={4}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
        envMapIntensity={0.5}
      />
    </RoundedBox>
  );
};

// Fita decorativa na caixa
const PackageWithTape = ({ position, size, color, rotationSpeed, floatSpeed, floatAmplitude, delay }: FloatingBoxProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime + delay;
      groupRef.current.rotation.x += rotationSpeed * 0.004;
      groupRef.current.rotation.y += rotationSpeed * 0.006;
      groupRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Caixa principal */}
      <RoundedBox args={size} radius={0.05} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
      </RoundedBox>
      {/* Fita horizontal */}
      <Box args={[size[0] + 0.02, 0.08, size[2] + 0.02]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#d97706" roughness={0.5} />
      </Box>
      {/* Fita vertical */}
      <Box args={[0.08, size[1] + 0.02, size[2] + 0.02]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#d97706" roughness={0.5} />
      </Box>
    </group>
  );
};

const FloatingBoxes = () => {
  const boxes = useMemo(() => [
    // Caixas grandes ao fundo
    { position: [-4, 2, -3] as [number, number, number], size: [1.2, 1.2, 1.2] as [number, number, number], color: '#f5d0a9', rotationSpeed: 0.3, floatSpeed: 0.8, floatAmplitude: 0.3, delay: 0, hasTape: true },
    { position: [4, 1, -4] as [number, number, number], size: [1.5, 1, 1] as [number, number, number], color: '#e8c9a0', rotationSpeed: 0.25, floatSpeed: 0.6, floatAmplitude: 0.4, delay: 1, hasTape: true },
    
    // Caixas médias laterais
    { position: [-3, -1, -2] as [number, number, number], size: [0.8, 0.8, 0.8] as [number, number, number], color: '#f0d9b5', rotationSpeed: 0.4, floatSpeed: 1, floatAmplitude: 0.25, delay: 2, hasTape: false },
    { position: [3.5, 0, -2] as [number, number, number], size: [0.9, 0.7, 0.9] as [number, number, number], color: '#deb887', rotationSpeed: 0.35, floatSpeed: 0.9, floatAmplitude: 0.35, delay: 0.5, hasTape: true },
    
    // Caixas pequenas espalhadas
    { position: [-2, 1.5, 0] as [number, number, number], size: [0.5, 0.5, 0.5] as [number, number, number], color: '#f5e6d3', rotationSpeed: 0.5, floatSpeed: 1.2, floatAmplitude: 0.2, delay: 1.5, hasTape: false },
    { position: [2, -0.5, -1] as [number, number, number], size: [0.6, 0.4, 0.6] as [number, number, number], color: '#e6d5c3', rotationSpeed: 0.45, floatSpeed: 1.1, floatAmplitude: 0.3, delay: 3, hasTape: false },
    { position: [0, 2, -2] as [number, number, number], size: [0.7, 0.7, 0.7] as [number, number, number], color: '#d4a574', rotationSpeed: 0.3, floatSpeed: 0.7, floatAmplitude: 0.4, delay: 2.5, hasTape: true },
    
    // Caixas extras para preenchimento
    { position: [-1.5, -1.5, -1] as [number, number, number], size: [0.4, 0.4, 0.4] as [number, number, number], color: '#f5deb3', rotationSpeed: 0.6, floatSpeed: 1.3, floatAmplitude: 0.15, delay: 4, hasTape: false },
    { position: [1.5, 1, -3] as [number, number, number], size: [1, 0.8, 0.8] as [number, number, number], color: '#e8d4b8', rotationSpeed: 0.28, floatSpeed: 0.75, floatAmplitude: 0.35, delay: 1.2, hasTape: true },
    { position: [-0.5, -0.8, 0.5] as [number, number, number], size: [0.55, 0.55, 0.55] as [number, number, number], color: '#f0e4d7', rotationSpeed: 0.5, floatSpeed: 1.15, floatAmplitude: 0.2, delay: 3.5, hasTape: false },
  ], []);

  return (
    <group>
      {boxes.map((box, index) => (
        box.hasTape ? (
          <PackageWithTape key={index} {...box} />
        ) : (
          <FloatingBox key={index} {...box} />
        )
      ))}
    </group>
  );
};

export default FloatingBoxes;
