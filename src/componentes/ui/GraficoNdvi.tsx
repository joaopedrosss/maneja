import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { dataCurta, decimal, diasEntre } from "../../lib/datas";
import type { LeituraNdvi, Piquete } from "../../lib/tipos";
import "./GraficoNdvi.css";

const ALTURA = 280;
const MARGEM = { topo: 12, direita: 16, base: 28, esquerda: 36 };
const MARCAS_Y = [0, 0.2, 0.4, 0.6, 0.8, 1];
const LARGURA_ROTULO_X = 48;
const MAX_SERIES = 8; // a paleta tem 8 cores e elas nunca se repetem

interface Props {
  piquetes: Piquete[];
  ndvi: LeituraNdvi[];
}

export default function GraficoNdvi({ piquetes, ndvi }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(720);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(() => setLargura(el.clientWidth));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const series = piquetes
    .map((piquete) => ({
      piquete,
      leituras: ndvi.filter((l) => l.piquete_id === piquete.id).sort((a, b) => a.data.localeCompare(b.data)),
    }))
    .filter((s) => s.leituras.length > 0)
    .slice(0, MAX_SERIES)
    .map((s, i) => ({ ...s, cor: `var(--cor-serie-${i + 1})` }));

  const datas = [...new Set(series.flatMap((s) => s.leituras.map((l) => l.data)))].sort();
  if (datas.length === 0) return <p className="cartao-subtitulo">Ainda não há leituras de NDVI.</p>;

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
  const totalDias = Math.max(1, diasEntre(datas[0], datas[datas.length - 1]));
  const x = (data: string) => MARGEM.esquerda + (diasEntre(datas[0], data) / totalDias) * larguraUtil;
  const y = (valor: number) => MARGEM.topo + (1 - valor) * alturaUtil;
  const passoX = Math.max(1, Math.ceil((datas.length * LARGURA_ROTULO_X) / larguraUtil));

  function moverPonteiro(evento: PointerEvent<SVGSVGElement>): void {
    const px = evento.clientX - evento.currentTarget.getBoundingClientRect().left;
    let melhor = 0;
    datas.forEach((d, i) => {
      if (Math.abs(x(d) - px) < Math.abs(x(datas[melhor]) - px)) melhor = i;
    });
    setAtivo(melhor);
  }

  function teclar(evento: KeyboardEvent<SVGSVGElement>): void {
    const delta = evento.key === "ArrowLeft" ? -1 : evento.key === "ArrowRight" ? 1 : 0;
    if (delta === 0) return;
    evento.preventDefault();
    setAtivo((i) => Math.min(datas.length - 1, Math.max(0, (i ?? datas.length - 1) + delta)));
  }

  const dataAtiva = ativo === null ? null : datas[ativo];
  const leituraEm = (leituras: LeituraNdvi[], data: string) => leituras.find((l) => l.data === data) ?? null;
  const naEsquerda = dataAtiva !== null && x(dataAtiva) > largura / 2;

  return (
    <div className="grafico-ndvi">
      <ul className="grafico-legenda">
        {series.map((s) => (
          <li key={s.piquete.id}>
            <span className="grafico-amostra" style={{ background: s.cor }} aria-hidden="true" />
            {s.piquete.nome}
          </li>
        ))}
      </ul>

      <div className="grafico-area" ref={caixa}>
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          aria-label="Evolução semanal do NDVI por piquete. Use as setas para percorrer as semanas."
          tabIndex={0}
          onPointerMove={moverPonteiro}
          onPointerLeave={() => setAtivo(null)}
          onFocus={() => setAtivo(datas.length - 1)}
          onBlur={() => setAtivo(null)}
          onKeyDown={teclar}
        >
          {MARCAS_Y.map((v) => (
            <g key={v}>
              <line className="grafico-grade" x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(v)} y2={y(v)} />
              <text className="grafico-eixo" x={MARGEM.esquerda - 8} y={y(v) + 4} textAnchor="end">{decimal(v, 1)}</text>
            </g>
          ))}
          {datas.map((d, i) =>
            i % passoX === 0 ? (
              <text key={d} className="grafico-eixo" x={x(d)} y={ALTURA - 8} textAnchor="middle">{dataCurta(d)}</text>
            ) : null,
          )}

          {dataAtiva ? <line className="grafico-mira" x1={x(dataAtiva)} x2={x(dataAtiva)} y1={MARGEM.topo} y2={ALTURA - MARGEM.base} /> : null}

          {series.map((s) => (
            <polyline
              key={s.piquete.id}
              className="grafico-linha"
              style={{ stroke: s.cor }}
              points={s.leituras.map((l) => `${x(l.data)},${y(l.valor)}`).join(" ")}
            />
          ))}

          {dataAtiva
            ? series.map((s) => {
                const l = leituraEm(s.leituras, dataAtiva);
                return l ? <circle key={s.piquete.id} className="grafico-ponto" style={{ fill: s.cor }} cx={x(l.data)} cy={y(l.valor)} r={5} /> : null;
              })
            : null}
        </svg>

        {dataAtiva ? (
          <div
            className="grafico-dica"
            style={naEsquerda ? { right: largura - x(dataAtiva) + 12 } : { left: x(dataAtiva) + 12 }}
          >
            <strong>{dataCurta(dataAtiva)}</strong>
            {series.map((s) => {
              const l = leituraEm(s.leituras, dataAtiva);
              return l ? (
                <div className="grafico-dica-linha" key={s.piquete.id}>
                  <span className="grafico-amostra" style={{ background: s.cor }} aria-hidden="true" />
                  <span>{s.piquete.nome}</span>
                  <b>{decimal(l.valor, 2)}</b>
                </div>
              ) : null;
            })}
          </div>
        ) : null}
      </div>

      <details className="grafico-tabela">
        <summary>Ver os valores em tabela</summary>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                {series.map((s) => <th key={s.piquete.id}>{s.piquete.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {datas.map((d) => (
                <tr key={d}>
                  <td>{dataCurta(d)}</td>
                  {series.map((s) => {
                    const l = leituraEm(s.leituras, d);
                    return <td key={s.piquete.id}>{l ? decimal(l.valor, 2) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
