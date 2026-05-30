import ReportView from '../components/ReportView';
import { useInventory } from '../context/InventoryContext';

export default function ReportsPage() {
  const {
    sectorAssets, reportTab, setReportTab, stats, progress, handleDownloadOds,
  } = useInventory();

  return (
    <ReportView
      sectorAssets={sectorAssets}
      reportTab={reportTab}
      setReportTab={setReportTab}
      stats={stats}
      progress={progress}
      onDownloadOds={handleDownloadOds}
    />
  );
}
