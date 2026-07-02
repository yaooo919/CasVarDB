import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import "./custom-bootstrap.scss";

const normalizeBasePath = (value) => {
  if (!value) {
    return "";
  }

  let pathname = value;
  try {
    pathname = new URL(value, window.location.origin).pathname;
  } catch {
    pathname = value;
  }

  return pathname.replace(/\/+$/, "");
};

const configuredBasePath = normalizeBasePath(
  process.env.REACT_APP_ROUTER_BASENAME || process.env.PUBLIC_URL || "/CasVarDB"
);

const routerBasePath =
  configuredBasePath &&
  (window.location.pathname === configuredBasePath ||
    window.location.pathname.startsWith(`${configuredBasePath}/`))
    ? configuredBasePath
    : "";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasePath}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);


