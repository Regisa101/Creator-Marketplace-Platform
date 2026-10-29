import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installImageFallbacks, preloadPhotos } from './utils/photos';

installImageFallbacks();

// Look the photos up first (instant after the first visit) so every page shows
// the same image for the same brand from the very first render.
preloadPhotos().finally(() => {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
});