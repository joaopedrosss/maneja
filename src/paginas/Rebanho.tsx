import { useState, type FormEvent } from "react";
import { dataCurta, decimal } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import { descreverRebanho, lotacaoDe, REBANHO_VAZIO, totalAnimais } from "../lib/rebanho";
import type { Piquete, Rebanho as DadosRebanho } from "../lib/tipos";
import "./Rebanho.css";

const CATEGORIAS: { chave: keyof DadosRebanho; rotulo: string }[] = [
  { chave: "bois", rotulo: "Bois" },
  { chave: "vacas", rotulo: "Vacas" },
  { chave: "bezerros", rotulo: "Bezerros" },
];

function CartaoLotacao({ piquete, inicial, desde }: { piquete: Piquete; inicial: DadosRebanho; desde: string | null }) {
  const { salvarLotacao } = useFazenda();
  const [valores, setValores] = useState(inicial);
  const [salvo, setSalvo] = useState(false);

  function salvar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    salvarLotacao(piquete.id, valores);
    setSalvo(true);
  }

  function mudar(chave: keyof DadosRebanho, texto: string): void {
    setSalvo(false);
    setValores((v) => ({ ...v, [chave]: Math.max(0, Number.parseInt(texto, 10) || 0) }));
  }

  return (
    <form className="cartao rebanho-cartao" onSubmit={salvar}>
      <div>
        <h2 className="cartao-titulo">{piquete.nome}</h2>
        <p className="cartao-subtitulo">
          {piquete.vegetacao} · {decimal(piquete.area_ha, 2)} ha
          {desde ? ` · com gado desde ${dataCurta(desde)}` : " · livre"}
        </p>
      </div>
      <div className="rebanho-campos">
        {CATEGORIAS.map(({ chave, rotulo }) => (
          <label className="campo" key={chave}>
            {rotulo}
            <input className="campo-entrada" type="number" min={0} step={1} required
              value={valores[chave]} onChange={(e) => mudar(chave, e.target.value)} />
          </label>
        ))}
        <button className="botao botao-primario" type="submit">Salvar</button>
      </div>
      {salvo ? <p className="aviso-info" role="status">Lotação salva ✓ — gere um novo plano para considerar estes dados.</p> : null}
    </form>
  );
}

export default function Rebanho() {
  const { estado } = useFazenda();
  const piquetes = estado.piquetes;
  const lotacoes = piquetes.map((p) => lotacaoDe(estado.lotacao, p.id));
  const total = lotacoes.reduce<DadosRebanho>(
    (s, l) => ({
      bois: s.bois + (l?.bois ?? 0),
      vacas: s.vacas + (l?.vacas ?? 0),
      bezerros: s.bezerros + (l?.bezerros ?? 0),
    }),
    REBANHO_VAZIO,
  );

  return (
    <div className="pagina">
      <div className="pagina-cabecalho">
        <div>
          <h1 className="pagina-titulo">Rebanho</h1>
          <p className="cartao-subtitulo">{totalAnimais(total)} animais: {descreverRebanho(total)}</p>
        </div>
      </div>

      {piquetes.map((p, i) => {
        const l = lotacoes[i];
        const inicial: DadosRebanho = l ? { bois: l.bois, vacas: l.vacas, bezerros: l.bezerros } : REBANHO_VAZIO;
        return <CartaoLotacao key={p.id} piquete={p} inicial={inicial} desde={l?.desde ?? null} />;
      })}
    </div>
  );
}
