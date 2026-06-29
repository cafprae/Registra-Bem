import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onScanSuccess, onClose }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to ensure the DOM element is ready
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      // Initialize the scanner with rear camera
      const scanner = new Html5QrcodeScanner(
        'barcode-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 1.5,
          // Use rear camera by default
          videoConstraints: {
            facingMode: { exact: 'environment' },
          },
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
        },
        () => {
          // Error callback (ignore scan errors - they happen frequently)
        }
      );

      scannerRef.current = scanner;
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {
          // Ignore errors during cleanup
        });
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess]);

  const handleClose = async () => {
    // Clear the scanner before closing
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {
        // Ignore errors during cleanup
      }
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
          Aponte a câmera para o código de barras do patrimônio.
        </p>
        
        <div 
          id="barcode-reader" 
          ref={containerRef}
          style={{ 
            width: '100%',
            minHeight: '300px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)'
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
