import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Lazy-load route components to enable code-splitting and smaller initial bundle
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const JobCardList = lazy(() => import('./pages/jobcard/JobCardList'));
const JobCardForm = lazy(() => import('./pages/jobcard/JobCardForm'));
const InspectionForm = lazy(() => import('./pages/jobcard/InspectionForm'));

const JobworkList = lazy(() => import('./pages/jobwork/JobworkList'));
const JobworkForm = lazy(() => import('./pages/jobwork/JobworkForm'));
const JobworkDetail = lazy(() => import('./pages/jobwork/JobworkDetail'));
const InwardOutwardRegister = lazy(() => import('./pages/jobwork/InwardOutwardRegister'));

const CertList = lazy(() => import('./pages/quality/CertList'));
const CertForm = lazy(() => import('./pages/quality/CertForm'));
const CertDetail = lazy(() => import('./pages/quality/CertDetail'));
const CertPrint = lazy(() => import('./pages/quality/CertPrint'));

const InvoiceList = lazy(() => import('./pages/finance/InvoiceList'));
const InvoiceForm = lazy(() => import('./pages/finance/InvoiceForm'));
const InvoiceDetail = lazy(() => import('./pages/finance/InvoiceDetail'));
const InvoicePrint = lazy(() => import('./pages/finance/InvoicePrint'));

const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const AdvancedAnalytics = lazy(() => import('./pages/analytics/AdvancedAnalytics'));

