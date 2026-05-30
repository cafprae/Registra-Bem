export const STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', MOVED: 'moved' };

const SECTOR_NAMES = {
  PRAE: 'Pró-Reitoria de Assistência Estudantil - PRAE',
  CAF: 'Coordenadoria Administrativa e Financeira - CAF',
  CAME: 'Coordenadoria de Atenção Multiprofissional ao Estudante - CAME',
  CASE: 'Coordenadoria de Assistência Estudantil - CASE',
  CRU: 'Coordenadoria do Restaurante Universitário - CRU',
  DIBEM: 'Divisão de Benefício e Moradia - DIBEM',
  DSO: 'Divisão de Serviços Operacionais - DSO',
};

export const AUTHORIZED_ROLES = ['editor', 'admin', 'agente', 'gestor', 'coordenador'];

export const getSectorName = (rawName) => {
  if (!rawName) return '';
  const upper = rawName.toUpperCase();
  const match = Object.keys(SECTOR_NAMES).find(key => upper.includes(key));
  return match ? SECTOR_NAMES[match] : rawName;
};

export const getRoleLabel = (role) => {
  const labels = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador' };
  return labels[role] || role || 'Visualizador';
};

export const getRoleColor = (role) => {
  const colors = { admin: '#EF4444', editor: '#3B82F6', viewer: '#94A3B8' };
  return colors[role] || '#94A3B8';
};

