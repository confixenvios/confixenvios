import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import Barcode from 'react-barcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confixLogo from '@/assets/confix-logo-label.ico';

interface ShipmentData {
  id: string;
  tracking_code: string;
  carrier_order_id?: string | null;
  carrier_barcode?: string | null;
  cte_key?: string | null; // deprecated, kept for backwards compatibility
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  pricing_table_name?: string | null;
  quote_data: any;
  sender_address?: {
    name: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null;
  recipient_address?: {
    name: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  } | null;
}

interface NationalLabelGeneratorProps {
  shipment: ShipmentData;
  senderPhone?: string;
  senderDocument?: string;
  recipientPhone?: string;
  recipientDocument?: string;
  estimatedDeliveryDays?: number;
}

const NationalLabelGenerator = ({ 
  shipment,
  senderPhone,
  senderDocument,
  recipientPhone,
  recipientDocument,
  estimatedDeliveryDays = 5
}: NationalLabelGeneratorProps) => {
  const labelRef = useRef<HTMLDivElement>(null);

  // ID do pedido na transportadora (ex: codigo Jadlog)
  const carrierOrderId = shipment.carrier_order_id || shipment.cte_key || null;
  
  // Código de barras da transportadora (extraído do PDF)
  const carrierBarcode = shipment.carrier_barcode || carrierOrderId || shipment.tracking_code;
  
  // Código de rastreio principal (Confix)
  const trackingCode = shipment.tracking_code;
  
  // Determinar transportadora
  const getCarrier = () => {
    const pricingTable = shipment.pricing_table_name?.toLowerCase() || '';
    if (pricingTable.includes('jadlog')) return 'JADLOG';
    if (pricingTable.includes('magalog')) return 'MAGALOG';
    if (pricingTable.includes('alfa')) return 'ALFA';
    return 'CONFIX';
  };

  const carrier = getCarrier();

  // Calcular data estimada de entrega
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDeliveryDays);

  const handlePrint = async () => {
    if (!labelRef.current) return;
    
    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiqueta ${trackingCode}</title>
            <style>
              @page { 
                size: A4; 
                margin: 10mm; 
              }
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
              }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: flex-start;
                padding-top: 5mm;
              }
              img { 
                width: 100mm; 
                height: auto; 
                max-height: 140mm;
              }
            </style>
          </head>
          <body>
            <img src="${imgData}" />
            <script>
              window.onload = function() { 
                setTimeout(function() { 
                  window.print(); 
                  window.close(); 
                }, 100); 
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Erro ao imprimir:', error);
    }
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
        format: [100, 140],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 100, 140);
      pdf.save(`etiqueta-${trackingCode}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview da Etiqueta */}
      <div 
        ref={labelRef}
        className="border-2 border-foreground p-3 bg-white text-black rounded"
        style={{ width: '100%', maxWidth: '350px', margin: '0 auto' }}
      >
        {/* Header com Logo e Transportadora */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
          <div className="flex items-center gap-2">
            <img src={confixLogo} alt="Confix Logo" className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-sm leading-tight">CONFIX ENVIOS</h2>
              <p className="text-[8px] leading-tight text-gray-600">Nacional Express</p>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-bold rounded">
              {carrier}
            </span>
          </div>
        </div>

        {/* Remetente */}
        <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
          <p className="text-[8px] uppercase font-bold text-gray-600 mb-0.5">Remetente</p>
          <p className="text-[10px] font-semibold leading-tight">
            {shipment.sender_address?.name || 'N/A'}
          </p>
          {senderDocument && (
            <p className="text-[9px] leading-tight text-gray-700">{senderDocument}</p>
          )}
          {senderPhone && (
            <p className="text-[9px] leading-tight text-gray-700">{senderPhone}</p>
          )}
          <p className="text-[9px] leading-tight">
            {shipment.sender_address?.street}, {shipment.sender_address?.number}
            {shipment.sender_address?.complement && `, ${shipment.sender_address.complement}`}
          </p>
          <p className="text-[9px] leading-tight">{shipment.sender_address?.neighborhood}</p>
          <p className="text-[9px] font-medium leading-tight">
            {shipment.sender_address?.city}/{shipment.sender_address?.state} - CEP: {shipment.sender_address?.cep}
          </p>
        </div>

        {/* Destinatário */}
        <div className="mb-2 pb-2 border-b border-dashed border-gray-400">
          <p className="text-[8px] uppercase font-bold text-gray-600 mb-0.5">Destinatário</p>
          <p className="text-[11px] font-bold leading-tight">
            {shipment.recipient_address?.name || 'N/A'}
          </p>
          {recipientDocument && (
            <p className="text-[9px] leading-tight text-gray-700">{recipientDocument}</p>
          )}
          {recipientPhone && (
            <p className="text-[9px] leading-tight text-gray-700">{recipientPhone}</p>
          )}
          <p className="text-[9px] leading-tight">
            {shipment.recipient_address?.street}, {shipment.recipient_address?.number}
            {shipment.recipient_address?.complement && `, ${shipment.recipient_address.complement}`}
          </p>
          <p className="text-[9px] leading-tight">{shipment.recipient_address?.neighborhood}</p>
          <p className="text-[10px] font-bold leading-tight">
            {shipment.recipient_address?.city}/{shipment.recipient_address?.state} - CEP: {shipment.recipient_address?.cep}
          </p>
        </div>

        {/* Código de Rastreio Confix */}
        <div className="text-center my-2 py-2 bg-gray-100 rounded">
          <p className="text-[8px] uppercase text-gray-600 mb-0.5">Rastreio Confix</p>
          <p className="text-lg font-bold tracking-wider font-mono">{trackingCode}</p>
        </div>

        {/* ID do Pedido Jadlog (se disponível) */}
        {carrierOrderId && carrierOrderId !== trackingCode && (
          <div className="text-center mb-2">
            <p className="text-[8px] uppercase text-gray-600">ID Jadlog: <span className="font-bold">{carrierOrderId}</span></p>
          </div>
        )}

        {/* Código de Barras Code128 (barcode da transportadora) */}
        <div className="flex flex-col items-center my-2">
          <Barcode 
            value={carrierBarcode}
            width={1.5}
            height={40}
            fontSize={8}
            displayValue={true}
            format="CODE128"
          />
        </div>

        {/* Informações da Remessa */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-black text-center">
          <div>
            <p className="text-[7px] text-gray-600">Peso</p>
            <p className="text-[10px] font-bold">{shipment.weight} kg</p>
          </div>
          <div>
            <p className="text-[7px] text-gray-600">Vol.</p>
            <p className="text-[10px] font-bold">1/1</p>
          </div>
          <div>
            <p className="text-[7px] text-gray-600">Prazo</p>
            <p className="text-[10px] font-bold">{estimatedDeliveryDays}d</p>
          </div>
          <div>
            <p className="text-[7px] text-gray-600">Prev.</p>
            <p className="text-[10px] font-bold">
              {estimatedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Dimensões */}
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400 text-center">
          <p className="text-[8px] text-gray-600">
            Dimensões: {shipment.length}x{shipment.width}x{shipment.height} cm | {shipment.format}
          </p>
        </div>
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

export default NationalLabelGenerator;
