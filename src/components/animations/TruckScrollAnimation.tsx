import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef } from 'react';

const TruckScrollAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Suavizar a animação
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Caminhão entra da esquerda (-100%) até o centro (0%)
  const truckX = useTransform(smoothProgress, [0, 0.3, 0.5], ['-100%', '0%', '0%']);
  const truckOpacity = useTransform(smoothProgress, [0, 0.1, 0.5], [0, 1, 1]);
  const truckScale = useTransform(smoothProgress, [0.3, 0.5], [0.9, 1]);
  
  // Rodas girando
  const wheelRotation = useTransform(smoothProgress, [0, 0.5], [0, 720]);
  
  // Fumaça/poeira aparece durante movimento
  const dustOpacity = useTransform(smoothProgress, [0.1, 0.3, 0.5], [0, 1, 0]);
  const dustX = useTransform(smoothProgress, [0.1, 0.5], [0, -200]);

  // Pacotes aparecem depois
  const packagesOpacity = useTransform(smoothProgress, [0.4, 0.6], [0, 1]);
  const packagesY = useTransform(smoothProgress, [0.4, 0.6], [20, 0]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Linha de estrada sutil */}
      <motion.div 
        className="absolute bottom-[30%] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-200 to-transparent"
        style={{ opacity: useTransform(smoothProgress, [0.2, 0.4], [0, 0.5]) }}
      />

      {/* Partículas de poeira/velocidade */}
      <motion.div
        className="absolute bottom-[32%] left-1/2"
        style={{ 
          opacity: dustOpacity,
          x: dustX,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-red-200/60"
            style={{
              left: -i * 30,
              top: Math.sin(i) * 10,
            }}
            animate={{
              scale: [1, 1.5, 0],
              opacity: [0.6, 0.3, 0],
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              repeat: Infinity,
            }}
          />
        ))}
      </motion.div>

      {/* Caminhão Principal */}
      <motion.div
        className="absolute bottom-[25%] left-1/2 -translate-x-1/2"
        style={{
          x: truckX,
          opacity: truckOpacity,
          scale: truckScale,
        }}
      >
        <svg
          width="280"
          height="140"
          viewBox="0 0 280 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Sombra do caminhão */}
          <ellipse cx="140" cy="130" rx="120" ry="8" fill="rgba(0,0,0,0.1)" />
          
          {/* Baú/Carroceria */}
          <rect x="80" y="30" width="180" height="80" rx="4" fill="#f5f5f5" stroke="#e5e5e5" strokeWidth="2" />
          
          {/* Faixa vermelha no baú */}
          <rect x="80" y="85" width="180" height="20" fill="#dc2626" />
          
          {/* Logo CONFIX no baú */}
          <text x="170" y="70" textAnchor="middle" fill="#dc2626" fontSize="18" fontWeight="bold" fontFamily="system-ui">
            CONFIX
          </text>
          <text x="170" y="82" textAnchor="middle" fill="#666" fontSize="8" fontFamily="system-ui">
            ENVIOS
          </text>
          
          {/* Cabine */}
          <path d="M20 55 L20 105 L80 105 L80 45 L50 45 L40 55 Z" fill="#dc2626" />
          
          {/* Janela da cabine */}
          <path d="M25 58 L25 75 L55 75 L55 50 L45 50 L38 58 Z" fill="#1e3a5f" opacity="0.9" />
          
          {/* Reflexo na janela */}
          <path d="M27 60 L27 65 L40 65 L40 52 L35 52 L30 60 Z" fill="white" opacity="0.3" />
          
          {/* Grade frontal */}
          <rect x="15" y="80" width="12" height="25" rx="2" fill="#1f2937" />
          <rect x="17" y="82" width="3" height="8" fill="#dc2626" opacity="0.8" />
          <rect x="22" y="82" width="3" height="8" fill="#dc2626" opacity="0.8" />
          
          {/* Faróis */}
          <rect x="15" y="70" width="8" height="6" rx="1" fill="#fef08a" />
          <rect x="16" y="71" width="4" height="4" rx="1" fill="#fbbf24" />
          
          {/* Chassi */}
          <rect x="15" y="105" width="250" height="8" rx="2" fill="#1f2937" />
          
          {/* Roda traseira 1 */}
          <motion.g style={{ rotate: wheelRotation, originX: '200px', originY: '115px' }}>
            <circle cx="200" cy="115" r="18" fill="#1f2937" />
            <circle cx="200" cy="115" r="14" fill="#374151" />
            <circle cx="200" cy="115" r="6" fill="#6b7280" />
            {/* Raios */}
            <line x1="200" y1="101" x2="200" y2="107" stroke="#6b7280" strokeWidth="2" />
            <line x1="200" y1="123" x2="200" y2="129" stroke="#6b7280" strokeWidth="2" />
            <line x1="186" y1="115" x2="192" y2="115" stroke="#6b7280" strokeWidth="2" />
            <line x1="208" y1="115" x2="214" y2="115" stroke="#6b7280" strokeWidth="2" />
          </motion.g>
          
          {/* Roda traseira 2 */}
          <motion.g style={{ rotate: wheelRotation, originX: '230px', originY: '115px' }}>
            <circle cx="230" cy="115" r="18" fill="#1f2937" />
            <circle cx="230" cy="115" r="14" fill="#374151" />
            <circle cx="230" cy="115" r="6" fill="#6b7280" />
            <line x1="230" y1="101" x2="230" y2="107" stroke="#6b7280" strokeWidth="2" />
            <line x1="230" y1="123" x2="230" y2="129" stroke="#6b7280" strokeWidth="2" />
            <line x1="216" y1="115" x2="222" y2="115" stroke="#6b7280" strokeWidth="2" />
            <line x1="238" y1="115" x2="244" y2="115" stroke="#6b7280" strokeWidth="2" />
          </motion.g>
          
          {/* Roda dianteira */}
          <motion.g style={{ rotate: wheelRotation, originX: '50px', originY: '115px' }}>
            <circle cx="50" cy="115" r="16" fill="#1f2937" />
            <circle cx="50" cy="115" r="12" fill="#374151" />
            <circle cx="50" cy="115" r="5" fill="#6b7280" />
            <line x1="50" y1="103" x2="50" y2="108" stroke="#6b7280" strokeWidth="2" />
            <line x1="50" y1="122" x2="50" y2="127" stroke="#6b7280" strokeWidth="2" />
            <line x1="38" y1="115" x2="43" y2="115" stroke="#6b7280" strokeWidth="2" />
            <line x1="57" y1="115" x2="62" y2="115" stroke="#6b7280" strokeWidth="2" />
          </motion.g>
          
          {/* Retrovisor */}
          <rect x="8" y="55" width="4" height="12" rx="1" fill="#1f2937" />
          <rect x="5" y="52" width="6" height="8" rx="1" fill="#374151" />
        </svg>
      </motion.div>

      {/* Pacotes flutuantes que aparecem depois */}
      <motion.div
        className="absolute bottom-[55%] left-1/2 -translate-x-1/2 flex gap-8"
        style={{
          opacity: packagesOpacity,
          y: packagesY,
        }}
      >
        {/* Pacote 1 */}
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-12 h-12 bg-amber-100 rounded shadow-lg border border-amber-200 relative">
            <div className="absolute inset-x-0 top-1/2 h-1 bg-red-500 -translate-y-1/2" />
            <div className="absolute inset-y-0 left-1/2 w-1 bg-red-500 -translate-x-1/2" />
          </div>
        </motion.div>
        
        {/* Pacote 2 */}
        <motion.div
          className="relative"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="w-10 h-10 bg-amber-50 rounded shadow-lg border border-amber-200 relative">
            <div className="absolute inset-x-0 top-1/2 h-1 bg-red-500 -translate-y-1/2" />
            <div className="absolute inset-y-0 left-1/2 w-1 bg-red-500 -translate-x-1/2" />
          </div>
        </motion.div>
        
        {/* Pacote 3 */}
        <motion.div
          className="relative"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="w-8 h-8 bg-amber-100 rounded shadow-lg border border-amber-200 relative">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 -translate-y-1/2" />
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-red-500 -translate-x-1/2" />
          </div>
        </motion.div>
      </motion.div>

      {/* Gradiente de fundo suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-red-50/30 pointer-events-none" />
    </div>
  );
};

export default TruckScrollAnimation;