const ProcessPricing = lazy(() => import('./pages/admin/ProcessPricing'));
const PriceCard = lazy(() => import('./pages/admin/PriceCard'));
const PartyList = lazy(() => import('./pages/admin/PartyList'));
const PartyDetail = lazy(() => import('./pages/admin/PartyDetail'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const ItemList = lazy(() => import('./pages/admin/ItemList'));
const MachineList = lazy(() => import('./pages/admin/MachineList'));
const PricingManagement = lazy(() => import('./pages/admin/PricingManagement'));

const DispatchList = lazy(() => import('./pages/dispatch/DispatchList'));
const DispatchChallanForm = lazy(() => import('./pages/dispatch/DispatchChallanForm'));

const PurchaseOrderList = lazy(() => import('./pages/purchase/PurchaseOrderList'));
const GoodsReceiptForm = lazy(() => import('./pages/purchase/GoodsReceiptForm'));
const InventoryView = lazy(() => import('./pages/purchase/InventoryView'));

const ManufacturingBatchList = lazy(() => import('./pages/manufacturing/ManufacturingBatchList'));
const VHTRunsheetList = lazy(() => import('./pages/manufacturing/VHTRunsheetList'));
const VHTRunsheetForm = lazy(() => import('./pages/manufacturing/VHTRunsheetForm'));
const VHTRunsheetPrint = lazy(() => import('./pages/manufacturing/VHTRunsheetPrint'));
const ManufacturingReports = lazy(() => import('./pages/manufacturing/ManufacturingReports'));
const DailyFurnacePlanning = lazy(() => import('./pages/manufacturing/DailyFurnacePlanning'));
const DailyFurnacePlanningPrint = lazy(() => import('./pages/manufacturing/DailyFurnacePlanningPrint'));

const AuditLogsViewer = lazy(() => import('./pages/admin/AuditLogsViewer'));

const PrivateRoute = ({ children, role }) => {
  const { user, isAdmin, isManager, isOperator } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'ADMIN'   && !isAdmin)    return <Navigate to="/" replace />;
  if (role === 'MANAGER' && !isManager)  return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Suspense fallback={
    <div className="flex min-h-dvh min-h-screen items-center justify-center bg-app-shell px-4 safe-pt safe-pb main-area-padding">
      <div className="flex flex-col sm:flex-row items-center gap-3 text-slate-500">
        <span className="material-symbols-outlined animate-spin text-2xl text-sky-600" aria-hidden>progress_activity</span>
        <span className="text-sm font-semibold tracking-tight">Loading module…</span>
      </div>
    </div>
  }>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
      <Route path="jobcards"               element={<JobCardList />} />
      <Route path="jobcards/new"           element={<JobCardForm />} />
      <Route path="jobcards/:id"           element={<JobCardForm />} />
      <Route path="jobcards/:id/inspection" element={<InspectionForm />} />
      <Route path="jobwork"                element={<JobworkList />} />
      <Route path="jobwork/register"       element={<InwardOutwardRegister />} />
      <Route path="jobwork/new"            element={<JobworkForm />} />
      <Route path="jobwork/:id/edit"       element={<JobworkForm />} />
      <Route path="jobwork/:id"            element={<JobworkDetail />} />
      <Route path="quality/certificates"       element={<CertList />} />
      <Route path="quality/certificates/new"  element={<CertForm />} />
      <Route path="quality/certificates/:id"  element={<CertDetail />} />
      <Route path="quality/certificates/:id/print" element={<CertPrint />} />
      <Route path="invoices"               element={<InvoiceList />} />
      <Route path="invoices/new"           element={<InvoiceForm />} />
      <Route path="invoices/:id"           element={<InvoiceDetail />} />
      <Route path="invoices/:id/print"     element={<InvoicePrint />} />
      <Route path="analytics"             element={<Analytics />} />
      <Route path="analytics/advanced"    element={<AdvancedAnalytics />} />
      <Route path="admin/parties/:partyId"   element={<PrivateRoute role="MANAGER"><PartyDetail /></PrivateRoute>} />
      <Route path="admin/parties"            element={<PrivateRoute role="MANAGER"><PartyList /></PrivateRoute>} />
      <Route path="admin/items"               element={<PrivateRoute role="MANAGER"><ItemList /></PrivateRoute>} />
      <Route path="admin/machines"            element={<PrivateRoute role="MANAGER"><MachineList /></PrivateRoute>} />
      <Route path="admin/pricing"             element={<PrivateRoute role="MANAGER"><PricingManagement /></PrivateRoute>} />
      <Route path="admin/processes"         element={<PrivateRoute role="ADMIN"><ProcessPricing /></PrivateRoute>} />
      <Route path="admin/price-card"        element={<PrivateRoute role="ADMIN"><PriceCard /></PrivateRoute>} />
      <Route path="admin/users"             element={<PrivateRoute role="ADMIN"><UserManagement /></PrivateRoute>} />
      <Route path="admin/audit-logs"       element={<PrivateRoute role="ADMIN"><AuditLogsViewer /></PrivateRoute>} />
      <Route path="dispatch"                  element={<DispatchList />} />
      <Route path="dispatch/new"              element={<DispatchChallanForm />} />
      <Route path="dispatch/:id"              element={<DispatchChallanForm />} />
      <Route path="purchase"                  element={<PrivateRoute role="MANAGER"><PurchaseOrderList /></PrivateRoute>} />
      <Route path="purchase/grn"              element={<PrivateRoute role="MANAGER"><GoodsReceiptForm /></PrivateRoute>} />
      <Route path="purchase/inventory"        element={<PrivateRoute role="MANAGER"><InventoryView /></PrivateRoute>} />
      <Route path="manufacturing/batches"     element={<PrivateRoute role="MANAGER"><ManufacturingBatchList /></PrivateRoute>} />
      <Route path="manufacturing/runsheet"    element={<PrivateRoute role="MANAGER"><VHTRunsheetList /></PrivateRoute>} />
      <Route path="manufacturing/runsheet/new" element={<PrivateRoute role="MANAGER"><VHTRunsheetForm /></PrivateRoute>} />
      <Route path="manufacturing/runsheet/:id/print" element={<PrivateRoute role="MANAGER"><VHTRunsheetPrint /></PrivateRoute>} />
      <Route path="manufacturing/runsheet/:id" element={<PrivateRoute role="MANAGER"><VHTRunsheetForm /></PrivateRoute>} />
      <Route path="manufacturing/reports"     element={<PrivateRoute role="MANAGER"><ManufacturingReports /></PrivateRoute>} />
      <Route path="manufacturing/planning"    element={<PrivateRoute role="MANAGER"><DailyFurnacePlanning /></PrivateRoute>} />
      <Route path="manufacturing/planning/print" element={<PrivateRoute role="MANAGER"><DailyFurnacePlanningPrint /></PrivateRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
