import { IconContext } from '@phosphor-icons/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
