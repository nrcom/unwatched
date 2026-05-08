import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e5a00d',   // Plex gold
          colorBgBase: '#1a1a1a',
          colorBgContainer: '#242424',
          borderRadius: 6,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#141414',
            bodyBg: '#1a1a1a',
            headerBg: '#141414',
          },
          Table: {
            headerBg: '#2a2a2a',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
