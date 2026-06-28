import ReportView from '../components/ReportView';
import { useInventory } from '../context/InventoryContext';
import { useUI } from '../context/UIContext';

export default function ReportsPage() {
  const { sectorAssets, stats, progress, handleDownloadOds } = useInventory();
  const { reportTab, setReportTab } = useUI();

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
