import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "@geoman-io/leaflet-geoman-free";
import { resumoPiquetes } from "../lib/agente";
import { dataComDia, dataCurta, decimal } from "../lib/datas";
import { useFazenda } from "../lib/fazenda";
import { centro } from "../lib/geo";
import type { Fazenda, GeoJsonPolygon, Piquete, ResumoPiquete } from "../lib/tipos";
import "./Mapa.css";

// O Leaflet pinta em SVG e não entende var(--x): lemos o valor da variável do tema.
function corDoTema(variavel: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
}

function posicoes(geometria: GeoJsonPolygon): [number, number][] {
  return geometria.coordinates[0].map((c) => [c[1], c[0]] as [number, number]);
}

function corDoPiquete(resumo: ResumoPiquete | undefined, temPlano: boolean): string {
  if (!temPlano || !resumo || resumo.altura_hoje_cm === null) return corDoTema("--cor-sem-estimativa");
  const h = resumo.altura_hoje_cm;
  if (resumo.situacao === "ocupado") {
    return h <= resumo.altura_saida_alvo_cm ? corDoTema("--cor-sair") : corDoTema("--cor-ocupado");
  }
  return h >= resumo.altura_entrada_alvo_cm ? corDoTema("--cor-pronto") : corDoTema("--cor-crescendo");
}

// ---------- controles dentro do mapa ----------

function ControlesDesenho({ piquetes, aoCriar }: { piquetes: Piquete[]; aoCriar: (g: GeoJsonPolygon) => void }) {
  const map = useMap();
  const enquadrado = useRef(false);

  useEffect(() => {
    map.pm.setLang("pt_br");
    map.pm.addControls({
      position: "topleft",
      drawPolygon: true,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });
    const aoDesenhar = (e: { layer: L.Layer }) => {
      const camada = e.layer as L.Polygon;
      const geometria = camada.toGeoJSON().geometry as GeoJsonPolygon;
      map.removeLayer(camada);
      aoCriar(geometria);
    };
    map.on("pm:create", aoDesenhar);
    return () => {
      map.pm.removeControls();
      map.off("pm:create", aoDesenhar);
    };
  }, [map, aoCriar]);

  useEffect(() => {
    if (enquadrado.current) return;
    enquadrado.current = true;
    const pontos = piquetes.flatMap((p) => posicoes(p.geometria));
    const limites = L.latLngBounds(pontos);
    if (limites.isValid()) map.fitBounds(limites, { padding: [40, 40], maxZoom: 17 });
    else map.setView([-9.62, -35.97], 15);
  }, [map, piquetes]);

  return null;
}

function FocoNoPiquete({ piquete }: { piquete: Piquete | null }) {
  const map = useMap();
  useEffect(() => {
    if (!piquete) return;
    const limites = L.latLngBounds(posicoes(piquete.geometria));
    if (!map.getBounds().contains(limites)) map.flyToBounds(limites, { padding: [80, 80], maxZoom: 17 });
  }, [map, piquete]);
  return null;
}

function BuscaCoordenadas() {
  const map = useMap();
  const [texto, setTexto] = useState("");

  const irPara = () => {
    const [lat, lng] = texto.split(",").map((v) => Number.parseFloat(v.trim()));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) map.setView([lat, lng], 17);
  };

  const minhaLocalizacao = () => {
    navigator.geolocation?.getCurrentPosition((pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 17));
  };

  return (
    <div className="controles-topo">
      <input type="text" placeholder="-9.62, -35.97" value={texto} aria-label="Coordenadas"
        onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && irPara()} />
      <button type="button" onClick={irPara}>Ir</button>
      <button type="button" onClick={minhaLocalizacao}>Minha localização</button>
    </div>
  );
}

// ---------- página ----------

