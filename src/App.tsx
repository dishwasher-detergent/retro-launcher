import { Route, Routes } from "react-router-dom";

import { Layout } from "@/components/layout";
import { HomePage } from "@/pages/home";
import { LogsPage } from "@/pages/logs";
import { WriterPage } from "@/pages/writer";

function App() {
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
