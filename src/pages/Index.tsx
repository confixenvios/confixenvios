import Header from "@/components/Header";
import { Truck, Zap, Package, Building, Globe, Shield, Users, CheckCircle, MapPin, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
        
        <div className="container mx-auto text-center relative">
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            CONFIX ENVIOS
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Soluções logísticas para operações de
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              e-commerce
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto">
            Atendemos com agilidade e eficiência operacional em todo Brasil
          </p>
          
          {/* Benefícios principais */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Agilidade</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Confiança</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-lg font-medium">Eficiência operacional</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-4">
              <Link to="/cotacao">
                <Package className="mr-2 h-5 w-5" />
                Faça sua cotação online!
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="text-lg px-8 py-4">
              <Link to="/rastreio">
                <Truck className="mr-2 h-5 w-5" />
                Rastreie sua mercadoria
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Clientes Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Conheça alguns dos nossos clientes
          </h2>
          <p className="text-muted-foreground mb-12 max-w-3xl mx-auto">
            Atendemos empresas de renome nacional como Magazine Luiza, Hanker, Cabana Magazine e Havodah. 
            Prova da nossa capacidade em operações logísticas exigentes e de alto padrão.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Magazine Luiza</span>
            </div>
            <div className="h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Hanker</span>
            </div>
            <div className="h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Cabana Magazine</span>
            </div>
            <div className="h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground font-medium">Havodah</span>
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
              <h2 className="text-3xl font-bold mb-6">GRUPO LOGÍSTICO</h2>
              
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
            
            <div className="bg-muted/50 rounded-2xl p-8 text-center">
              <Users className="h-24 w-24 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">Empresas do grupo e parceiros</h3>
              <p className="text-muted-foreground">
                Uma rede robusta de parceiros estratégicos para garantir a melhor cobertura logística do país.
              </p>
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

      {/* Regiões Atendidas */}
      <section id="atendidas" className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Regiões Atendidas</h2>
          <p className="text-center text-muted-foreground mb-12">
            Veja todas as cidades que temos rotas em cada estado
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Goiás - Polo ANP
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Nerópolis</li>
                  <li>• Terezópolis</li>
                  <li>• Goianápolis</li>
                  <li>• Petrolina de Goiás</li>
                  <li>• São Francisco de Goiás</li>
                  <li>• Jardim Paulista</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Goiás - Polo GYN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Goiânia</li>
                  <li>• Aparecida de Goiânia</li>
                  <li>• Anápolis</li>
                  <li>• Bela Vista de Goiás</li>
                  <li>• Hidrolândia</li>
                  <li>• Abadia de Goiás</li>
                  <li>• Senador Canedo</li>
                  <li>• Santo Antônio de Goiás</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Outras Regiões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Atendemos todo o Brasil com nossa rede de parceiros e frota própria. 
                  Entre em contato para verificar disponibilidade na sua região.
                </p>
              </CardContent>
            </Card>
          </div>
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
                Soluções logísticas para operações B2B e B2C: transporte fracionado e dedicado.
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="sm">Facebook</Button>
                <Button variant="ghost" size="sm">Instagram</Button>
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
                  <span>grupoconfix@gmail.com</span>
                </div>
              </div>
              
              <div className="mt-6">
                <h5 className="font-medium mb-2">Links Úteis</h5>
                <nav className="space-y-1 text-sm">
                  <Link to="#quemsomos" className="block hover:underline">Quem somos</Link>
                  <Link to="#servicos" className="block hover:underline">Nossos Serviços</Link>
                  <Link to="#atendidas" className="block hover:underline">Regiões Atendidas</Link>
                  <Link to="#diferencial" className="block hover:underline">Nosso Diferencial</Link>
                  <Link to="/motorista/registro" className="block hover:underline">Seja um Motorista</Link>
                </nav>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm text-primary-foreground/60">
            <p>© 2025 – Confix Grupo Logístico | Todos os Direitos Reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;