import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import { Layout } from "@/components/layout";
import { HomePage } from "@/pages/home";
import { LogsPage } from "@/pages/logs";
import { WriterPage } from "@/pages/writer";
import { setNavigateFunction } from "./main";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Make navigate function available to IPC handlers
    setNavigateFunction(navigate);
  }, [navigate]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/writer" element={<WriterPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
