import { useState, type FormEvent } from "react";
import type { DadosFazenda } from "../../lib/fazenda";
import type { Fazenda } from "../../lib/tipos";
import "./FormularioFazenda.css";

interface Props {
  inicial: Fazenda;
  aoEnviar: (dados: DadosFazenda) => void;
}

export default function FormularioFazenda({ inicial, aoEnviar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [salvo, setSalvo] = useState(false);

  function enviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    aoEnviar({ nome: nome.trim() });
    setSalvo(true);
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo">
        Nome da fazenda
        <input className="campo-entrada" type="text" value={nome} required
          onChange={(e) => { setSalvo(false); setNome(e.target.value); }} />
      </label>
      {salvo ? <p className="aviso-info" role="status">Alterações salvas ✓</p> : null}
      <div className="formulario-acoes">
        <button className="botao botao-primario" type="submit">Salvar</button>
      </div>
    </form>
  );
}
