import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, PerspectiveCamera } from '@react-three/drei';
import FloatingTrucks from './FloatingTrucks';

interface Hero3DSceneProps {
  scrollY?: number;
}

const Hero3DScene = ({ scrollY = 0 }: Hero3DSceneProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        style={{ background: 'transparent' }}
        shadows
      >
        <Suspense fallback={null}>
          <PerspectiveCamera 
            makeDefault 
            position={[0, 0, 12]} 
            fov={45}
          />
          
          {/* Fog para profundidade */}
          <fog attach="fog" args={['#fef2f2', 18, 40]} />
          
          {/* Iluminação ambiente */}
          <ambientLight intensity={0.6} />
          
          {/* Luz principal */}
          <directionalLight 
            position={[10, 15, 10]} 
            intensity={1.5} 
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          
          {/* Luzes de preenchimento */}
          <directionalLight position={[-8, 8, -8]} intensity={0.4} color="#fee2e2" />
          <pointLight position={[0, -8, 8]} intensity={0.3} color="#dc2626" />
          <pointLight position={[-5, 5, 5]} intensity={0.2} color="#fef2f2" />
          
          {/* Rim light vermelho */}
          <spotLight
            position={[0, 10, -10]}
            angle={0.5}
            penumbra={1}
            intensity={0.5}
            color="#fecaca"
          />
          
          {/* Caminhões e pacotes flutuantes */}
          <Float
            speed={1}
            rotationIntensity={0.1}
            floatIntensity={0.15}
          >
            <FloatingTrucks scrollY={scrollY} />
          </Float>
          
          {/* Environment para reflexos */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3DScene;
