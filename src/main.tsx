import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'dayjs/locale/es';

import App from './App';
import { store } from './store';
import { ThemeSettingsProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DIANModeProvider } from './contexts/DIANModeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { initDemoData } from './services/mockBackend';
import './index.css';

initDemoData();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeSettingsProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <AuthProvider>
              <NotificationProvider>
                <WebSocketProvider>
                  <DIANModeProvider>
                    <App />
                    <ToastContainer
                      position="top-right"
                      autoClose={5000}
                      hideProgressBar={false}
                      newestOnTop={false}
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="colored"
                    />
                  </DIANModeProvider>
                </WebSocketProvider>
              </NotificationProvider>
            </AuthProvider>
          </LocalizationProvider>
        </ThemeSettingsProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);