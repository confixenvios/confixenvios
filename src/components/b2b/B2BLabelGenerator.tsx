import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface VolumeAddress {
  id?: string;
  name?: string;
  recipient_name?: string;
  recipient_phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface PickupAddress {
  name?: string;
  contact_name?: string;
  contact_phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface B2BLabelGeneratorProps {
  trackingCode: string;
  volumeCount: number;
  volumeWeights: number[];
  volumeAddresses: VolumeAddress[];
  pickupAddress: PickupAddress;
  companyName: string;
  deliveryDate?: string;
}

const B2BLabelGenerator: React.FC<B2BLabelGeneratorProps> = ({
  trackingCode,
  volumeCount,
  volumeWeights,
  volumeAddresses,
  pickupAddress,
  companyName,
  deliveryDate
}) => {
  const [generating, setGenerating] = useState(false);

  const formatAddress = (addr: VolumeAddress | PickupAddress): string => {
    const parts = [
      addr.street,
      addr.number,
      addr.complement,
      addr.neighborhood,
      `${addr.city || ''}/${addr.state || ''}`,
      addr.cep
    ].filter(Boolean);
    return parts.join(', ');
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < volumeCount; i++) {
        const volumeAddress = volumeAddresses[i] || volumeAddresses[0] || {};
        const volumeWeight = volumeWeights[i] || volumeWeights[0] || 0;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Label dimensions and position
        const labelWidth = 100;
        const labelHeight = 140;
        const x = (210 - labelWidth) / 2;
        const y = 20;
        
        // Draw border
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.rect(x, y, labelWidth, labelHeight);
        
        // Header
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CONFIX ENVIOS', x + labelWidth / 2, y + 10, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('B2B Express', x + labelWidth / 2, y + 16, { align: 'center' });
        
        // Line separator
        pdf.line(x, y + 20, x + labelWidth, y + 20);
        
        // Tracking code
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(trackingCode, x + labelWidth / 2, y + 30, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`Volume ${i + 1} de ${volumeCount}`, x + labelWidth / 2, y + 38, { align: 'center' });
        
        // Sender section
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REMETENTE:', x + 3, y + 50);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(companyName, x + 3, y + 55);
        if (pickupAddress.contact_name) {
          pdf.text(`Contato: ${pickupAddress.contact_name}`, x + 3, y + 60);
        }
        const senderAddr = formatAddress(pickupAddress);
        const senderLines = pdf.splitTextToSize(senderAddr, labelWidth - 6);
        pdf.text(senderLines, x + 3, y + 65);
        
        // Recipient section
        pdf.setDrawColor(0);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(x + 2, y + 78, labelWidth - 4, 35, 'FD');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DESTINATÁRIO:', x + 4, y + 85);
        pdf.setFontSize(10);
        const recipientName = volumeAddress.recipient_name || volumeAddress.name || 'N/A';
        pdf.text(recipientName, x + 4, y + 92);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const recipientAddr = formatAddress(volumeAddress);
        const recipientLines = pdf.splitTextToSize(recipientAddr, labelWidth - 8);
        pdf.text(recipientLines, x + 4, y + 98);
        if (volumeAddress.recipient_phone) {
          pdf.text(`Tel: ${volumeAddress.recipient_phone}`, x + 4, y + 108);
        }
        
        // Weight and date
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`PESO: ${volumeWeight} kg`, x + 4, y + 120);
        
        if (deliveryDate) {
          const formattedDate = new Date(deliveryDate).toLocaleDateString('pt-BR');
          pdf.text(`Previsão: ${formattedDate}`, x + labelWidth - 4, y + 120, { align: 'right' });
        }
        
        // Note about barcode
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Código: ${trackingCode}`, x + labelWidth / 2, y + 135, { align: 'center' });
      }
      
      pdf.save(`etiquetas_${trackingCode}.pdf`);
      toast.success(`PDF com ${volumeCount} etiqueta(s) gerado com sucesso!`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF das etiquetas');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={generatePDF} 
        disabled={generating}
        className="flex items-center gap-2"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {generating ? 'Gerando...' : `Baixar Etiquetas PDF (${volumeCount})`}
      </Button>

      {/* Preview */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
        <div className="bg-white p-4 mx-auto border-2 border-black max-w-[280px]">
          <div className="text-center border-b border-black pb-2 mb-2">
            <h1 className="text-sm font-bold">CONFIX ENVIOS</h1>
            <p className="text-xs">B2B Express</p>
          </div>
          
          <div className="text-center mb-3">
            <p className="text-lg font-bold">{trackingCode}</p>
            <p className="text-xs">Volume 1 de {volumeCount}</p>
          </div>
          
          <div className="flex justify-center gap-3 mb-3">
            <Barcode
              value={trackingCode}
              width={1}
              height={30}
              fontSize={8}
              displayValue={false}
            />
            <QRCodeSVG value={trackingCode} size={40} level="M" />
          </div>
          
          <div className="text-xs border-t pt-2 space-y-1">
            <p><span className="font-bold">Rem:</span> {companyName}</p>
            <p className="bg-gray-100 p-1 rounded">
              <span className="font-bold">Dest:</span> {volumeAddresses[0]?.recipient_name || volumeAddresses[0]?.name || 'N/A'}
            </p>
            <p><span className="font-bold">Peso:</span> {volumeWeights[0] || 0} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default B2BLabelGenerator;
