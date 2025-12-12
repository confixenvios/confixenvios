import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

interface EtiCode {
  volume_number: number;
  eti_code: string;
  eti_sequence_number: number;
}

interface B2BLabelGeneratorProps {
  shipmentId: string;
  trackingCode: string;
  volumeCount: number;
  volumeWeights: number[];
  volumeAddresses: VolumeAddress[];
  pickupAddress: PickupAddress;
  companyName: string;
  deliveryDate?: string;
}

const B2BLabelGenerator: React.FC<B2BLabelGeneratorProps> = ({
  shipmentId,
  trackingCode,
  volumeCount,
  volumeWeights,
  volumeAddresses,
  pickupAddress,
  companyName,
  deliveryDate
}) => {
  const [generating, setGenerating] = useState(false);
  const [etiCodes, setEtiCodes] = useState<EtiCode[]>([]);
  const [loadingEtiCodes, setLoadingEtiCodes] = useState(true);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch ETI codes for this shipment - first try b2b_shipments.volume_eti_code, then b2b_volume_labels
  useEffect(() => {
    const fetchEtiCodes = async () => {
      if (!shipmentId) {
        setLoadingEtiCodes(false);
        return;
      }

      try {
        // First check if ETI code is stored directly on the shipment
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('b2b_shipments')
          .select('volume_eti_code, tracking_code')
          .eq('id', shipmentId)
          .single();

        if (!shipmentError && shipmentData?.volume_eti_code) {
          // Use the ETI code from the shipment itself
          setEtiCodes([{
            volume_number: 1,
            eti_code: shipmentData.volume_eti_code,
            eti_sequence_number: 1
          }]);
          setLoadingEtiCodes(false);
          return;
        }

        // Fallback: try b2b_volume_labels table
        const { data: labelData, error: labelError } = await supabase
          .from('b2b_volume_labels')
          .select('*')
          .eq('b2b_shipment_id', shipmentId)
          .order('volume_number', { ascending: true });

        if (!labelError && labelData && labelData.length > 0) {
          setEtiCodes(labelData);
        } else {
          // No ETI codes found
          setEtiCodes([]);
        }
      } catch (err) {
        console.error('Error in fetchEtiCodes:', err);
        setEtiCodes([]);
      } finally {
        setLoadingEtiCodes(false);
      }
    };

    fetchEtiCodes();
  }, [shipmentId]);

  const formatAddress = (addr: VolumeAddress | PickupAddress): string => {
    const parts = [
      addr.street,
      addr.number,
      addr.complement,
      addr.neighborhood,
      `${addr.city || ''}/${addr.state || ''}`,
      `CEP: ${addr.cep || ''}`
    ].filter(Boolean);
    return parts.join(', ');
  };

  const getEtiCodeForVolume = (volumeIndex: number): string => {
    const etiCode = etiCodes.find(e => e.volume_number === volumeIndex + 1);
    return etiCode?.eti_code || `${trackingCode}-V${volumeIndex + 1}`;
  };

  const generatePDF = async () => {
    if (!labelsContainerRef.current) return;
    
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const labelElements = labelsContainerRef.current.querySelectorAll('.label-item');
      
      for (let i = 0; i < labelElements.length; i++) {
        const labelElement = labelElements[i] as HTMLElement;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Capture the label as canvas
        const canvas = await html2canvas(labelElement, {
          scale: 3,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions to fit A4 page with margins
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(maxWidth / imgWidth * 3, maxHeight / imgHeight * 3);
        
        const finalWidth = (imgWidth * ratio) / 3;
        const finalHeight = (imgHeight * ratio) / 3;
        
        const x = (pageWidth - finalWidth) / 2;
        const y = margin;
        
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
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

  const formatDeliveryDate = (date: string | undefined) => {
    if (!date) return null;
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return null;
    }
  };

  if (loadingEtiCodes) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando etiquetas...</span>
      </div>
    );
  }

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

      {/* Hidden container with all labels for PDF generation */}
      <div 
        ref={labelsContainerRef} 
        className="absolute left-[-9999px] top-0"
        style={{ width: '400px' }}
      >
        {Array.from({ length: volumeCount }).map((_, index) => {
          const volumeAddress = volumeAddresses[index] || volumeAddresses[0] || {};
          const volumeWeight = volumeWeights[index] || volumeWeights[0] || 0;
          const recipientName = volumeAddress.recipient_name || volumeAddress.name || 'N/A';
          const formattedDate = formatDeliveryDate(deliveryDate);
          const etiCode = getEtiCodeForVolume(index);
          
          return (
            <div 
              key={index} 
              className="label-item bg-white p-6 border-2 border-black mb-4"
              style={{ width: '400px', fontFamily: 'Arial, sans-serif' }}
            >
              {/* Header */}
              <div className="text-center border-b-2 border-black pb-3 mb-3">
                <h1 className="text-xl font-bold">CONFIX ENVIOS</h1>
                <p className="text-sm">B2B Express</p>
              </div>
              
              {/* ETI Code - Large font, no barcode/QR */}
              <div className="text-center border-b border-gray-400 pb-4 mb-3">
                <p className="text-4xl font-black tracking-wider">{etiCode}</p>
                <p className="text-sm text-gray-600 mt-2">Remessa: {trackingCode}</p>
                <p className="text-base font-semibold">Volume {index + 1} de {volumeCount}</p>
              </div>
              
              {/* Sender */}
              <div className="mb-3 pb-3 border-b border-gray-300">
                <p className="font-bold text-sm mb-1">REMETENTE:</p>
                <p className="text-sm font-semibold">{companyName}</p>
                {pickupAddress.contact_name && (
                  <p className="text-xs">Contato: {pickupAddress.contact_name}</p>
                )}
                {pickupAddress.contact_phone && (
                  <p className="text-xs">Tel: {pickupAddress.contact_phone}</p>
                )}
                <p className="text-xs mt-1">{formatAddress(pickupAddress)}</p>
              </div>
              
              {/* Recipient */}
              <div className="bg-gray-100 p-3 rounded mb-3">
                <p className="font-bold text-sm mb-1">DESTINATÁRIO:</p>
                <p className="text-base font-semibold">{recipientName}</p>
                {volumeAddress.recipient_phone && (
                  <p className="text-xs">Tel: {volumeAddress.recipient_phone}</p>
                )}
                <p className="text-xs mt-1">{formatAddress(volumeAddress)}</p>
              </div>
              
              {/* Weight and Date */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-400">
                <p className="font-bold text-base">PESO: {volumeWeight} kg</p>
                {formattedDate && (
                  <p className="text-sm">Previsão: {formattedDate}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview - only first label */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
        <div className="bg-white p-4 mx-auto border-2 border-black max-w-[300px]">
          <div className="text-center border-b border-black pb-2 mb-2">
            <h1 className="text-sm font-bold">CONFIX ENVIOS</h1>
            <p className="text-xs">B2B Express</p>
          </div>
          
          <div className="text-center mb-3">
            <p className="text-2xl font-black tracking-wider">{getEtiCodeForVolume(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Remessa: {trackingCode}</p>
            <p className="text-sm font-medium">Volume 1 de {volumeCount}</p>
          </div>
          
          <div className="text-xs space-y-2">
            <div className="pb-2 border-b border-gray-200">
              <p className="font-bold">Rem: {companyName}</p>
              {pickupAddress.contact_name && (
                <p className="text-muted-foreground">Contato: {pickupAddress.contact_name}</p>
              )}
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <p className="font-bold">Dest: {volumeAddresses[0]?.recipient_name || volumeAddresses[0]?.name || 'N/A'}</p>
              {volumeAddresses[0]?.recipient_phone && (
                <p className="text-muted-foreground">Tel: {volumeAddresses[0].recipient_phone}</p>
              )}
            </div>
            <div className="flex justify-between pt-1">
              <p className="font-bold">Peso: {volumeWeights[0] || 0} kg</p>
              {deliveryDate && (
                <p>Prev: {formatDeliveryDate(deliveryDate)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default B2BLabelGenerator;