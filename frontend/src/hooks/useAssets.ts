import { useEffect, useState } from 'react';
import { STATUS } from '../constants';

const CACHE_KEY = 'registrabem_data';

const mapAssetRow = (row) => ({
  id: row.tombamento,
  tombamento: row.tombamento,
  name: row.nome || 'Sem Descrição',
  sector: row.local_sistema || 'Geral',
  location: row.local_exato_ambiente || '',
  originalLocation: row.local_exato_ambiente || '',
  status: (row.situacao === 'Confirmado') ? STATUS.CONFIRMED : (row.situacao === 'Movido') ? STATUS.MOVED : STATUS.PENDING,
  condition: row.condicao || '',
  validation: row.validacao || null,
  systemName: row.nome_sistema || 'Não especificado',
  year: new Date().getFullYear(),
  isExtra: false,
  logs: [],
});

export function useAssets(supabase) {
  const [assets, setAssets] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAssets = async () => {
      try {
        let allData = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('tabela_inicial')
            .select('*')
            .range(from, to);

          if (error) throw error;

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += 1000;
            to += 1000;
            if (data.length < 1000) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        if (!isMounted) return;
        const mapped = allData.map(mapAssetRow);
        setAssets(mapped);
        setAssetsLoaded(true);
        if (mapped.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
        }
      } catch (err) {
        console.error('Erro ao buscar Supabase', err);
        if (!isMounted) return;

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            setAssets(JSON.parse(cached));
          } catch (parseError) {
            console.error('Erro ao ler cache local', parseError);
          }
        }
        setAssetsLoaded(true);
      }
    };

    fetchAssets();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!assetsLoaded || assets.length === 0) return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(assets));
  }, [assets, assetsLoaded]);

  return { assets, setAssets, assetsLoaded };
}

