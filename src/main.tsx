import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary"; 
import { LoadingProvider } from "./components/LoadingContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LoadingProvider>
        <App />
      </LoadingProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);