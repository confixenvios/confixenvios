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
            body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
            .label { border: 2px solid #000; padding: 8px; width: 280px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
            .section { margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #ccc; }
            .section-title { font-weight: bold; font-size: 8px; text-transform: uppercase; margin-bottom: 2px; color: #666; }
            .info-row { font-size: 9px; margin: 1px 0; }
            .info-row strong { font-weight: 600; }
            .eti-code { font-size: 22px; font-weight: bold; text-align: center; margin: 8px 0; }
            .barcode { text-align: center; margin: 8px 0; }
            .weight { text-align: center; font-size: 14px; font-weight: bold; margin-top: 6px; }
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
        format: [80, 110],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 80, 110);
      pdf.save(`etiqueta-${volume.eti_code}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview da Etiqueta - Compacta */}
      <div 
        ref={labelRef}
        className="border-2 border-foreground p-2 bg-white text-black rounded"
        style={{ width: '100%', maxWidth: '280px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-1.5 border-b-2 border-black pb-1.5 mb-1.5">
          <img src={confixLogo} alt="Confix Logo" className="w-5 h-5" />
          <div className="text-center">
            <h2 className="font-bold text-sm leading-tight">CONFIX ENVIOS</h2>
            <p className="text-[8px] leading-tight">B2B Express</p>
          </div>
        </div>

        {/* Remetente */}
        <div className="mb-1.5 pb-1.5 border-b border-dashed border-gray-400">
          <p className="text-[8px] uppercase font-bold text-gray-600 mb-0.5">Remetente</p>
          <p className="text-[10px] font-semibold leading-tight">{companyName || 'Empresa'}</p>
          {companyDocument && <p className="text-[9px] leading-tight">{companyDocument}</p>}
          {companyPhone && <p className="text-[9px] leading-tight">{companyPhone}</p>}
          {shipment?.pickup_address && (
            <p className="text-[9px] leading-tight">
              {shipment.pickup_address.street}, {shipment.pickup_address.number} - {shipment.pickup_address.city}/{shipment.pickup_address.state}
            </p>
          )}
        </div>

        {/* Destinatário */}
        <div className="mb-1.5 pb-1.5 border-b border-dashed border-gray-400">
          <p className="text-[8px] uppercase font-bold text-gray-600 mb-0.5">Destinatário</p>
          <p className="text-[10px] font-semibold leading-tight">{volume.recipient_name}</p>
          <p className="text-[9px] leading-tight">{volume.recipient_phone}</p>
          {volume.recipient_document && <p className="text-[9px] leading-tight">{volume.recipient_document}</p>}
          <p className="text-[9px] leading-tight">
            {volume.recipient_street}, {volume.recipient_number}
            {volume.recipient_complement && `, ${volume.recipient_complement}`}
          </p>
          <p className="text-[9px] leading-tight">{volume.recipient_neighborhood}</p>
          <p className="text-[9px] font-medium leading-tight">
            {volume.recipient_city}/{volume.recipient_state} - CEP: {volume.recipient_cep}
          </p>
        </div>

        {/* Código ETI Grande */}
        <div className="text-center my-2">
          <p className="text-2xl font-bold tracking-wider">{volume.eti_code}</p>
        </div>

        {/* Barcode */}
        <div className="flex justify-center my-2">
          <Barcode 
            value={volume.eti_code.replace('ETI-', '')} 
            width={1.5}
            height={35}
            fontSize={10}
            displayValue={false}
          />
        </div>

        {/* Info adicional */}
        <div className="flex justify-between items-center pt-1.5 border-t border-black">
          <div>
            <p className="text-[8px] text-gray-600">Volume</p>
            <p className="text-[10px] font-bold">{volume.volume_number}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-gray-600">Previsão</p>
            <p className="text-[10px] font-bold">
              {shipment?.delivery_date 
                ? new Date(shipment.delivery_date).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-gray-600">Peso</p>
            <p className="text-sm font-bold">{volume.weight} kg</p>
          </div>
        </div>

        {shipment && (
          <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-400 text-center">
            <p className="text-[8px] text-gray-600">Rastreio: <span className="font-mono font-medium">{shipment.tracking_code}</span></p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button onClick={handlePrint} size="sm" className="flex-1">
          <Printer className="h-3 w-3 mr-1" />
          Imprimir
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="flex-1">
          <Download className="h-3 w-3 mr-1" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
};

export default B2BLabelGenerator;
