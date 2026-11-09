import GraficoNdvi from "../componentes/ui/GraficoNdvi";
import { decimal } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import { resumoPiquetes } from "../lib/ndvi";
import { totalAnimais } from "../lib/rebanho";
import "./Dashboard.css";

export default function Dashboard() {
  const { estado, hoje } = useFazenda();
  const resumos = resumoPiquetes(estado.piquetes, estado.ndvi, estado.lotacao, hoje);
  const comLeitura = resumos.filter((r) => r.ndvi !== null);
  const areaLida = comLeitura.reduce((s, r) => s + r.area_ha, 0);
  const ndviMedio = areaLida > 0 ? comLeitura.reduce((s, r) => s + r.ndvi! * r.area_ha, 0) / areaLida : null;
  const alertas = estado.plano?.alertas.length ?? 0;

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <h1 className="pagina-titulo">Dashboard</h1>
      </div>

      <div className="dashboard-indicadores">
        <section className="cartao">
          <h2 className="dashboard-rotulo">NDVI médio da fazenda</h2>
          <p className="dashboard-valor">{ndviMedio === null ? "—" : decimal(ndviMedio, 2)}</p>
          <p className="cartao-subtitulo">Ponderado pela área de {comLeitura.length} de {resumos.length} piquetes</p>
        </section>
        <section className="cartao">
          <h2 className="dashboard-rotulo">Alertas ativos</h2>
          <p className="dashboard-valor">{alertas}</p>
          <p className="cartao-subtitulo">No plano atual</p>
        </section>
      </div>

      <section className="cartao dashboard-secao">
        <h2 className="cartao-titulo">Evolução semanal do NDVI por piquete</h2>
        <GraficoNdvi piquetes={estado.piquetes} ndvi={estado.ndvi} />
      </section>

      <section className="cartao dashboard-secao">
        <h2 className="cartao-titulo">Lotação por piquete</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Piquete</th><th>NDVI</th><th>Bois</th><th>Vacas</th><th>Bezerros</th><th>Total</th></tr>
            </thead>
            <tbody>
              {resumos.map((r) => (
                <tr key={r.piquete_id}>
                  <td>{r.nome}</td>
                  <td>{r.ndvi === null ? "—" : decimal(r.ndvi, 2)}</td>
                  <td>{r.rebanho?.bois ?? 0}</td>
                  <td>{r.rebanho?.vacas ?? 0}</td>
                  <td>{r.rebanho?.bezerros ?? 0}</td>
                  <td>{r.rebanho ? totalAnimais(r.rebanho) : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
