import { Routes, Route, Navigate } from 'react-router-dom';
// IMPORTAÇÃO DO CONTEXTO QUE ESTAVA FALTANDO:
import { InventoryProvider } from './context/InventoryContext';

import AdminRoute from './routes/AdminRoute';
import UserManagement from './pages/UserManagement';
import InventoryGate from './layouts/InventoryGate';
import InventoryLayout from './layouts/InventoryLayout';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  return (
    // O PROVIDER ABRAÇANDO TODAS AS ROTAS DO SISTEMA:
    <InventoryProvider>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />

        <Route path="/" element={<InventoryGate />}>
          <Route index element={<Navigate to="/inventory" replace />} />
          <Route element={<InventoryLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </InventoryProvider>
  );
}