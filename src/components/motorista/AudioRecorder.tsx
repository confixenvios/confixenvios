import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Play, Pause, RotateCcw, Check, X } from 'lucide-react';
import { createSecureSupabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (audioUrl: string) => void;
  title?: string;
  shipmentId: string;
}

export const AudioRecorder = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title = "Gravação de Áudio",
  shipmentId 
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const supabase = createSecureSupabaseClient();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const uploadAndSave = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      console.log('📤 Iniciando upload de áudio...');
      console.log('🔊 Audio blob size:', audioBlob.size);
      console.log('📦 Shipment ID:', shipmentId);

      const fileName = `audio_${shipmentId}_${Date.now()}.webm`;
      const filePath = `${fileName}`; // Remover diretório para bucket público

      console.log('📂 File path:', filePath);
      console.log('📋 Tentando upload para bucket shipment-audio...');

      const { data, error } = await supabase.storage
        .from('shipment-audio')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      console.log('📤 Upload response:', { data, error });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      console.log('✅ Upload realizado com sucesso:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('shipment-audio')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL gerada:', publicUrl);

      console.log('🎵 [AUDIO RECORDER DEBUG] Executando onSave callback com URL:', publicUrl);
      onSave(publicUrl);
      
      toast({
        title: "Sucesso",
        description: "Áudio gravado e salvo com sucesso!"
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar áudio:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o áudio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    clearRecording();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-4 mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mic className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                {/* Visualizador de status */}
                <div className="flex items-center justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    isRecording ? 'bg-red-100 text-red-600' : 
                    audioBlob ? 'bg-green-100 text-green-600' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isRecording ? (
                      <Mic className="h-6 w-6 animate-pulse" />
                    ) : audioBlob ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className="text-2xl font-mono">
                  {formatTime(duration)}
                </div>

                {/* Status */}
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Gravando... Fale para capturar a confirmação do cliente' :
                   audioBlob ? 'Gravação finalizada' :
                   'Pressione o botão para iniciar a gravação'}
                </p>

                {/* Controles de gravação */}
                {!audioBlob && (
                  <div className="flex justify-center">
                    {!isRecording ? (
                      <Button
                        onClick={startRecording}
                        className="bg-red-500 hover:bg-red-600 text-white"
                        size="lg"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Iniciar Gravação
                      </Button>
                    ) : (
                      <Button
                        onClick={stopRecording}
                        variant="outline"
                        size="lg"
                      >
                        <MicOff className="h-4 w-4 mr-2" />
                        Parar Gravação
                      </Button>
                    )}
                  </div>
                )}

                {/* Controles de reprodução */}
                {audioBlob && (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {!isPlaying ? (
                        <Button
                          onClick={playAudio}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Reproduzir
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseAudio}
                          variant="outline"
                          size="sm"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </Button>
                      )}
                      
                      <Button
                        onClick={clearRecording}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Gravar Novamente
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio element for playback */}
              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />
              )}
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              className="flex-1"
              onClick={uploadAndSave}
              disabled={!audioBlob || isUploading}
            >
              <Check className="h-4 w-4 mr-2" />
              {isUploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};