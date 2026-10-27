import { IconContext } from '@phosphor-icons/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { TooltipLayer } from './mc.jsx';
import './styles.css';
import { applyTheme } from './theme.js';

applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IconContext.Provider value={{ size: 18, weight: 'bold' }}>
      <App />
      <TooltipLayer />
    </IconContext.Provider>
  </StrictMode>,
);
