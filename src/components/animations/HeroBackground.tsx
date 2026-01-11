import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import heroTruck from '@/assets/hero-truck-confix.jpg';

const HeroBackground = () => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload da imagem
  useEffect(() => {
    const img = new Image();
    img.src = heroTruck;
    img.onload = () => setImageLoaded(true);
    
    // Se a imagem já estiver em cache, onload pode não disparar
    if (img.complete) {
      setImageLoaded(true);
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Placeholder com gradiente enquanto carrega */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-red-100 via-rose-50 to-red-50 transition-opacity duration-500 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
      />
      
      {/* Imagem de fundo do caminhão */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img 
          src={heroTruck} 
          alt="Caminhão Confix Envios" 
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
      </motion.div>
    </div>
  );
};

export default HeroBackground;
