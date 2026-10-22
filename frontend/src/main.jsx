import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { warmUpServer } from './services/api';
import './index.css';

warmUpServer();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
