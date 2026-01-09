import { motion } from 'framer-motion';

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

const HeroBackground = () => {
  const particles = [
    { delay: 0, duration: 6, x: '10%', y: '20%', size: 8 },
    { delay: 1, duration: 7, x: '85%', y: '15%', size: 6 },
    { delay: 2, duration: 5, x: '75%', y: '70%', size: 10 },
    { delay: 0.5, duration: 8, x: '20%', y: '75%', size: 5 },
    { delay: 1.5, duration: 6, x: '90%', y: '50%', size: 7 },
    { delay: 3, duration: 7, x: '5%', y: '50%', size: 6 },
    { delay: 2.5, duration: 5, x: '50%', y: '10%', size: 4 },
    { delay: 4, duration: 6, x: '30%', y: '85%', size: 8 },
    { delay: 1, duration: 8, x: '60%', y: '80%', size: 5 },
    { delay: 3.5, duration: 7, x: '95%', y: '85%', size: 6 },
  ];

  const routes = [
    { path: "M50,300 Q250,200 450,280 T850,250", delay: 0 },
    { path: "M100,450 Q350,350 550,400 T950,350", delay: 1.5 },
    { path: "M0,150 Q200,250 400,150 T800,200", delay: 3 },
  ];

  const locations = [
    { x: '15%', y: '25%', delay: 0 },
    { x: '80%', y: '20%', delay: 1 },
    { x: '70%', y: '65%', delay: 2 },
    { x: '25%', y: '70%', delay: 1.5 },
    { x: '88%', y: '45%', delay: 2.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradiente de fundo suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-50/50" />
      
      {/* Círculos decorativos grandes e sutis */}
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
      
      {/* Linhas de rotas */}
      {routes.map((route, i) => (
        <RouteLine key={i} path={route.path} delay={route.delay} />
      ))}
      
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
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(220, 38, 38, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220, 38, 38, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

export default HeroBackground;
