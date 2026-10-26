import { IconContext } from '@phosphor-icons/react';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
        <App />
      </IconContext.Provider>
    </MotionConfig>
  </StrictMode>,
);
