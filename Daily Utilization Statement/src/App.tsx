import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppNav } from './components/AppNav';
import { UtilisationProvider } from './contexts/UtilisationContext';
import { DailyStatement } from './pages/DailyStatement';
import { MonthlyIdleTime } from './pages/MonthlyIdleTime';
import { PlantLosses } from './pages/PlantLosses';
import { PrintPack } from './pages/PrintPack';

export function App() {
  return (
    <BrowserRouter>
      <UtilisationProvider>
        <div className="min-h-screen w-full bg-surface-sunken font-sans text-ink print:bg-white">
          <AppNav />
          <main className="mx-auto w-full max-w-[1400px] px-6 py-6 print:max-w-none print:px-0 print:py-0">
            <Routes>
              <Route path="/" element={<DailyStatement />} />
              <Route path="/monthly" element={<MonthlyIdleTime />} />
              <Route path="/losses" element={<PlantLosses />} />
              <Route path="/print" element={<PrintPack />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </UtilisationProvider>
    </BrowserRouter>);

}