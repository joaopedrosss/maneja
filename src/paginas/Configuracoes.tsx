import { useState } from "react";
import FormularioFazenda from "../componentes/ui/FormularioFazenda";
import { useFazenda } from "../lib/fazenda";
import type { Fazenda } from "../lib/tipos";
import "./Configuracoes.css";

const BOT_TELEGRAM = "ManejaProdBot";

function CartaoTelegram({ fazenda }: { fazenda: Fazenda }) {
  const { atualizarStatusTelegram } = useFazenda();
  const [consultando, setConsultando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState<string | null>(null);
  const link = `https://t.me/${BOT_TELEGRAM}?start=${fazenda.telegram_token}`;

  async function copiar(): Promise<void> {
    setErroCopia(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
      setErroCopia("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  async function consultar(): Promise<void> {
    setConsultando(true);
    await atualizarStatusTelegram();
    setConsultando(false);
  }

  return (
    <section className="cartao configuracoes-telegram">
      <h2 className="cartao-titulo">Telegram</h2>
      {fazenda.telegram_vinculado ? (
        <p className="aviso-info">Telegram conectado ✓ — o produtor recebe o plano da semana e a ordem do dia.</p>
      ) : (
        <>
          <p>
            Mande este link para o produtor abrir no celular e tocar em <strong>Começar</strong>
          </p>
          <a className="configuracoes-link" href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
          {erroCopia !== null ? <p className="aviso-erro" role="alert">{erroCopia}</p> : null}
          <div className="formulario-acoes">
            <button type="button" className="botao botao-primario" onClick={() => void copiar()}>
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
            <button type="button" className="botao botao-secundario" disabled={consultando} onClick={() => void consultar()}>
              {consultando ? "Consultando…" : "Atualizar status"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default function Configuracoes() {
  const { fazenda, salvarFazenda } = useFazenda();
  if (fazenda === null) return null;

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Fazenda</h1>
          <p className="cartao-subtitulo">{`Cliente: ${fazenda.cliente_nome}`}</p>
        </div>
      </div>

      <section className="cartao">
        <FormularioFazenda key={fazenda.id} inicial={fazenda} aoEnviar={salvarFazenda} />
      </section>

      <CartaoTelegram key={fazenda.id} fazenda={fazenda} />
    </div>
  );
}
