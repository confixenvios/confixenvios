import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, PerspectiveCamera, Stars } from '@react-three/drei';
import FloatingBoxes from './FloatingBoxes';

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
            position={[0, 0, 10]} 
            fov={45}
            rotation={[scrollY * 0.0001, 0, 0]}
          />
          
          {/* Fog para profundidade */}
          <fog attach="fog" args={['#fef3c7', 15, 35]} />
          
          {/* Iluminação ambiente */}
          <ambientLight intensity={0.5} />
          
          {/* Luz principal */}
          <directionalLight 
            position={[10, 15, 10]} 
            intensity={1.5} 
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          
          {/* Luzes de preenchimento */}
          <directionalLight position={[-8, 8, -8]} intensity={0.4} color="#fed7aa" />
          <pointLight position={[0, -8, 8]} intensity={0.3} color="#f97316" />
          <pointLight position={[-5, 5, 5]} intensity={0.2} color="#fef3c7" />
          
          {/* Rim light */}
          <spotLight
            position={[0, 10, -10]}
            angle={0.5}
            penumbra={1}
            intensity={0.5}
            color="#fff7ed"
          />
          
          {/* Caixas flutuantes com parallax */}
          <Float
            speed={1.2}
            rotationIntensity={0.15}
            floatIntensity={0.2}
          >
            <FloatingBoxes scrollY={scrollY} />
          </Float>
          
          {/* Partículas de fundo */}
          <Stars 
            radius={50} 
            depth={50} 
            count={200} 
            factor={3} 
            saturation={0} 
            fade 
            speed={0.5}
          />
          
          {/* Environment para reflexos */}
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3DScene;
