import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Icone, type NomeIcone } from "../componentes/ui/Icones";
import { resumoPiquetes } from "../lib/agente";
import { dataComDia, decimal, fimDoPlano } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import type { Confianca, Fazenda, Movimentacao, PedidoValidacao, PlanoManejo, TipoAlerta } from "../lib/tipos";
import "./Plano.css";

const CONFIANCA: Record<Confianca, string> = { alta: "alta", media: "média", baixa: "baixa" };
const ICONES_ALERTA: Record<TipoAlerta, NomeIcone> = {
  sem_piquete_apto: "alerta",
  capacidade_excedida: "clientes",
  sem_dia_de_manejo: "calendario",
  passando_do_ponto: "relogio",
  pronto_para_pastejo: "ok",
  falta_capim: "alerta",
  sem_medicao: "pergunta",
};

function movimentosPorDia(movimentacoes: Movimentacao[]): [string, Movimentacao[]][] {
  const dias = new Map<string, Movimentacao[]>();
  for (const m of movimentacoes) dias.set(m.data, [...(dias.get(m.data) ?? []), m]);
  return [...dias].sort(([a], [b]) => a.localeCompare(b));
}

// ---------- uma recomendação de movimentação ----------

function CartaoMovimento({ mov, bloqueado }: { mov: Movimentacao; bloqueado: boolean }) {
  const { estado, fazenda, hoje, executarMovimentacao } = useFazenda();
  const [escolhendo, setEscolhendo] = useState(false);
  const [destino, setDestino] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const lote = estado.lotes.find((l) => l.id === mov.lote_id);
  const opcoes = fazenda
    ? resumoPiquetes(estado, fazenda.id, hoje)
        .filter((r) => r.situacao === "descansando" && r.altura_hoje_cm !== null)
        .filter((r) => r.piquete_id !== mov.piquete_destino_id && r.piquete_id !== lote?.piquete_atual_id)
        .sort((a, b) => b.altura_hoje_cm! - a.altura_hoje_cm!)
    : [];

  function confirmar(destinoId?: string): void {
    setErro(null);
    const falha = executarMovimentacao(mov.id, destinoId);
    if (falha) setErro(falha);
    else setEscolhendo(false);
  }

  const realizada = mov.status === "realizada";

  return (
    <article className={realizada ? "cartao plano-movimento plano-movimento-feito" : "cartao plano-movimento"}>
      <div className="plano-movimento-topo">
        <h4 className="cartao-titulo">
          Mover {mov.lote_nome} ({mov.n_animais} animais): {mov.piquete_origem_nome ?? "sem piquete"}{" "}
          <span className="plano-seta">→</span> {mov.piquete_destino_nome}
        </h4>
        <span className={`selo selo-${mov.confianca}`}>Confiança {CONFIANCA[mov.confianca]}</span>
      </div>
      <p>{mov.motivo}</p>
      <p className="plano-previsao">Previsão: {mov.dias_previstos} {mov.dias_previstos === 1 ? "dia" : "dias"} no piquete</p>
      <p className="cartao-subtitulo">{mov.motivo_confianca}</p>

      {realizada ? (
        <p className="aviso-info plano-feito" role="status">
          Movimentação registrada ✓ — {mov.lote_nome} está no {mov.piquete_destino_nome} desde hoje
          {mov.destino_trocado ? " (piquete escolhido pelo técnico)" : ""}. <Link to="/mapa">Ver no mapa</Link>
        </p>
      ) : escolhendo ? (
        <div className="plano-escolha">
          <label className="campo">
            Escolher outro piquete
            <select className="campo-entrada" value={destino} onChange={(e) => setDestino(e.target.value)} disabled={bloqueado}>
              <option value="" disabled>Selecione…</option>
              {opcoes.map((r) => (
                <option key={r.piquete_id} value={r.piquete_id}>
                  {`${r.nome} — ${decimal(r.altura_hoje_cm!, 0)} cm (entrada ${r.altura_entrada_alvo_cm} cm)${
                    r.altura_hoje_cm! < r.altura_entrada_alvo_cm ? " · abaixo da entrada" : ""
                  }`}
                </option>
              ))}
            </select>
          </label>
          {opcoes.length === 0 ? <p className="cartao-subtitulo">Não há outro piquete livre com medição.</p> : null}
          <div className="formulario-acoes">
            <button className="botao botao-primario" disabled={bloqueado || destino === ""} onClick={() => confirmar(destino)}>
              Confirmar com este piquete
            </button>
            <button className="botao botao-secundario" onClick={() => { setEscolhendo(false); setErro(null); }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="formulario-acoes plano-acoes">
          <button className="botao botao-primario" disabled={bloqueado} onClick={() => confirmar()}>
            Confirmar movimentação
          </button>
          <button className="botao botao-secundario" disabled={bloqueado} onClick={() => setEscolhendo(true)}>
            Escolher outro piquete
          </button>
        </div>
      )}
      {erro ? <p className="aviso-erro" role="alert">{erro}</p> : null}
    </article>
  );
}

// ---------- medição pedida pelo agente ----------

function Medicao({ pedido, bloqueado }: { pedido: PedidoValidacao; bloqueado: boolean }) {
  const { hoje, registrarMedicao } = useFazenda();
  const [altura, setAltura] = useState("");
  const [data, setData] = useState(hoje);
  const [salvo, setSalvo] = useState(false);

  function registrar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    if (bloqueado || salvo) return;
    registrarMedicao(pedido.piquete_id, Number(altura), data);
    setSalvo(true);
  }

  return (
    <form className="cartao plano-medicao" onSubmit={registrar}>
      <h3 className="cartao-titulo">{pedido.piquete_nome}</h3>
      <p>{pedido.motivo}</p>
      {salvo ? (
        <p className="aviso-info" role="status">
          Medição de {altura} cm registrada. Gere um novo plano para considerar esta medida.
        </p>
      ) : (
        <div className="plano-medicao-campos">
          <label className="campo">
            Altura (cm)
            <input className="campo-entrada" type="number" min={0.1} max={400} step="any" required
              value={altura} onChange={(e) => setAltura(e.target.value)} disabled={bloqueado} />
          </label>
          <label className="campo">
            Data da medição
            <input className="campo-entrada" type="date" required max={hoje}
              value={data} onChange={(e) => setData(e.target.value)} disabled={bloqueado} />
          </label>
          <button className="botao botao-primario" disabled={bloqueado} type="submit">Registrar medição</button>
        </div>
      )}
    </form>
  );
}

