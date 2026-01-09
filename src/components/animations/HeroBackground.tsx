import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';

// Partículas flutuantes leves
const FloatingParticle = ({ delay, duration, x, y, size }: { delay: number; duration: number; x: string; y: string; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-red-500/10"
    style={{ 
      width: size, 
      height: size, 
      left: x, 
      top: y,
    }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Linha de rota animada
const RouteLine = ({ path, delay }: { path: string; delay: number }) => (
  <motion.svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 1000 600"
    preserveAspectRatio="none"
  >
    <motion.path
      d={path}
      stroke="rgba(220, 38, 38, 0.08)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeDasharray="8 12"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
      }}
    />
  </motion.svg>
);

// Ícone de localização pulsante
const LocationPulse = ({ x, y, delay }: { x: string; y: string; delay: number }) => (
  <motion.div
    className="absolute"
    style={{ left: x, top: y }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 1, 1.5, 1],
      opacity: [0, 1, 0.5, 1],
    }}
    transition={{
      duration: 3,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <div className="w-3 h-3 bg-red-500/30 rounded-full relative">
      <motion.div 
        className="absolute inset-0 bg-red-500/20 rounded-full"
        animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
    </div>
  </motion.div>
);

// Caminhão com animação baseada em scroll
const TruckAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll();

  // Suavizar a animação
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Caminhão entra da esquerda e para no centro
  const truckX = useTransform(smoothProgress, [0, 0.08, 0.15], ['-120%', '0%', '0%']);
  const truckOpacity = useTransform(smoothProgress, [0, 0.03], [0, 1]);
  const truckScale = useTransform(smoothProgress, [0.08, 0.15], [0.95, 1]);
  
  // Rodas girando durante movimento
  const wheelRotation = useTransform(smoothProgress, [0, 0.15], [0, 720]);

  return (
    <motion.div
      ref={containerRef}
      className="absolute bottom-[18%] left-1/2 -translate-x-1/2 z-10"
      style={{
        x: truckX,
        opacity: truckOpacity,
        scale: truckScale,
      }}
    >
      <svg
        width="200"
        height="100"
        viewBox="0 0 280 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-xl"
      >
        {/* Sombra */}
        <ellipse cx="140" cy="128" rx="100" ry="6" fill="rgba(0,0,0,0.08)" />
        
        {/* Baú */}
        <rect x="80" y="35" width="175" height="70" rx="3" fill="#f8f8f8" stroke="#e8e8e8" strokeWidth="1.5" />
        
        {/* Faixa vermelha */}
        <rect x="80" y="82" width="175" height="18" fill="#dc2626" />
        
        {/* Logo */}
        <text x="167" y="65" textAnchor="middle" fill="#dc2626" fontSize="14" fontWeight="bold" fontFamily="system-ui">
          CONFIX
        </text>
        <text x="167" y="76" textAnchor="middle" fill="#888" fontSize="6" fontFamily="system-ui">
          ENVIOS
        </text>
        
        {/* Cabine */}
        <path d="M22 55 L22 100 L80 100 L80 48 L52 48 L42 55 Z" fill="#dc2626" />
        
        {/* Janela */}
        <path d="M27 58 L27 72 L55 72 L55 52 L47 52 L40 58 Z" fill="#1e3a5f" opacity="0.85" />
        <path d="M29 60 L29 64 L42 64 L42 54 L38 54 L33 60 Z" fill="white" opacity="0.25" />
        
        {/* Grade */}
        <rect x="17" y="78" width="10" height="22" rx="2" fill="#1f2937" />
        
        {/* Farol */}
        <rect x="17" y="70" width="7" height="5" rx="1" fill="#fef08a" />
        
        {/* Chassi */}
        <rect x="17" y="100" width="240" height="6" rx="2" fill="#1f2937" />
        
        {/* Rodas */}
        <motion.g style={{ rotate: wheelRotation, transformOrigin: '198px 108px' }}>
          <circle cx="198" cy="108" r="14" fill="#1f2937" />
          <circle cx="198" cy="108" r="10" fill="#374151" />
          <circle cx="198" cy="108" r="4" fill="#6b7280" />
        </motion.g>
        
        <motion.g style={{ rotate: wheelRotation, transformOrigin: '224px 108px' }}>
          <circle cx="224" cy="108" r="14" fill="#1f2937" />
          <circle cx="224" cy="108" r="10" fill="#374151" />
          <circle cx="224" cy="108" r="4" fill="#6b7280" />
        </motion.g>
        
        <motion.g style={{ rotate: wheelRotation, transformOrigin: '50px 108px' }}>
          <circle cx="50" cy="108" r="12" fill="#1f2937" />
          <circle cx="50" cy="108" r="8" fill="#374151" />
          <circle cx="50" cy="108" r="3" fill="#6b7280" />
        </motion.g>
      </svg>
    </motion.div>
  );
};

const HeroBackground = () => {
  const particles = [
    { delay: 0, duration: 6, x: '10%', y: '20%', size: 8 },
    { delay: 1, duration: 7, x: '85%', y: '15%', size: 6 },
    { delay: 2, duration: 5, x: '75%', y: '70%', size: 10 },
    { delay: 0.5, duration: 8, x: '20%', y: '75%', size: 5 },
    { delay: 1.5, duration: 6, x: '90%', y: '50%', size: 7 },
    { delay: 3, duration: 7, x: '5%', y: '50%', size: 6 },
  ];

  const locations = [
    { x: '15%', y: '25%', delay: 0 },
    { x: '80%', y: '20%', delay: 1 },
    { x: '70%', y: '65%', delay: 2 },
    { x: '25%', y: '70%', delay: 1.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradiente de fundo suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-50/50" />
      
      {/* Círculos decorativos */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-red-100/30 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-100/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      
      {/* Partículas flutuantes */}
      {particles.map((particle, i) => (
        <FloatingParticle key={i} {...particle} />
      ))}
      
      {/* Pontos de localização */}
      {locations.map((loc, i) => (
        <LocationPulse key={i} {...loc} />
      ))}
      
      {/* Caminhão animado */}
      <TruckAnimation />
      
      {/* Grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(220, 38, 38, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220, 38, 38, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
};

export default HeroBackground;
