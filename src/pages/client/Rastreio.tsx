import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const Rastreio = () => {
  const [trackingCode, setTrackingCode] = useState("");

  const handleTrack = () => {
    if (trackingCode.trim()) {
      // Navigate to tracking page with code
      window.open(`/rastreio/${trackingCode}`, '_blank');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Rastreamento</h1>
        <p className="text-muted-foreground">
          Acompanhe suas encomendas em tempo real
        </p>
      </div>

      <Card className="border-border/50 shadow-card max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Rastrear Encomenda</span>
          </CardTitle>
          <CardDescription>
            Digite o código de rastreamento para acompanhar sua encomenda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking-code">Código de Rastreamento</Label>
            <Input
              id="tracking-code"
              placeholder="Ex: TRK-20241234ABCD"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
            />
          </div>
          
          <Button 
            onClick={handleTrack} 
            className="w-full"
            disabled={!trackingCode.trim()}
          >
            <Search className="w-4 h-4 mr-2" />
            Rastrear
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Minhas Encomendas</span>
          </CardTitle>
          <CardDescription>
            Suas encomendas recentes com códigos de rastreamento
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma encomenda encontrada</h3>
          <p className="text-muted-foreground">
            Suas encomendas com códigos de rastreamento aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Rastreio;