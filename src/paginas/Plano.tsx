import { useState } from "react";
import { Link } from "react-router";
import { Icone, type NomeIcone } from "../componentes/ui/Icones";
import { CHUVA_FORTE_MM, resumoClima } from "../lib/clima";
import { dataComDia, decimal, fimDoPlano } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import { resumoPiquetes } from "../lib/ndvi";
import { descreverRebanho, lotacaoDe, totalAnimais } from "../lib/rebanho";
import { validarMovimento } from "../lib/regras";
import type { Confianca, Fazenda, Movimentacao, PlanoManejo, PrevisaoClima, TipoAlerta } from "../lib/tipos";
import "./Plano.css";

const CONFIANCA: Record<Confianca, string> = { alta: "alta", media: "média", baixa: "baixa" };
const ICONES_ALERTA: Record<TipoAlerta, NomeIcone> = {
  sem_piquete_apto: "alerta",
  passando_do_ponto: "relogio",
  pronto_para_pastejo: "ok",
  falta_capim: "alerta",
  alerta_clima: "chuva",
};

function movimentosPorDia(movimentacoes: Movimentacao[]): [string, Movimentacao[]][] {
  const dias = new Map<string, Movimentacao[]>();
  for (const m of movimentacoes) dias.set(m.data, [...(dias.get(m.data) ?? []), m]);
  return [...dias].sort(([a], [b]) => a.localeCompare(b));
}

// ---------- uma recomendação de movimentação ----------

function CartaoMovimento({ mov, bloqueado }: { mov: Movimentacao; bloqueado: boolean }) {
  const { estado, fazenda, hoje, executarMovimentacao, recusarMovimentacao } = useFazenda();
  const [escolhendo, setEscolhendo] = useState(false);
  const [destino, setDestino] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // só aparecem os piquetes que passam nas mesmas regras da recomendação
  const dados = { piquetes: estado.piquetes, ndvi: estado.ndvi, lotacao: estado.lotacao, hoje };
  const opcoes = fazenda
    ? resumoPiquetes(estado.piquetes.filter((p) => p.fazenda_id === fazenda.id), estado.ndvi, estado.lotacao, hoje)
        .filter((r) => r.piquete_id !== mov.piquete_destino_id && r.piquete_id !== mov.piquete_origem_id)
        .filter((r) => validarMovimento(r.piquete_id, lotacaoDe(estado.lotacao, mov.piquete_origem_id) ?? mov.rebanho, dados).length === 0)
        .sort((a, b) => b.ndvi! - a.ndvi!)
    : [];

  function confirmar(destinoId?: string): void {
    setErro(null);
    const falha = executarMovimentacao(mov.id, destinoId);
    if (falha) setErro(falha);
    else setEscolhendo(false);
  }

  const realizada = mov.status === "aceita" || mov.status === "trocada";
  const recusada = mov.status === "recusada";

  return (
    <article className={`cartao plano-movimento${realizada ? " plano-movimento-feito" : ""}${recusada ? " plano-movimento-recusado" : ""}`}>
      <div className="plano-movimento-topo">
        <h4 className="cartao-titulo">
          Mover {totalAnimais(mov.rebanho)} animais: {mov.piquete_origem_nome}{" "}
          <span className="plano-seta">→</span> {mov.piquete_destino_nome}
        </h4>
        <span className={`selo selo-${mov.confianca}`}>Confiança {CONFIANCA[mov.confianca]}</span>
      </div>
      <p className="cartao-subtitulo">{descreverRebanho(mov.rebanho)}</p>
      <p>{mov.motivo}</p>
      <p className="plano-previsao">
        NDVI: {decimal(mov.ndvi_origem, 2)} → {decimal(mov.ndvi_destino, 2)}
      </p>
      <p className="cartao-subtitulo">{mov.motivo_confianca}</p>

      {realizada ? (
        <p className="aviso-info plano-feito" role="status">
          Movimentação registrada ✓ — o rebanho está no {mov.piquete_destino_nome} desde hoje
          {mov.destino_trocado ? ` (no lugar do ${mov.destino_recomendado_nome}, recomendado)` : ""}. <Link to="/mapa">Ver no mapa</Link>
        </p>
      ) : recusada ? (
        <p className="aviso-alerta plano-feito" role="status">
          Recomendação recusada. Gere um novo plano para ver outra sugestão.
        </p>
      ) : escolhendo ? (
        <div className="plano-escolha">
          <label className="campo">
            Escolher outro piquete
            <select className="campo-entrada" value={destino} onChange={(e) => setDestino(e.target.value)} disabled={bloqueado}>
              <option value="" disabled>Selecione…</option>
              {opcoes.map((r) => (
                <option key={r.piquete_id} value={r.piquete_id}>
                  {`${r.nome} — NDVI ${decimal(r.ndvi!, 2)}`}
                </option>
              ))}
            </select>
          </label>
          {opcoes.length === 0 ? <p className="cartao-subtitulo">Não há outro piquete apto a receber este rebanho.</p> : null}
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
          <button className="botao botao-secundario" disabled={bloqueado} onClick={() => recusarMovimentacao(mov.id)}>
            Recusar
          </button>
        </div>
      )}
      {erro ? <p className="aviso-erro" role="alert">{erro}</p> : null}
    </article>
  );
}

// ---------- previsão do tempo ----------

function ResumoClima({ clima }: { clima: PrevisaoClima }) {
  const resumo = resumoClima(clima);
  return (
    <section className="cartao plano-clima" aria-label="Previsão do tempo">
      <h2 className="cartao-titulo">Previsão da semana</h2>
      <p className="cartao-subtitulo">
        {decimal(resumo.chuva_total_mm, 0)} mm de chuva · {resumo.temp_min_c} a {resumo.temp_max_c} °C
        {resumo.dias_chuva_forte.length > 0 ? ` · ${resumo.dias_chuva_forte.length} com chuva forte` : ""}
      </p>
      <ul className="plano-clima-dias">
        {clima.dias.map((d) => (
          <li key={d.data} className={d.chuva_mm >= CHUVA_FORTE_MM ? "plano-clima-dia plano-clima-forte" : "plano-clima-dia"}>
            <span className="plano-clima-data">{dataComDia(d.data)}</span>
            <strong>{decimal(d.chuva_mm, 0)} mm</strong>
            <span>{d.temp_min_c}–{d.temp_max_c} °C</span>
          </li>
        ))}
      </ul>
    </section>
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
          O agente está analisando os piquetes, o rebanho, as leituras de NDVI e a previsão do tempo…
        </p>
      ) : null}

      <ResumoClima clima={estado.clima} />

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
        </>
      ) : null}
    </div>
  );
}

export default function Plano() {
  const { fazenda } = useFazenda();
  return fazenda ? <PlanoDaFazenda key={fazenda.id} fazenda={fazenda} /> : null;
}
