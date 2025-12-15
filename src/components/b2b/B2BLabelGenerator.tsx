// Placeholder component - will be rebuilt for new B2B system
interface B2BLabelGeneratorProps {
  shipmentId?: string;
  trackingCode?: string;
  volumeCount?: number;
  volumeWeights?: number[];
  volumeAddresses?: any[];
  pickupAddress?: any;
  companyName?: string;
  deliveryDate?: string;
}

const B2BLabelGenerator = (_props: B2BLabelGeneratorProps) => {
  return (
    <div className="p-4 text-center text-muted-foreground">
      Gerador de etiquetas em desenvolvimento
    </div>
  );
};

export default B2BLabelGenerator;
