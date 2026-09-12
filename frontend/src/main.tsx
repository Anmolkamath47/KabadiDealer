import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DealerAuthProvider } from './context/DealerAuthContext';
import { DealerOrderProvider } from './context/DealerOrderContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DealerAuthProvider>
        <DealerOrderProvider>
          <App />
        </DealerOrderProvider>
      </DealerAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
