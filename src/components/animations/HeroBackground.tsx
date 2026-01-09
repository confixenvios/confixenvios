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
      </motion.div>
    </div>
  );
};

export default HeroBackground;
