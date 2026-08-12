import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { GalleryProviders } from './providers/GalleryProviders';
import {
  applyGalleryTheme,
  readStoredGalleryOverrides,
  readStoredGalleryTheme,
} from './theme';
import './styles.css';

// Apply before first paint so a stored dark preference does not flash light.
const initialMode = readStoredGalleryTheme();
applyGalleryTheme(initialMode, readStoredGalleryOverrides()[initialMode]);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={basename === '/' ? undefined : basename}>
      <GalleryProviders>
        <App />
      </GalleryProviders>
    </BrowserRouter>
  </StrictMode>,
);