// ---------- página ----------

function PlanoDaFazenda({ fazenda }: { fazenda: Fazenda }) {
  const { estado, gerarPlano } = useFazenda();
  const plano: PlanoManejo | undefined = estado.planos[fazenda.id];
  const [gerando, setGerando] = useState(false);

  async function gerar(): Promise<void> {
    if (gerando) return;
    setGerando(true);
    await gerarPlano();
    setGerando(false);
  }

  const grupos = plano ? movimentosPorDia(plano.movimentacoes) : [];
  const geracao = plano ? new Date(plano.data_geracao) : null;

  return (
    <div className="pagina plano-pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Plano da semana</h1>
          <p className="cartao-subtitulo">{fazenda.nome}</p>
        </div>
        <div className="plano-gerar">
          <button className="botao botao-primario" disabled={gerando} onClick={() => void gerar()}>
            {gerando ? (
              <><span className="plano-spinner" aria-hidden="true" /> Analisando piquetes…</>
            ) : "Gerar plano"}
          </button>
        </div>
      </div>

      {gerando ? (
        <p className="aviso-info" role="status">
          O agente está analisando piquetes, lotes, crescimento do capim e previsão do tempo…
        </p>
      ) : null}

      {plano && geracao ? (
        <p className="plano-periodo">
          Plano de {dataComDia(plano.data_inicio)} a {dataComDia(fimDoPlano(plano.data_inicio, plano.horizonte_dias))} · gerado em{" "}
          {geracao.toLocaleDateString("pt-BR", { timeZone: fazenda.timezone, day: "2-digit", month: "2-digit" })} às{" "}
          {geracao.toLocaleTimeString("pt-BR", { timeZone: fazenda.timezone, hour: "2-digit", minute: "2-digit" })}
        </p>
      ) : null}

      {!plano && !gerando ? (
        <section className="cartao plano-vazio">
          <h2 className="cartao-titulo">Ainda não há plano para esta fazenda</h2>
          <p className="cartao-subtitulo">Use “Gerar plano” para o agente analisar os piquetes e preparar os manejos.</p>
        </section>
      ) : null}

      {plano ? (
        <>
          <section className="plano-secao" aria-label="Movimentações por dia" aria-busy={gerando}>
            <h2 className="cartao-titulo">Manejos previstos</h2>
            {grupos.length === 0 ? (
              <p className="cartao cartao-subtitulo">Nenhuma movimentação prevista neste plano.</p>
            ) : (
              grupos.map(([data, movimentos]) => (
                <section className="plano-dia" key={data}>
                  <h3 className="plano-dia-titulo">{dataComDia(data)}</h3>
                  {movimentos.map((m) => (
                    <CartaoMovimento key={m.id} mov={m} bloqueado={gerando} />
                  ))}
                </section>
              ))
            )}
          </section>

          <section className="plano-secao" aria-label="Alertas">
            <h2 className="cartao-titulo">Alertas</h2>
            {plano.alertas.length === 0 ? (
              <p className="cartao-subtitulo">Nenhum alerta neste plano.</p>
            ) : (
              <ul className="plano-alertas">
                {plano.alertas.map((alerta, i) => (
                  <li className="aviso-alerta plano-alerta" key={`${alerta.data}-${alerta.tipo}-${i}`}>
                    <span className="plano-alerta-icone" aria-hidden="true"><Icone nome={ICONES_ALERTA[alerta.tipo]} /></span>
                    <div>
                      <strong>{dataComDia(alerta.data)}</strong>
                      <p>{alerta.texto}</p>
                      <small>{alerta.motivo_confianca}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="plano-secao" aria-label="Medições pedidas">
            <h2 className="cartao-titulo">Medições pedidas</h2>
            {plano.pedidos_validacao.length === 0 ? (
              <p className="cartao-subtitulo">Nenhuma medição pedida neste plano.</p>
            ) : (
              plano.pedidos_validacao.map((pedido) => (
                <Medicao key={`${plano.id}-${pedido.piquete_id}`} pedido={pedido} bloqueado={gerando} />
              ))
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default function Plano() {
  const { fazenda } = useFazenda();
  return fazenda ? <PlanoDaFazenda key={fazenda.id} fazenda={fazenda} /> : null;
}
