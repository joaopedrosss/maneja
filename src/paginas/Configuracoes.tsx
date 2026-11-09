import FormularioFazenda from "../componentes/ui/FormularioFazenda";
import { useFazenda } from "../lib/fazenda";

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
    </div>
  );
}
