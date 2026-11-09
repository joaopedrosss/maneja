import { useState, type FormEvent } from "react";
import type { DadosFazenda } from "../../lib/fazenda";
import type { Fazenda } from "../../lib/tipos";
import "./FormularioFazenda.css";

const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIAS_LONGOS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const HORAS = Array.from({ length: 24 }, (_, hora) => hora);

interface Props {
  inicial: Fazenda;
  aoEnviar: (dados: DadosFazenda) => void;
}

export default function FormularioFazenda({ inicial, aoEnviar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [funcionarios, setFuncionarios] = useState(String(inicial.funcionarios_disponiveis));
  const [animais, setAnimais] = useState(String(inicial.animais_por_funcionario_dia));
  const [dias, setDias] = useState<number[]>(inicial.dias_preferenciais_manejo);
  const [envioDia, setEnvioDia] = useState(inicial.envio_plano_dia);
  const [envioHora, setEnvioHora] = useState(inicial.envio_plano_hora);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function mudou(): void {
    setSalvo(false);
  }

  function alternarDia(dia: number): void {
    mudou();
    setDias((atuais) => (atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia]));
  }

  function enviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);
    const nFuncionarios = Number.parseInt(funcionarios, 10);
    const nAnimais = Number.parseInt(animais, 10);
    if (!(nFuncionarios >= 1) || !(nAnimais >= 1)) {
      setErro("Informe pelo menos 1 pessoa e 1 animal por pessoa.");
      return;
    }
    if (dias.length === 0) {
      setErro("Marque pelo menos um dia da semana para mexer no gado.");
      return;
    }
    aoEnviar({
      nome: nome.trim(),
      funcionarios_disponiveis: nFuncionarios,
      animais_por_funcionario_dia: nAnimais,
      dias_preferenciais_manejo: [...dias].sort((a, b) => a - b),
      envio_plano_dia: envioDia,
      envio_plano_hora: envioHora,
    });
    setSalvo(true);
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label className="campo">
        Nome da fazenda
        <input className="campo-entrada" type="text" value={nome} required
          onChange={(e) => { mudou(); setNome(e.target.value); }} />
      </label>
      <label className="campo">
        Quantas pessoas fazem o manejo do gado?
        <input className="campo-entrada" type="number" min={1} step={1} value={funcionarios} required
          onChange={(e) => { mudou(); setFuncionarios(e.target.value); }} />
      </label>
      <label className="campo">
        Quantos animais cada pessoa consegue mover sozinha num dia?
        <input className="campo-entrada" type="number" min={1} step={1} value={animais} required
          onChange={(e) => { mudou(); setAnimais(e.target.value); }} />
      </label>
      <fieldset className="campo formulario-dias">
        <legend>Em quais dias da semana se pode mexer no gado?</legend>
        <div className="formulario-dias-lista">
          {DIAS_CURTOS.map((rotulo, dia) => (
            <label key={rotulo} className="formulario-dia">
              <input type="checkbox" checked={dias.includes(dia)} onChange={() => alternarDia(dia)} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="campo formulario-dias">
        <legend>Quando o produtor quer receber o plano?</legend>
        <div className="formulario-envio">
          <select className="campo-entrada" aria-label="Dia da semana do envio" value={envioDia}
            onChange={(e) => { mudou(); setEnvioDia(Number(e.target.value)); }}>
            {DIAS_LONGOS.map((rotulo, dia) => (
              <option key={rotulo} value={dia}>{rotulo}</option>
            ))}
          </select>
          <select className="campo-entrada" aria-label="Hora do envio" value={envioHora}
            onChange={(e) => { mudou(); setEnvioHora(Number(e.target.value)); }}>
            {HORAS.map((hora) => (
              <option key={hora} value={hora}>{`${hora}h`}</option>
            ))}
          </select>
        </div>
      </fieldset>
      {erro !== null ? <p className="aviso-erro" role="alert">{erro}</p> : null}
      {salvo ? <p className="aviso-info" role="status">Alterações salvas ✓ — o próximo plano já considera estes dados.</p> : null}
      <div className="formulario-acoes">
        <button className="botao botao-primario" type="submit">Salvar</button>
      </div>
    </form>
  );
}
