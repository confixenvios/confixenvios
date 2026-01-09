import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, PerspectiveCamera } from '@react-three/drei';
import FloatingBoxes from './FloatingBoxes';

const Hero3DScene = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
          
          {/* Iluminação */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-10, 5, -5]} intensity={0.5} color="#fef3c7" />
          <pointLight position={[0, -5, 5]} intensity={0.4} color="#f59e0b" />
          
          {/* Caixas flutuantes */}
          <Float
            speed={1.5}
            rotationIntensity={0.2}
            floatIntensity={0.3}
          >
            <FloatingBoxes />
          </Float>
          
          {/* Environment para reflexos suaves */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hero3DScene;
