import { dataComDia, decimal } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import { descreverRebanho, totalAnimais } from "../lib/rebanho";
import type { Movimentacao, StatusMovimentacao } from "../lib/tipos";
import "./Historico.css";

const STATUS: Record<Exclude<StatusMovimentacao, "pendente">, { rotulo: string; selo: string }> = {
  aceita: { rotulo: "Aceita", selo: "selo-alta" },
  trocada: { rotulo: "Trocada", selo: "selo-media" },
  recusada: { rotulo: "Recusada", selo: "selo-baixa" },
};

function ItemHistorico({ mov }: { mov: Movimentacao }) {
  const status = mov.status === "pendente" ? null : STATUS[mov.status];
  return (
    <li className="cartao historico-item">
      <div className="historico-topo">
        <div>
          <span className="historico-data">{dataComDia(mov.data)}</span>
          <h2 className="cartao-titulo">{mov.piquete_origem_nome} → {mov.piquete_destino_nome}</h2>
        </div>
        {status ? <span className={`selo ${status.selo}`}>{status.rotulo}</span> : null}
      </div>
      <p>
        {totalAnimais(mov.rebanho)} animais ({descreverRebanho(mov.rebanho)}) · NDVI {decimal(mov.ndvi_origem, 2)} → {decimal(mov.ndvi_destino, 2)}
      </p>
      {mov.destino_trocado ? <p className="historico-troca">Recomendado: {mov.destino_recomendado_nome}</p> : null}
      <p className="cartao-subtitulo">{mov.motivo}</p>
    </li>
  );
}

export default function Historico() {
  const { estado } = useFazenda();
  const itens = [...estado.historico].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Histórico</h1>
          <p className="cartao-subtitulo">Recomendações respondidas e movimentações realizadas</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="cartao cartao-subtitulo">Nenhuma recomendação foi respondida ainda.</p>
      ) : (
        <ul className="historico-lista">
          {itens.map((m) => <ItemHistorico key={m.id} mov={m} />)}
        </ul>
      )}
    </div>
  );
}
