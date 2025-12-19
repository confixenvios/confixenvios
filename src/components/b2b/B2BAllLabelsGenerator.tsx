import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
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

interface B2BAllLabelsGeneratorProps {
  volumes: B2BVolume[];
  shipment: B2BShipment;
  companyName?: string;
  companyDocument?: string | null;
  companyPhone?: string | null;
  buttonVariant?: 'default' | 'outline';
  buttonSize?: 'default' | 'sm';
  buttonClassName?: string;
}

const B2BAllLabelsGenerator = ({ 
  volumes,
  shipment,
  companyName,
  companyDocument,
  companyPhone,
  buttonVariant = 'default',
  buttonSize = 'sm',
  buttonClassName = ''
}: B2BAllLabelsGeneratorProps) => {
  const labelsRef = useRef<HTMLDivElement>(null);

  const handleDownloadAllPDF = async () => {
    if (!labelsRef.current || volumes.length === 0) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 110],
      });

      const labelElements = labelsRef.current.querySelectorAll('.label-item');
      
      for (let i = 0; i < labelElements.length; i++) {
        const element = labelElements[i] as HTMLElement;
        
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) {
          pdf.addPage([80, 110]);
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, 80, 110);
      }

      pdf.save(`etiquetas-${shipment.tracking_code}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <>
      <Button 
        onClick={handleDownloadAllPDF} 
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClassName}
      >
        <Download className="h-3 w-3 mr-1" />
        Baixar Etiquetas
      </Button>

      {/* Hidden labels for PDF generation - Compactas */}
      <div 
        ref={labelsRef}
        style={{ position: 'absolute', left: '-9999px', top: 0 }}
      >
        {volumes.map((volume) => (
          <div 
            key={volume.id}
            className="label-item border-2 border-foreground p-2 bg-white text-black"
            style={{ width: '280px', marginBottom: '10px' }}
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
                  {shipment.delivery_date 
                    ? new Date(shipment.delivery_date).toLocaleDateString('pt-BR')
                    : '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-gray-600">Peso</p>
                <p className="text-sm font-bold">{volume.weight} kg</p>
              </div>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-400 text-center">
              <p className="text-[8px] text-gray-600">Rastreio: <span className="font-mono font-medium">{shipment.tracking_code}</span></p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default B2BAllLabelsGenerator;
