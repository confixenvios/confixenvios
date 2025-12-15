import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confixLogo from '@/assets/confix-logo-label.ico';

interface B2BVolume {
  id: string;
  eti_code: string;
  volume_number: number;
  weight: number;
  recipient_name: string;
  recipient_phone: string;
  recipient_document: string | null;
  recipient_cep: string;
  recipient_street: string;
  recipient_number: string;
  recipient_complement: string | null;
  recipient_neighborhood: string;
  recipient_city: string;
  recipient_state: string;
}

interface B2BShipment {
  id: string;
  tracking_code: string;
  delivery_date: string | null;
  pickup_address?: {
    name: string;
    contact_name: string;
    contact_phone: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
}

interface B2BLabelGeneratorProps {
  volume: B2BVolume;
  shipment?: B2BShipment;
  companyName?: string;
  companyDocument?: string | null;
  companyPhone?: string | null;
}

const B2BLabelGenerator = ({ 
  volume, 
  shipment,
  companyName,
  companyDocument,
  companyPhone
}: B2BLabelGeneratorProps) => {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!labelRef.current) return;
    
    const printContent = labelRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta ${volume.eti_code}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .label { border: 2px solid #000; padding: 16px; width: 400px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
            .section { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #ccc; }
            .section-title { font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; color: #666; }
            .info-row { font-size: 12px; margin: 2px 0; }
            .info-row strong { font-weight: 600; }
            .eti-code { font-size: 32px; font-weight: bold; text-align: center; margin: 16px 0; }
            .barcode { text-align: center; margin: 16px 0; }
            .weight { text-align: center; font-size: 18px; font-weight: bold; margin-top: 12px; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
      pdf.save(`etiqueta-${volume.eti_code}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview da Etiqueta */}
      <div 
        ref={labelRef}
        className="border-2 border-foreground p-4 bg-white text-black rounded"
        style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2 border-b-2 border-black pb-3 mb-3">
          <img src={confixLogo} alt="Confix Logo" className="w-8 h-8" />
          <div className="text-center">
            <h2 className="font-bold text-lg">CONFIX ENVIOS</h2>
            <p className="text-xs">B2B Express</p>
          </div>
        </div>

        {/* Remetente */}
        <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
          <p className="text-[10px] uppercase font-bold text-gray-600 mb-1">Remetente</p>
          <p className="text-sm font-semibold">{companyName || 'Empresa'}</p>
          {companyDocument && <p className="text-xs">{companyDocument}</p>}
          {companyPhone && <p className="text-xs">{companyPhone}</p>}
          {shipment?.pickup_address && (
            <p className="text-xs">
              {shipment.pickup_address.street}, {shipment.pickup_address.number} - {shipment.pickup_address.city}/{shipment.pickup_address.state}
            </p>
          )}
        </div>

        {/* Destinatário */}
        <div className="mb-3 pb-3 border-b border-dashed border-gray-400">
          <p className="text-[10px] uppercase font-bold text-gray-600 mb-1">Destinatário</p>
          <p className="text-sm font-semibold">{volume.recipient_name}</p>
          <p className="text-xs">{volume.recipient_phone}</p>
          {volume.recipient_document && <p className="text-xs">{volume.recipient_document}</p>}
          <p className="text-xs">
            {volume.recipient_street}, {volume.recipient_number}
            {volume.recipient_complement && `, ${volume.recipient_complement}`}
          </p>
          <p className="text-xs">{volume.recipient_neighborhood}</p>
          <p className="text-xs font-medium">
            {volume.recipient_city}/{volume.recipient_state} - CEP: {volume.recipient_cep}
          </p>
        </div>

        {/* Código ETI Grande */}
        <div className="text-center my-4">
          <p className="text-4xl font-bold tracking-wider">{volume.eti_code}</p>
        </div>

        {/* Barcode */}
        <div className="flex justify-center my-4">
          <Barcode 
            value={volume.eti_code.replace('ETI-', '')} 
            width={2}
            height={50}
            fontSize={12}
            displayValue={false}
          />
        </div>

        {/* Info adicional */}
        <div className="flex justify-between items-center pt-3 border-t border-black">
          <div>
            <p className="text-[10px] text-gray-600">Volume</p>
            <p className="text-sm font-bold">{volume.volume_number}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-600">Previsão de Entrega</p>
            <p className="text-sm font-bold">
              {shipment?.delivery_date 
                ? new Date(shipment.delivery_date).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600">Peso</p>
            <p className="text-lg font-bold">{volume.weight} kg</p>
          </div>
        </div>

        {shipment && (
          <div className="mt-3 pt-3 border-t border-dashed border-gray-400 text-center">
            <p className="text-xs text-gray-600">Rastreio: <span className="font-mono font-medium">{shipment.tracking_code}</span></p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
};

export default B2BLabelGenerator;
