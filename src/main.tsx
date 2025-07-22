import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { LogsProvider } from "./contexts/logs-context.tsx";
import "./global.css";

// Create a reference to the navigate function that we can use from IPC handlers
let navigate: ((path: string) => void) | null = null;

export const setNavigateFunction = (navigateFn: (path: string) => void) => {
  navigate = navigateFn;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LogsProvider>
        <App />
      </LogsProvider>
    </BrowserRouter>
  </React.StrictMode>
);

window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});

// Handle navigation from tray menu
window.ipcRenderer.on("navigate-to", (_event, path: string) => {
  if (navigate) {
    navigate(path);
  }
});
