import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are self-hosted via Fontsource: zero external requests, no FOUT on reload.
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/inter-tight/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

import App from './App';
import { ThemeProvider } from './state/theme';
import { ToastProvider } from './state/toasts';

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
