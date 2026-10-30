import React, { createContext, useContext } from 'react';

export type Density = 'comfortable' | 'compact';

const DensityContext = createContext<Density>('comfortable');

export function DensityProvider({ value, children }: {value: Density;children: React.ReactNode;}) {
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): Density {
  return useContext(DensityContext);
}

export function useRowPad(): string {
  return useDensity() === 'compact' ? 'py-1.5' : 'py-3';
}