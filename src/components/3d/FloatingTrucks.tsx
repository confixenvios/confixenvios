import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TruckProps {
  position: [number, number, number];
  scale?: number;
  rotationSpeed: number;
  floatSpeed: number;
  floatAmplitude: number;
  delay: number;
  scrollY?: number;
}

// Caminhão de entregas estilizado
const DeliveryTruck = ({ position, scale = 1, rotationSpeed, floatSpeed, floatAmplitude, delay, scrollY = 0 }: TruckProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const initialY = position[1];
  const initialX = position[0];

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime + delay;
      groupRef.current.rotation.y = Math.sin(time * rotationSpeed * 0.3) * 0.3;
      groupRef.current.rotation.x = Math.sin(time * rotationSpeed * 0.2) * 0.1;
      groupRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude - scrollY * 0.001;
      groupRef.current.position.x = initialX + Math.cos(time * floatSpeed * 0.3) * floatAmplitude * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Cabine do caminhão */}
      <mesh position={[-0.8, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.9]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.3} metalness={0.2} clearcoat={0.5} />
      </mesh>
      
      {/* Janela da cabine */}
      <mesh position={[-0.75, 0.45, 0]}>
        <boxGeometry args={[0.3, 0.35, 0.85]} />
        <meshPhysicalMaterial color="#1e3a5f" roughness={0.1} metalness={0.8} clearcoat={1} />
      </mesh>
      
      {/* Carroceria/Baú */}
      <mesh position={[0.5, 0.4, 0]}>
        <boxGeometry args={[1.6, 1, 1]} />
        <meshPhysicalMaterial color="#f5f5f5" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Faixa vermelha no baú */}
      <mesh position={[0.5, 0.1, 0]}>
        <boxGeometry args={[1.62, 0.15, 1.02]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} />
      </mesh>
      
      {/* Chassi */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[2.6, 0.15, 0.7]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      
      {/* Rodas traseiras */}
      <mesh position={[0.6, -0.35, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[0.6, -0.35, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      
      {/* Rodas dianteiras */}
      <mesh position={[-0.8, -0.35, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[-0.8, -0.35, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      
      {/* Faróis */}
      <mesh position={[-1.18, 0.15, 0.3]}>
        <boxGeometry args={[0.05, 0.12, 0.15]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.18, 0.15, -0.3]}>
        <boxGeometry args={[0.05, 0.12, 0.15]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

// Pacote pequeno flutuante
const FloatingPackage = ({ position, scale = 1, rotationSpeed, floatSpeed, floatAmplitude, delay, scrollY = 0 }: TruckProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      meshRef.current.rotation.x = time * rotationSpeed * 0.4;
      meshRef.current.rotation.y = time * rotationSpeed * 0.5;
      meshRef.current.position.y = initialY + Math.sin(time * floatSpeed) * floatAmplitude - scrollY * 0.001;
    }
  });

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshPhysicalMaterial color="#d4a574" roughness={0.4} />
      </mesh>
      {/* Fita */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.52, 0.52]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  );
};

interface FloatingTrucksProps {
  scrollY?: number;
}

const FloatingTrucks = ({ scrollY = 0 }: FloatingTrucksProps) => {
  return (
    <group>
      {/* Caminhões principais */}
      <DeliveryTruck 
        position={[-4, 1.5, -4]} 
        scale={1.2}
        rotationSpeed={0.15} 
        floatSpeed={0.5} 
        floatAmplitude={0.4} 
        delay={0} 
        scrollY={scrollY}
      />
      <DeliveryTruck 
        position={[4.5, 0.5, -5]} 
        scale={1.4}
        rotationSpeed={0.12} 
        floatSpeed={0.4} 
        floatAmplitude={0.5} 
        delay={2} 
        scrollY={scrollY}
      />
      <DeliveryTruck 
        position={[0, 3, -7]} 
        scale={0.9}
        rotationSpeed={0.1} 
        floatSpeed={0.35} 
        floatAmplitude={0.35} 
        delay={4} 
        scrollY={scrollY}
      />
      <DeliveryTruck 
        position={[-3, -1.5, -3]} 
        scale={0.8}
        rotationSpeed={0.18} 
        floatSpeed={0.55} 
        floatAmplitude={0.3} 
        delay={1.5} 
        scrollY={scrollY}
      />
      <DeliveryTruck 
        position={[3, 2.5, -6]} 
        scale={0.7}
        rotationSpeed={0.14} 
        floatSpeed={0.45} 
        floatAmplitude={0.4} 
        delay={3} 
        scrollY={scrollY}
      />
      
      {/* Pacotes flutuantes ao redor */}
      <FloatingPackage position={[-2, 2, -2]} scale={0.8} rotationSpeed={0.3} floatSpeed={0.9} floatAmplitude={0.25} delay={0.5} scrollY={scrollY} />
      <FloatingPackage position={[2.5, -0.5, -2]} scale={0.6} rotationSpeed={0.35} floatSpeed={1} floatAmplitude={0.2} delay={1} scrollY={scrollY} />
      <FloatingPackage position={[-1, -1, -1]} scale={0.5} rotationSpeed={0.4} floatSpeed={1.1} floatAmplitude={0.15} delay={2.5} scrollY={scrollY} />
      <FloatingPackage position={[1.5, 1.5, -3]} scale={0.7} rotationSpeed={0.28} floatSpeed={0.8} floatAmplitude={0.22} delay={3.5} scrollY={scrollY} />
      <FloatingPackage position={[-0.5, 0.5, 0]} scale={0.4} rotationSpeed={0.45} floatSpeed={1.2} floatAmplitude={0.12} delay={4.5} scrollY={scrollY} />
    </group>
  );
};

export default FloatingTrucks;
