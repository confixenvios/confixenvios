// Placeholder - will be rebuilt for new system
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

const MotoristaDashboard = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Portal do Motorista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Portal do motorista em reconstrução para o novo sistema B2B.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MotoristaDashboard;

