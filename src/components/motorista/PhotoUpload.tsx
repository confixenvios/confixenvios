import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (photo: File) => void;
  title?: string;
}

export const PhotoUpload = ({ isOpen, onClose, onSave, title = "Adicionar Foto" }: PhotoUploadProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedPhoto(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      toast.error('Por favor, selecione uma imagem válida');
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const handleGallerySelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const handleSave = () => {
    if (!selectedPhoto) return;
    onSave(selectedPhoto);
    clearPhoto();
    onClose();
    toast.success('Foto adicionada com sucesso!');
  };

  const clearPhoto = () => {
    setSelectedPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleClose = () => {
    clearPhoto();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearPhoto}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSave}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Salvar Foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-md">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Adicione uma foto da mercadoria
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleCameraCapture}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Câmera
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGallerySelect}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Galeria
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleClose}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};