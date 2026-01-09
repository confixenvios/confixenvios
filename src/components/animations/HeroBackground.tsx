import { motion } from 'framer-motion';
import heroTruck from '@/assets/hero-truck-confix.jpg';

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
    <div className="absolute inset-0 overflow-hidden">
      {/* Imagem de fundo do caminhão */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <img 
          src={heroTruck} 
          alt="Caminhão Confix Envios" 
          className="w-full h-full object-cover"
        />
        {/* Overlay para melhorar legibilidade do texto */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white/80" />
      </motion.div>
      
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
      
      {/* Grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
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
