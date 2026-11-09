import FormularioFazenda from "../componentes/ui/FormularioFazenda";
import { useFazenda } from "../lib/fazenda";

export default function Configuracoes() {
  const { fazenda, salvarFazenda } = useFazenda();

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <h1 className="pagina-titulo">Fazenda</h1>
      </div>

      <section className="cartao">
        <FormularioFazenda inicial={fazenda} aoEnviar={salvarFazenda} />
      </section>
    </div>
  );
}