function MapaDaFazenda({ fazenda }: { fazenda: Fazenda }) {
  const { estado, hoje, criarPiquete, atualizarGeometria, desativarPiquete } = useFazenda();
  const piquetes = estado.piquetes.filter((p) => p.fazenda_id === fazenda.id);
  const resumos = resumoPiquetes(estado, fazenda.id, hoje);
  const plano = estado.planos[fazenda.id];
  const temPlano = plano !== undefined;

  const [novaGeometria, setNovaGeometria] = useState<GeoJsonPolygon | null>(null);
  const [nome, setNome] = useState("");
  const [cultivarId, setCultivarId] = useState("marandu");
  const [alturaCm, setAlturaCm] = useState("");
  const [dataMedida, setDataMedida] = useState(hoje);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmarDesativarId, setConfirmarDesativarId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const camadas = useRef(new Map<string, L.Polygon>());

  const quantos = useRef(piquetes.length);
  useEffect(() => {
    quantos.current = piquetes.length;
  }, [piquetes.length]);
  const aoDesenhar = useCallback((geometria: GeoJsonPolygon) => {
    setNome(`Piquete ${quantos.current + 1}`);
    setNovaGeometria(geometria);
  }, []);

  function salvarNovo(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    if (!novaGeometria) return;
    const id = criarPiquete({
      nome,
      cultivar_id: cultivarId,
      geometria: novaGeometria,
      altura_cm: Number.parseFloat(alturaCm),
      data_medicao: dataMedida,
    });
    setNovaGeometria(null);
    setAlturaCm("");
    setSelecionadoId(id);
  }

  function editarForma(id: string): void {
    setEditandoId(id);
    camadas.current.get(id)?.pm.enable({ allowSelfIntersection: false });
  }

  function salvarForma(id: string): void {
    const camada = camadas.current.get(id);
    if (!camada) return;
    camada.pm.disable();
    setEditandoId(null);
    atualizarGeometria(id, camada.toGeoJSON().geometry as GeoJsonPolygon);
  }

  function cancelarForma(p: Piquete): void {
    const camada = camadas.current.get(p.id);
    if (camada) {
      camada.pm.disable();
      camada.setLatLngs(posicoes(p.geometria));
    }
    setEditandoId(null);
  }

  function desativar(id: string): void {
    setErro(null);
    const falha = desativarPiquete(id);
    setConfirmarDesativarId(null);
    if (falha) setErro(falha);
    else if (selecionadoId === id) setSelecionadoId(null);
  }

  const selecionado = piquetes.find((p) => p.id === selecionadoId) ?? null;
  const pendentes = plano?.movimentacoes.filter((m) => m.status === "pendente") ?? [];

  return (
    <div className="mapa-container">
      <div className="mapa-wrapper">
        <MapContainer center={[-9.62, -35.97]} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxZoom={20}
            maxNativeZoom={19}
            className="mapa-cinza"
          />
          <ControlesDesenho piquetes={piquetes} aoCriar={aoDesenhar} />
          <FocoNoPiquete piquete={selecionado} />
          <BuscaCoordenadas />

          {piquetes.map((p) => {
            const resumo = resumos.find((r) => r.piquete_id === p.id);
            const cor = corDoPiquete(resumo, temPlano);
            const altura = temPlano && resumo?.altura_hoje_cm != null ? ` · ${decimal(resumo.altura_hoje_cm, 1)} cm` : "";
            return (
              <Polygon
                key={p.id}
                positions={posicoes(p.geometria)}
                pathOptions={{
                  color: cor,
                  fillColor: cor,
                  fillOpacity: selecionadoId === p.id ? 0.55 : 0.4,
                  weight: editandoId === p.id || selecionadoId === p.id ? 4 : 2,
                }}
                ref={(r) => {
                  if (r) camadas.current.set(p.id, r);
                }}
                eventHandlers={{ click: () => setSelecionadoId(p.id) }}
              >
                <Tooltip permanent direction="center" className="tooltip-piquete">
                  <div className="tooltip-titulo">{p.nome}{altura}</div>
                  {resumo ? (
                    <div className="tooltip-detalhes">
                      Capim: {resumo.cultivar_nome}<br />
                      Situação: {resumo.situacao}<br />
                      {resumo.lote_atual_nome ? <>Lote: {resumo.lote_atual_nome}<br /></> : null}
                      Confiança: {resumo.confianca} ({resumo.motivo_confianca})
                    </div>
                  ) : null}
                </Tooltip>
              </Polygon>
            );
          })}

          {pendentes.map((m) => {
            const origem = piquetes.find((p) => p.id === m.piquete_origem_id);
            const destino = piquetes.find((p) => p.id === m.piquete_destino_id);
            if (!origem || !destino) return null;
            return (
              <Polyline key={m.id} positions={[centro(origem.geometria), centro(destino.geometria)]}
                pathOptions={{ color: corDoTema("--cor-superficie"), dashArray: "10, 10", weight: 3 }}>
                <Tooltip permanent direction="top" offset={[0, -16]} opacity={0.9} className="tooltip-movimento">
                  {dataComDia(m.data)} · {m.lote_nome} →
                </Tooltip>
              </Polyline>
            );
          })}
        </MapContainer>

        <div className="legenda-mapa">
          <div className="legenda-item"><div className="legenda-cor sem-estimativa"></div> Sem estimativa</div>
          <div className="legenda-item"><div className="legenda-cor sair"></div> Precisa sair</div>
          <div className="legenda-item"><div className="legenda-cor ocupado"></div> Com gado</div>
          <div className="legenda-item"><div className="legenda-cor pronto"></div> Pronto para entrar</div>
          <div className="legenda-item"><div className="legenda-cor crescendo"></div> Crescendo</div>
        </div>
      </div>

      <div className="painel-lateral">
        {erro ? <div className="mensagem-erro" role="alert">{erro}</div> : null}

        {novaGeometria ? (
          <div>
            <h2>Novo piquete</h2>
            <form onSubmit={salvarNovo} className="formulario-piquete">
              <label>
                Nome
                <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>
              <label>
                Capim
                <select value={cultivarId} onChange={(e) => setCultivarId(e.target.value)} required>
                  {estado.cultivares.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                Método
                <input type="text" value="Rotacionado" disabled />
              </label>
              <label>
                Altura média medida (cm)
                <input required type="number" min={0.1} step="0.1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} />
              </label>
              <label>
                Data da medida
                <input required type="date" max={hoje} value={dataMedida} onChange={(e) => setDataMedida(e.target.value)} />
              </label>
              <div className="acoes-formulario">
                <button type="submit" className="botao-acao">Salvar</button>
                <button type="button" className="botao-acao secundario" onClick={() => setNovaGeometria(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <h2>Piquetes ({piquetes.length})</h2>
            {!temPlano ? <p className="texto-suave">Ainda não há plano para esta fazenda: gere um em “Plano da semana” para ver as estimativas.</p> : null}
            <p className="texto-suave dica-desenho">Para cadastrar um piquete, use a ferramenta de polígono no canto do mapa.</p>
            <ul className="lista-piquetes">
              {piquetes.map((p) => {
                const r = resumos.find((x) => x.piquete_id === p.id);
                return (
                  <li key={p.id} className={`item-piquete ${selecionadoId === p.id ? "ativo" : ""}`} onClick={() => setSelecionadoId(p.id)}>
                    <h3>{p.nome}</h3>
                    <p>{r?.cultivar_nome} · {p.metodo_pastejo} · {decimal(p.area_ha, 2)} ha</p>
                    <p>Situação: {r?.situacao}{r?.lote_atual_nome ? ` (${r.lote_atual_nome})` : ""}</p>
                    {r?.ultima_medicao_campo ? (
                      <p>Última medida: {decimal(r.ultima_medicao_campo.altura_cm, 0)} cm em {dataCurta(r.ultima_medicao_campo.data)}</p>
                    ) : <p>Sem medição em campo</p>}
                    {temPlano && r?.altura_hoje_cm != null ? <p>Estimativa hoje: {decimal(r.altura_hoje_cm, 1)} cm</p> : null}

                    {selecionadoId === p.id ? (
                      <div className="acoes-piquete">
                        {editandoId === p.id ? (
                          <>
                            <button className="botao-acao" onClick={(e) => { e.stopPropagation(); salvarForma(p.id); }}>Salvar forma</button>
                            <button className="botao-acao secundario" onClick={(e) => { e.stopPropagation(); cancelarForma(p); }}>Cancelar</button>
                          </>
                        ) : confirmarDesativarId === p.id ? (
                          <>
                            <span className="confirmar-desativacao">Desativar mesmo?</span>
                            <button className="botao-acao perigo" onClick={(e) => { e.stopPropagation(); desativar(p.id); }}>Sim</button>
                            <button className="botao-acao secundario" onClick={(e) => { e.stopPropagation(); setConfirmarDesativarId(null); }}>Não</button>
                          </>
                        ) : (
                          <>
                            <button className="botao-acao secundario" onClick={(e) => { e.stopPropagation(); editarForma(p.id); }}>Editar forma</button>
                            <button className="botao-acao perigo" onClick={(e) => { e.stopPropagation(); setConfirmarDesativarId(p.id); }}>Desativar</button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Mapa() {
  const { fazenda } = useFazenda();
  return fazenda ? <MapaDaFazenda key={fazenda.id} fazenda={fazenda} /> : null;
}
