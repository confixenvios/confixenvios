import { motion } from 'framer-motion';
import heroTruck from '@/assets/hero-truck-confix.jpg';

const HeroBackground = () => {
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
        {/* Overlay leve para legibilidade do texto */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/30" />
      </motion.div>
    </div>
  );
};

export default HeroBackground;
