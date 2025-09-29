import Header from "@/components/Header";
import { Truck, Zap, Package, Building, Globe, Shield, Users, CheckCircle, MapPin, Phone, Mail, DollarSign, Clock, TrendingUp, Instagram, Facebook } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Client logos
import centauroLogo from "@/assets/clients/centauro-logo.png";
import hankerLogo from "@/assets/clients/hanker-logo.webp";
import cabanaLogo from "@/assets/clients/cabana-logo.webp";
import netshoesLogo from "@/assets/clients/netshoes-logo.png";
import avodahLogo from "@/assets/clients/avodah-logo.png";
import magaluLogo from "@/assets/clients/magalu-logo.png";
import deliveryProfessional from "@/assets/delivery-professional.webp";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  const { user, loading } = useAuth();

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
      <section className="relative py-12 sm:py-16 md:py-20 px-2 sm:px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50" style={{ backgroundImage: `url(${heroBackground})` }}></div>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
        
        <div className="container mx-auto text-center relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-12 leading-tight text-foreground">
            Coletamos e entregamos em todo <span className="bg-gradient-primary bg-clip-text text-transparent">Brasil</span>
          </h1>
          
          {/* Benefícios principais */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Menor preço</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Menor prazo</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Maior Agilidade</span>
            </div>
          </div>

          {/* Blocos de Serviços */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Expresso GYN */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl mb-3">Expresso</CardTitle>
                <p className="text-muted-foreground mb-4">Coleta e entrega no mesmo dia em Goiânia e Região</p>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full" asChild>
                  <Link to="/cotacao-expresso">
                    <Zap className="mr-2 h-4 w-4" />
                    Cotação Expresso
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Envio Nacional */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-primary/20 flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl mb-3 text-primary">Envio Nacional</CardTitle>
                <p className="text-muted-foreground mb-4">Perfil de mercadorias de e-commerce, coletamos e enviamos</p>
              </CardHeader>
              <CardContent>
                <Button size="lg" className="w-full" asChild>
                  <Link to="/cotacao">
                    <Package className="mr-2 h-4 w-4" />
                    Fazer Cotação
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Fracionado */}
            <Card className="text-center p-6 hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl mb-3">Fracionado</CardTitle>
                <p className="text-muted-foreground mb-4">GO / BA / SP / MT</p>
              </CardHeader>
              <CardContent>
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => window.open('https://wa.me/5562999999999?text=Olá! Gostaria de saber mais sobre o serviço Fracionado.', '_blank')}
                >
                  Falar no WhatsApp
                </Button>
              </CardContent>
            </Card>
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
            <div className="flex animate-marquee hover:pause-marquee">
              {/* First set of logos */}
              <div className="flex shrink-0 gap-16 items-center pr-16">
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={magaluLogo} alt="Magazine Luiza" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={hankerLogo} alt="Hanker" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={cabanaLogo} alt="Cabana Magazine" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={avodahLogo} alt="Avodah" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={centauroLogo} alt="Centauro" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={netshoesLogo} alt="Netshoes" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
              </div>
              
              {/* Duplicate set for seamless loop */}
              <div className="flex shrink-0 gap-16 items-center pr-16">
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={magaluLogo} alt="Magazine Luiza" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={hankerLogo} alt="Hanker" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={cabanaLogo} alt="Cabana Magazine" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={avodahLogo} alt="Avodah" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={centauroLogo} alt="Centauro" className="max-h-12 max-w-32 object-contain opacity-70" />
                </div>
                <div className="h-16 flex items-center justify-center px-4">
                  <img src={netshoesLogo} alt="Netshoes" className="max-h-12 max-w-32 object-contain opacity-70" />
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
                  <Zap className="h-6 w-6 text-primary" />
                  FIRST E LAST MILE E-COMMERCE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Processamos mais de 5 mil pacotes e realizamos em média 3 mil entregas diariamente, com performance de 98,4%.
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
              
              <Button asChild>
                <Link to="/cotacao">
                  <Package className="mr-2 h-4 w-4" />
                  COTAR FRETE
                </Link>
              </Button>
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
          
          <Button size="lg" asChild>
            <Link to="/cotacao">
              <Package className="mr-2 h-4 w-4" />
              COTAR FRETE
            </Link>
          </Button>
        </div>
      </section>


      {/* Footer */}
      <footer id="contato" className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo e descrição */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Confix Envios</h3>
              <p className="text-primary-foreground/80 mb-6">
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

            {/* Sede */}
            <div>
              <h4 className="font-semibold mb-4">Sede</h4>
              <p className="text-sm text-primary-foreground/80">
                Av. primeira avenida s/n Qd. 5 B Lt.1 e 3<br />
                Cidade vera cruz Condomínio Empresarial Village<br />
                Cep: 74934-600<br />
                Aparecida de Goiânia - Goiás
              </p>
            </div>

            {/* Contato */}
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <div className="space-y-2 text-sm">
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
                <nav className="space-y-1 text-sm">
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
          
          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm text-primary-foreground/60">
            <p>© 2025 – Confix Envios | Todos os Direitos Reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;