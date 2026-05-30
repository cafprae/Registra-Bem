import { Package } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="auth-screen">
      <div style={{ textAlign: 'center' }}>
        <div className="pulse" style={{ marginBottom: '20px' }}>
          <Package size={48} color="var(--primary)" />
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando acesso...</p>
      </div>
    </div>
  );
}

