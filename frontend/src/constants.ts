export const STATUS = { PENDING: 'pending', CONFIRMED: 'confirmed', MOVED: 'moved' };

/** Sign-up / profile sector labels (stored verbatim in profiles.sector) */
export const SECTOR_OPTIONS = [
  'Coordenadoria Administrativa e Financeira - CAF',
  'Coordenadoria de Atenção Multiprofissional ao Estudante - CAME',
  'Coordenadoria de Assistência Estudantil - CASE',
  'Coordenadoria do Restaurante Universitário - CRU',
  'Divisao de Benefício e Moradia - DIBEM',
  'Divisao de Serviços Operacionais - DSO',
  'Pró-Reitoria de Assistência Estudantil - PRAE',
];

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

export const getSectorKey = (rawName) => {
  if (!rawName) return '';
  const upper = rawName.toUpperCase();
  const match = Object.keys(SECTOR_NAMES).find(key => upper.includes(key));
  return match || upper;
};

export const getSectorName = (rawName) => {
  if (!rawName) return '';
  const key = getSectorKey(rawName);
  return SECTOR_NAMES[key] || rawName;
};

/** Value for tabela_inicial.local_sistema (short code when possible) */
export const getSectorStorageValue = (profileSector) => {
  const key = getSectorKey(profileSector);
  return key || profileSector || '';
};

export const assetMatchesProfileSector = (assetSector, profileSector) => {
  if (!profileSector || !assetSector) return false;
  const profileKey = getSectorKey(profileSector);
  const assetUpper = assetSector.toUpperCase();
  return (
    profileSector.trim() === assetSector.trim()
    || assetUpper.includes(profileKey)
    || getSectorKey(assetSector) === profileKey
  );
};

export const getRoleLabel = (role) => {
  const labels = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualizador', gestor: 'Gestor' };
  return labels[role] || role || 'Visualizador';
};

export const getRoleColor = (role) => {
  const colors = { admin: '#EF4444', editor: '#3B82F6', viewer: '#94A3B8', gestor: '#10B981' };
  return colors[role] || '#94A3B8';
};

