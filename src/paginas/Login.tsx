// Tela de login (SPEC-009). Só aparece no modo API; o modo demonstração não pede senha.
import { useState, type FormEvent } from "react";
import { Marca } from "../componentes/ui/Icones";
import { entrar, mensagemDeErro } from "../lib/api";
import "./Login.css";

export default function Login({ aoEntrar, aviso }: { aoEntrar: () => void; aviso?: string | null }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      aoEntrar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="cartao login-cartao formulario" onSubmit={(e) => void enviar(e)}>
        <div className="login-marca">
          <Marca />
          <span>Maneja</span>
        </div>
        <p className="cartao-subtitulo">Entre para acompanhar os piquetes e o gado.</p>
        {aviso ? <p className="aviso-info" role="status">{aviso}</p> : null}
        <label className="campo">
          E-mail
          <input className="campo-entrada" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          Senha
          <input className="campo-entrada" type="password" autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro ? <p className="aviso-erro" role="alert">{erro}</p> : null}
        <button className="botao botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
