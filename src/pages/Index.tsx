import Header from "@/components/Header";
import { Truck, Package, Building, Globe, MapPin, Phone, Mail, DollarSign, Clock, TrendingUp, Instagram, Facebook, CheckCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lazy, Suspense } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  ParallaxSection,
  MagneticButton,
  RevealText,
} from "@/components/animations/ScrollAnimations";

// Client logos
import centauroLogo from "@/assets/clients/centauro-logo.png";
import hankerLogo from "@/assets/clients/hanker-logo.webp";
import cabanaLogo from "@/assets/clients/cabana-logo.webp";
import netshoesLogo from "@/assets/clients/netshoes-logo.png";
import avodahLogo from "@/assets/clients/avodah-logo.png";
import magaluLogo from "@/assets/clients/magalu-logo.png";
import deliveryProfessional from "@/assets/delivery-professional.webp";

// Import HeroBackground directly (critical for LCP)
import HeroBackground from "@/components/animations/HeroBackground";

const Index = () => {
  const { loading } = useAuth();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-red-100 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  const services = [
    { icon: Package, title: "FRACIONADOS", description: "Rede de transporte estruturada que garante a entrega e coletas nos estados onde atua." },
    { icon: Truck, title: "CARGA DEDICADA", description: "Soluções em cargas dedicadas para todo Brasil, utilizando uma rede de veículos cadastrados e próprios." },
    { icon: Globe, title: "TRANSFERÊNCIAS", description: "Trabalhamos há mais de 6 anos com transferência entre Centros de Distribuição e Abastecimento de Lojas." },
    { icon: Truck, title: "FIRST E LAST MILE E-COMMERCE", description: "Processamos mais de 5 mil pacotes e realizamos em média 3 mil entregas diariamente, com performance de 99,5%." },
    { icon: Building, title: "CROSS DOCKING", description: "Dispomos de estrutura e equipe especializada em armazenamento, processamento e redespacho de mercadorias de parceiros." },
    { icon: MapPin, title: "TRANSIT POINT", description: "Locamos posições de Palet, com ou sem processamento interno. Uma solução cada vez mais utilizada por empresas parceiras." },
  ];

  const diferenciais = [
    { number: "01", title: "Experiência", description: "Mais de 10 anos de experiência em Transferência Line Haul e Abastecimento de Lojas" },
    { number: "02", title: "Frota Própria", description: "Garantimos a qualidade e segurança do transporte com nossa frota, veículos reservas e seleção minuciosa de agregados." },
    { number: "03", title: "Tecnologia", description: "Sistema para gerenciar a frota e rastrear as cargas, proporcionando total controle e transparência." },
    { number: "04", title: "Atendimento Personalizado", description: "Adaptamos nossas soluções às necessidades específicas de cada cliente, buscando o melhor resultado." },
  ];

  const clientLogos = [
    { src: magaluLogo, alt: "Magazine Luiza" },
    { src: hankerLogo, alt: "Hanker" },
    { src: cabanaLogo, alt: "Cabana Magazine" },
    { src: avodahLogo, alt: "Avodah" },
    { src: centauroLogo, alt: "Centauro" },
    { src: netshoesLogo, alt: "Netshoes" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-red-100 overflow-x-hidden pt-16">
      <Header />
      
      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex flex-col overflow-hidden"
      >
        {/* Animated Background */}
        <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-red-50/50" />}>
          <HeroBackground />
        </Suspense>
        
        {/* Hero Content - Top */}
        <div className="relative z-10 pt-24 px-4 max-w-5xl mx-auto text-center">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <span className="text-white drop-shadow-lg">Coletamos e Entregamos</span>
            <br />
            <span className="text-white drop-shadow-lg">em todo o </span>
            <span className="text-red-600 drop-shadow-lg">Brasil</span>
          </motion.h1>
          
          {/* Benefícios */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {[
              { icon: DollarSign, text: "Menor preço" },
              { icon: Clock, text: "Menor prazo" },
              { icon: TrendingUp, text: "Maior Agilidade" },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white/90 backdrop-blur-md rounded-full px-5 py-3 flex items-center gap-2 shadow-lg border border-white/50"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <item.icon className="w-5 h-5 text-red-600" />
                <span className="font-medium text-foreground">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* CTA Button - Bottom */}
        <div className="relative z-10 pb-24 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <MagneticButton>
              <Button size="lg" className="px-10 py-7 text-lg shadow-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 border-0" asChild>
                <Link to="/cotacaopreview">
                  <Package className="mr-2 h-5 w-5" />
                  COTAR FRETE
                </Link>
              </Button>
            </MagneticButton>
          </motion.div>
          
          {/* Scroll indicator */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center mx-auto"
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <motion.div
                className="w-1.5 h-3 bg-white/70 rounded-full mt-2"
                animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Clientes Section */}
      <section className="py-20 px-4 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-50/50 to-transparent" />
        
        <div className="container mx-auto relative z-10">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Empresas que <span className="text-red-600">confiam</span> em nós
            </h2>
            <p className="text-muted-foreground mb-12 max-w-3xl mx-auto text-center text-lg">
              Grandes marcas já confiam em nossas soluções logísticas
            </p>
          </FadeInUp>
          
          <div className="overflow-hidden">
            <motion.div 
              className="flex gap-12 md:gap-20"
              animate={{ x: [0, -1200] }}
              transition={{ 
                duration: 25, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            >
              {[...clientLogos, ...clientLogos, ...clientLogos].map((logo, index) => (
                <div key={index} className="h-16 flex items-center justify-center px-4 flex-shrink-0">
                  <img 
                    src={logo.src} 
                    alt={logo.alt} 
                    className="max-h-12 max-w-32 object-contain opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" 
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nosso Diferencial */}
      <section id="diferencial" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-rose-50 to-red-100" />
        
        <div className="container mx-auto relative z-10">
          <FadeInUp className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Excelência logística para operações que exigem <span className="text-red-600">agilidade</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              Combinamos estrutura própria, tecnologia e atendimento consultivo para oferecer entregas sob medida.
            </p>
          </FadeInUp>
          
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12" staggerDelay={0.15}>
            {diferenciais.map((item, index) => (
              <StaggerItem key={index}>
                <motion.div 
                  className="text-center p-6"
                  whileHover={{ y: -5 }}
                >
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-2xl font-bold text-white">{item.number}</span>
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          
          <ScaleIn className="text-center">
            <MagneticButton>
              <Button size="lg" className="px-10 shadow-xl" asChild>
                <Link to="/cotacaopreview">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  COTAR FRETE
                </Link>
              </Button>
            </MagneticButton>
          </ScaleIn>
        </div>
      </section>

      {/* Nossos Serviços */}
      <section id="servicos" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-red-50/50 to-rose-50/50" />
        
        <div className="container mx-auto relative z-10">
          <FadeInUp className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2">Soluções Completas</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Nossos Serviços</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Oferecemos soluções logísticas completas para atender todas as necessidades do seu negócio
            </p>
          </FadeInUp>
          
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
            {services.map((service, index) => (
              <StaggerItem key={index}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="h-full bg-white/80 backdrop-blur-sm border-red-100/50 shadow-lg hover:shadow-2xl transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl">
                          <service.icon className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="text-lg">{service.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      <section id="quemsomos" className="py-24 px-4 bg-white/70 backdrop-blur-sm relative overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-red-200/40 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeInLeft>
              <Badge variant="secondary" className="mb-4">Sobre Nós</Badge>
              <RevealText>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">CONFIX ENVIOS</h2>
              </RevealText>
              
              <div className="flex flex-wrap gap-3 mb-8">
                {["Agilidade", "Confiança", "Eficiência operacional"].map((tag, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Badge variant="outline" className="px-4 py-2">{tag}</Badge>
                  </motion.div>
                ))}
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                Com sede em Goiás, nascemos para atender o last mile ecommerce de grandes varejistas e evoluímos 
                também atuando em transferências, first mile, e mais recentemente o fracionado focado no B2B. 
              </p>
              
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Com atuação em todo o Brasil, temos o propósito de estruturar uma malha logística inteligente e 
                eficiente, garantindo agilidade e alto desempenho operacional. Mais de 10 anos de experiência em 
                Transferência Line Haul, Abastecimento de Lojas, Last Mile, First Mile Ecommerce.
              </p>
              
              <MagneticButton>
                <Button size="lg" className="shadow-lg" asChild>
                  <Link to="/cotacaopreview">COTAR FRETE</Link>
                </Button>
              </MagneticButton>
            </FadeInLeft>
            
            <FadeInRight>
              <ParallaxSection offset={30}>
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-400 rounded-3xl transform rotate-3 scale-105 opacity-20" />
                  <img 
                    src={deliveryProfessional} 
                    alt="Profissional de entrega da Confix Envios" 
                    className="rounded-3xl shadow-2xl relative z-10 w-full"
                  />
                </motion.div>
              </ParallaxSection>
            </FadeInRight>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gradient-to-br from-red-700 to-red-600 text-white py-16 relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <FadeInUp>
            <div className="flex flex-col items-center gap-8 md:grid md:grid-cols-3 md:items-start">
              {/* Logo e descrição */}
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <h3 className="text-3xl font-bold mb-4">Confix Envios</h3>
                <p className="text-white/80 mb-6 text-lg">
                  Coletamos e enviamos para todo o Brasil
                </p>
                <div className="flex gap-3">
                  <motion.a 
                    href="https://www.facebook.com/confixenvios/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Facebook className="h-5 w-5" />
                  </motion.a>
                  <motion.a 
                    href="https://www.instagram.com/confixenvios/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Instagram className="h-5 w-5" />
                  </motion.a>
                </div>
              </div>

              {/* Endereço */}
              <div className="flex flex-col items-center text-center">
                <h4 className="font-semibold mb-4 text-lg">Endereço</h4>
                <p className="text-white/80">
                  Av. primeira avenida s/n Qd. 5 B Lt.1 e 3<br />
                  Cidade vera cruz Condomínio Empresarial Village<br />
                  Cep: 74934-600<br />
                  Aparecida de Goiânia - Goiás
                </p>
              </div>

              {/* Contato */}
              <div className="flex flex-col items-center text-center md:items-start md:text-left md:ml-auto">
                <h4 className="font-semibold mb-4 text-lg">Contato</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5" />
                    <span>+55 62 9873-3276</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5" />
                    <span>confix@grupoconfix.com</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h5 className="font-medium mb-3">Links Úteis</h5>
                  <nav className="space-y-2">
                    {[
                      { href: "#quemsomos", label: "Quem somos" },
                      { href: "#servicos", label: "Nossos Serviços" },
                      { href: "#diferencial", label: "Nosso Diferencial" },
                    ].map((link) => (
                      <a 
                        key={link.href}
                        href={link.href} 
                        className="block hover:underline transition-colors text-white/80 hover:text-white"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {link.label}
                      </a>
                    ))}
                    <Link to="/motorista/registro" className="block hover:underline transition-colors text-white/80 hover:text-white">
                      Seja um Motorista
                    </Link>
                  </nav>
                </div>
              </div>
            </div>
          </FadeInUp>
          
          <motion.div 
            className="border-t border-white/20 mt-12 pt-8 text-center text-white/60"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p>© 2025 – Confix Envios | Todos os Direitos Reservados</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
