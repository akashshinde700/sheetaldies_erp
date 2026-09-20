import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { DensityProvider } from './contexts/DensityContext';
import { DailyPlanning } from './pages/DailyPlanning';
import { TemperingPlan } from './pages/TemperingPlan';
import { RunSheetList } from './pages/RunSheetList';
import { RunSheetDetail } from './pages/RunSheetDetail';
import { EnergyLog } from './pages/EnergyLog';

interface AppProps {
  /** Row height across every register table. */
  density?: 'comfortable' | 'compact';
}

export function App({ density = 'comfortable' }: AppProps) {
  return (
    <DensityProvider value={density}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DailyPlanning />} />
            <Route path="/tempering" element={<TemperingPlan />} />
            <Route path="/run-sheets" element={<RunSheetList />} />
            <Route path="/run-sheets/:cycleId" element={<RunSheetDetail />} />
            <Route path="/energy" element={<EnergyLog />} />
            <Route path="*" element={<DailyPlanning />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </DensityProvider>);

}