import { Link, Outlet, useLocation } from "react-router";
import { useFazenda } from "../lib/fazenda";
import { Icone, Marca, type NomeIcone } from "./ui/Icones";
import "./Layout.css";

const LINKS: { para: string; texto: string; icone: NomeIcone }[] = [
  { para: "/mapa", texto: "Mapa", icone: "mapa" },
  { para: "/plano", texto: "Plano", icone: "plano" },
  { para: "/rebanho", texto: "Rebanho", icone: "clientes" },
  { para: "/historico", texto: "Histórico", icone: "relogio" },
  { para: "/dashboard", texto: "Dashboard", icone: "painel" },
  { para: "/fazenda", texto: "Fazenda", icone: "fazenda" },
];

export default function Layout() {
  const { usuario, fazenda } = useFazenda();
  const localizacao = useLocation();

  return (
    <div className="layout">
      <aside className="menu">
        <div className="menu-marca">
          <Marca />
          <span>Maneja · Admin</span>
        </div>
        <nav className="menu-links">
          {LINKS.map((item) => (
            <Link
              key={item.para}
              to={item.para}
              className={localizacao.pathname === item.para ? "menu-link ativo" : "menu-link"}
            >
              <Icone nome={item.icone} />
              <span>{item.texto}</span>
            </Link>
          ))}
        </nav>
        <div className="menu-rodape">
          <div className="menu-usuario">
            <span className="menu-avatar" aria-hidden="true">
              {usuario.nome.charAt(0).toUpperCase()}
            </span>
            <span className="menu-usuario-texto">
              <span className="menu-usuario-nome">{usuario.nome}</span>
              <span className="menu-usuario-fazenda">{fazenda.nome}</span>
            </span>
          </div>
        </div>
      </aside>
      <main className={localizacao.pathname === "/mapa" ? "conteudo conteudo-cheio" : "conteudo"}>
        <Outlet />
      </main>
    </div>
  );
}
