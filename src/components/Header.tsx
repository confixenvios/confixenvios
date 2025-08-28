import { Package } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Package className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Confix Envios
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Cotação
            </Link>
            <Link 
              to="/rastreio" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Rastreio
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;