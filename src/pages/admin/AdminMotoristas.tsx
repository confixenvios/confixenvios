// Placeholder - will be rebuilt for new system
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const AdminMotoristas = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Motoristas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Módulo de motoristas em reconstrução para o novo sistema B2B.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMotoristas;
