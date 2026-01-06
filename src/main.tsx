import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domMax } from 'framer-motion';
import App from './App';
import '@styles/reset.css';
import '@styles/variables.css';
import '@styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domMax} strict>
      <App />
    </LazyMotion>
  </StrictMode>,
);
