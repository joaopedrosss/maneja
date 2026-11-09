import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Layout from "./componentes/Layout";
import { FazendaProvider } from "./lib/fazenda";
import Configuracoes from "./paginas/Configuracoes";
import Mapa from "./paginas/Mapa";
import Plano from "./paginas/Plano";

export default function App() {
  return (
    <BrowserRouter>
      <FazendaProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/plano" element={<Plano />} />
            <Route path="/fazenda" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/mapa" replace />} />
        </Routes>
      </FazendaProvider>
    </BrowserRouter>
  );
}
