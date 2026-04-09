import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(12px, env(safe-area-inset-top))' }}
        toastOptions={{
          duration: 3200,
          className:
            '!text-sm !font-medium !rounded-xl !border !border-slate-200/90 !bg-white/95 !backdrop-blur-md !shadow-soft !text-slate-800',
          style: { maxWidth: 'min(100vw - 24px, 400px)' },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
