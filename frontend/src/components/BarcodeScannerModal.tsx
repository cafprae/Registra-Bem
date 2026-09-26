import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onScanSuccess, onClose }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Pequeno atraso para garantir que o elemento DOM está pronto
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      // Inicializa o leitor diretamente (sem a interface de Scanner)
      const html5QrCode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5QrCode;

      // Inicia a câmara automaticamente
      html5QrCode.start(
        { facingMode: 'environment' }, // Força o uso da câmara traseira
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Callback de sucesso: para a câmara e devolve o texto
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              onScanSuccess(decodedText);
            }).catch(() => {
              onScanSuccess(decodedText);
            });
          } else {
            onScanSuccess(decodedText);
          }
        },
        () => {
          // Callback de erro (ignorar os erros frequentes de leitura de frame)
        }
      ).catch((err) => {
        console.error("Erro ao iniciar a câmara:", err);
      });
      
    }, 100);

    // Função de limpeza ao desmontar o componente
    return () => {
      clearTimeout(timer);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {});
      } else if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess]);

  const handleClose = async () => {
    // Para a câmara de forma segura antes de fechar
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignorar erros durante a paragem
      }
    }
    
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay center-modal-desktop open" onClick={handleClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="sheet-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Escanear Código de Barras</h2>
          <button className="btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Aponte a câmara para o código de barras do património.
        </p>
        
        {/* Adicionei position relative para garantir que o vídeo não fuja do container */}
        <div 
          id="barcode-reader" 
          ref={containerRef}
          style={{ 
            width: '100%',
            minHeight: '300px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            position: 'relative'
          }}
        />
        
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button className="btn btn-outline" onClick={handleClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}