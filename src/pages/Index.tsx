import Header from "@/components/Header";
import { Truck, Zap, Package, Building, Globe, Shield, Users, CheckCircle, MapPin, Phone, Mail, DollarSign, Clock, TrendingUp, Instagram, Facebook, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
// Client logos
import centauroLogo from "@/assets/clients/centauro-logo.png";
import hankerLogo from "@/assets/clients/hanker-logo.webp";
import cabanaLogo from "@/assets/clients/cabana-logo.webp";
import netshoesLogo from "@/assets/clients/netshoes-logo.png";
import avodahLogo from "@/assets/clients/avodah-logo.png";
import magaluLogo from "@/assets/clients/magalu-logo.png";
import deliveryProfessional from "@/assets/delivery-professional.webp";
import heroTruckConfix from "@/assets/hero-truck-confix.jpg";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cotarMenuOpen, setCotarMenuOpen] = useState(false);
  const [cotarMenuOpen2, setCotarMenuOpen2] = useState(false);
  const cotarMenuRef = useRef<HTMLDivElement>(null);
  const cotarMenuRef2 = useRef<HTMLDivElement>(null);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cotarMenuRef.current && !cotarMenuRef.current.contains(event.target as Node)) {
        setCotarMenuOpen(false);
      }
      if (cotarMenuRef2.current && !cotarMenuRef2.current.contains(event.target as Node)) {
        setCotarMenuOpen2(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-light">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-200">
          <img 
            src={heroTruckConfix} 
            alt="Caminhão Confix Envios" 
            className="w-full h-full object-cover object-center md:object-right"
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div className="relative flex flex-col items-center justify-start md:justify-between pt-6 sm:pt-8 md:pt-12 px-4 pb-6 min-h-[50vh] md:min-h-[75vh]">
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl mb-4 sm:mb-6 md:mb-12 leading-tight font-normal text-center">
            <span style={{ color: '#000000', textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8), 0 0 30px rgba(255,255,255,0.7)' }}>Coletamos e Entregamos em todo o </span>
            <span className="text-primary" style={{ textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8)' }}>Brasil</span>
          </h1>
          
        {/* Benefícios principais em mini badges */}
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-full px-2 sm:px-3 md:px-5 py-1 md:py-2 text-[10px] sm:text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <DollarSign className="w-3 h-3 md:w-5 md:h-5 text-primary" />
              <span style={{ color: '#333' }}>Menor preço</span>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-full px-2 sm:px-3 md:px-5 py-1 md:py-2 text-[10px] sm:text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Clock className="w-3 h-3 md:w-5 md:h-5 text-primary" />
              <span style={{ color: '#333' }}>Menor prazo</span>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-full px-2 sm:px-3 md:px-5 py-1 md:py-2 text-[10px] sm:text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <TrendingUp className="w-3 h-3 md:w-5 md:h-5 text-primary" />
              <span style={{ color: '#333' }}>Maior Agilidade</span>
            </div>
          </div>

          {/* Botão Cotar Frete */}
          <div className="flex justify-center mt-24 sm:mt-6 md:mt-auto md:mb-8">
            <Button className="px-6" asChild>
              <Link to="/cotacaopreview">
                COTAR FRETE
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Clientes Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Empresas que confiam em nosso trabalho
          </h2>
          <p className="text-muted-foreground mb-12 max-w-3xl mx-auto">
            Grandes marcas como Magalu, Petlove, Privalia, Avodah, Centauro e Netshoes já confiam em nossas soluções, comprovando nossa capacidade em operações logísticas exigentes e de alto padrão.
          </p>
          
          <div className="overflow-hidden">
            <div className="flex animate-marquee-fast md:animate-marquee hover:pause-marquee">
              {/* First set of logos */}
              <div className="flex shrink-0 gap-8 md:gap-16 items-center pr-8 md:pr-16">
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={magaluLogo} alt="Magazine Luiza" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={hankerLogo} alt="Hanker" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={cabanaLogo} alt="Cabana Magazine" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={avodahLogo} alt="Avodah" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={centauroLogo} alt="Centauro" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={netshoesLogo} alt="Netshoes" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
              </div>
              
              {/* Duplicate set for seamless loop */}
              <div className="flex shrink-0 gap-8 md:gap-16 items-center pr-8 md:pr-16">
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={magaluLogo} alt="Magazine Luiza" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={hankerLogo} alt="Hanker" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={cabanaLogo} alt="Cabana Magazine" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={avodahLogo} alt="Avodah" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={centauroLogo} alt="Centauro" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-12 md:h-16 flex items-center justify-center px-2 md:px-4">
                  <img src={netshoesLogo} alt="Netshoes" className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain opacity-70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nossos Serviços */}
      <section id="servicos" className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-primary" />
                  FRACIONADOS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Rede de transporte estruturada que garante a entrega e coletas nos estados onde atua.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  CARGA DEDICADA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Soluções em cargas dedicadas para todo Brasil, utilizando uma rede de veículos cadastrados e próprios.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-6 w-6 text-primary" />
                  TRANSFERÊNCIAS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trabalhamos há mais de 6 anos com transferência entre Centros de Distribuição e Abastecimento de Lojas.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  FIRST E LAST MILE E-COMMERCE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Processamos mais de 5 mil pacotes e realizamos em média 3 mil entregas diariamente, com performance de 99,5%.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-6 w-6 text-primary" />
                  CROSS DOCKING
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dispomos de estrutura e equipe especializada em armazenamento, processamento e redespacho de mercadorias de parceiros.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-primary" />
                  TRANSIT POINT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Locamos posições de Palet, com ou sem processamento interno. Uma solução cada vez mais utilizada por empresas parceiras para otimizar custos.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section id="quemsomos" className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Sobre Nós</Badge>
              <h2 className="text-3xl font-bold mb-6">CONFIX ENVIOS</h2>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <Badge variant="outline">Agilidade</Badge>
                <Badge variant="outline">Confiança</Badge>
                <Badge variant="outline">Eficiência operacional</Badge>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Com sede em Goiás, nascemos para atender o last mile ecommerce de grandes varejistas e evoluímos 
                também atuando em transferências, first mile, e mais recentemente o fracionado focado no B2B. 
                Com atuação em todo o Brasil, temos o propósito de estruturar uma malha logística inteligente e 
                eficiente, garantindo agilidade e alto desempenho operacional.
              </p>
              
              <p className="text-muted-foreground mb-8">
                Mais de 10 anos de experiência em Transferência Line Haul, Abastecimento de Lojas, 
                Last Mile, First Mile Ecommerce.
              </p>
              
              <div className="flex justify-center md:justify-start">
                <Button className="px-6" asChild>
                  <Link to="/cotacaopreview">
                    COTAR FRETE
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <img 
                src={deliveryProfessional} 
                alt="Profissional de entrega da Confix Envios" 
                className="rounded-2xl shadow-lg max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Nosso Diferencial */}
      <section id="diferencial" className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Excelência logística para operações que exigem agilidade, controle e confiança.
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-4xl mx-auto">
            Combinamos estrutura própria, tecnologia e atendimento consultivo para oferecer entregas sob medida para sua empresa.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">01</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Experiência</h3>
              <p className="text-muted-foreground">
                Mais de 10 anos de experiência em Transferência Line Haul e Abastecimento de Lojas
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">02</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Frota Própria Com Carro Reserva</h3>
              <p className="text-muted-foreground">
                Garantimos a qualidade e segurança do transporte com nossa frota, veículos reservas e seleção minuciosa de agregados.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">03</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Tecnologia</h3>
              <p className="text-muted-foreground">
                TMS da Brudam para gerenciar a frota e rastrear as cargas, proporcionando total controle e transparência.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">04</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Atendimento Personalizado</h3>
              <p className="text-muted-foreground">
                Adaptamos nossas soluções às necessidades específicas de cada cliente, buscando o melhor resultado.
              </p>
            </div>
          </div>
          
          <Button className="px-6" asChild>
            <Link to="/cotacaopreview">
              COTAR FRETE
            </Link>
          </Button>
        </div>
      </section>


      {/* Footer */}
      <footer id="contato" className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-8 md:grid md:grid-cols-3 md:items-start">
            {/* Logo e descrição */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <h3 className="text-2xl font-bold mb-4">Confix Envios</h3>
              <p className="text-primary-foreground/80 mb-6 text-base">
                Coletamos e enviamos para todo o Brasil
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <a href="https://www.facebook.com/confixenvios/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="https://www.instagram.com/confixenvios/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Endereço */}
            <div className="flex flex-col items-center text-center">
              <h4 className="font-semibold mb-4">Endereço</h4>
              <p className="text-base text-primary-foreground/80">
                Av. primeira avenida s/n Qd. 5 B Lt.1 e 3<br />
                Cidade vera cruz Condomínio Empresarial Village<br />
                Cep: 74934-600<br />
                Aparecida de Goiânia - Goiás
              </p>
            </div>

            {/* Contato */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left md:ml-auto">
              <h4 className="font-semibold mb-4">Contato</h4>
              <div className="space-y-2 text-base">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+55 62 9873-3276</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>confix@grupoconfix.com</span>
                </div>
              </div>
              
              <div className="mt-6">
                <h5 className="font-medium mb-2">Links Úteis</h5>
                <nav className="space-y-1 text-base">
                  <a 
                    href="#quemsomos" 
                    className="block hover:underline transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('quemsomos')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Quem somos
                  </a>
                  <a 
                    href="#servicos" 
                    className="block hover:underline transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Nossos Serviços
                  </a>
                  <a 
                    href="#diferencial" 
                    className="block hover:underline transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('diferencial')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Nosso Diferencial
                  </a>
                  <Link to="/motorista/registro" className="block hover:underline transition-colors">Seja um Motorista</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-base text-primary-foreground/60">
            <p>© 2025 – Confix Envios | Todos os Direitos Reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;