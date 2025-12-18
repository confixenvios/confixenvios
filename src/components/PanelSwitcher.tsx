import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Car, Truck } from "lucide-react";

const PanelSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isB2B = location.pathname.startsWith('/b2b-expresso');
  
  const handleSwitch = () => {
    if (isB2B) {
      navigate('/cliente/dashboard');
    } else {
      navigate('/b2b-expresso/dashboard');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSwitch}
      className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
    >
      {isB2B ? (
        <>
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">Convencional</span>
        </>
      ) : (
        <>
          <Car className="h-4 w-4" />
          <span className="hidden sm:inline">Expresso</span>
        </>
      )}
    </Button>
  );
};

export default PanelSwitcher;
