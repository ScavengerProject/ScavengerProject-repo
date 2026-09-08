import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "../components/ui/toast";
import { usuariosService } from "../services/api";
import { formatarTelefone } from "../lib/mascaras";

const CadastroUsuario = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [loading, setLoading] = useState(false);

    // Código de convite: substitui o antigo seletor de escola. Aceita
    // ?convite=XXX na URL (link/QR code enviado pela escola) já pré-preenchido.
    const [codigo, setCodigo] = useState(() => (searchParams.get("convite") || "").toUpperCase());

    // Críticas devolvidas pelo backend no envio. É uma LISTA porque o cadastro
    // apura todos os motivos de recusa de uma vez (código errado + email já
    // usado, por exemplo) — mostrar só o primeiro faria a pessoa reenviar o
    // formulário uma vez por erro para descobrir o que mais está errado.
    const [errosEnvio, setErrosEnvio] = useState([]);

    const handleSubmit = async (event) => {
    event.preventDefault();
    setErrosEnvio([]);

    // Validações campo a campo
    if (!nome.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }

    if (!email.trim()) {
      toast.error("Informe seu email");
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      toast.error("Informe um email válido");
      return;
    }

    if (!telefone.trim()) {
      toast.error("Informe seu telefone");
      return;
    }

    if (!senha) {
      toast.error("Crie uma senha");
      return;
    }

    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (!confirmacao) {
      toast.error("Confirme sua senha");
      return;
    }

    if (senha !== confirmacao) {
      toast.error("As senhas não conferem");
      return;
    }

    if (!codigo.trim()) {
      toast.error("Informe o código de convite da sua escola");
      return;
    }

    setLoading(true);
    try {
      const dadosParaEnviar = {
        nome,
        email,
        telefone: telefone || null,
        senha,
        codigo: codigo.trim(),
      };

      const resposta = await usuariosService.registrar(dadosParaEnviar);
      toast.success(resposta?.message || "Cadastro efetuado com sucesso!");

      setNome("");
      setEmail("");
      setTelefone("");
      setSenha("");
      setConfirmacao("");
      setCodigo("");
      setErrosEnvio([]);

      // Redireciona para a tela de login após o cadastro ser efetivado
      navigate("/login");
    } catch (error) {
      // `error.erros` (ver services/api.js) traz todas as críticas do cadastro;
      // erros sem lista (rede, 500) entram como uma mensagem só.
      const mensagens = error.erros?.length
        ? error.erros
        : [error.message || "Não foi possível concluir o cadastro"];
      setErrosEnvio(mensagens);
    } finally {
      setLoading(false);
    }
    };

    return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
      <Card className="w-full max-w-lg shadow-lg border-gray-300">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Criação de Conta</CardTitle>
          <CardDescription className="text-gray-600">
            Preencha os dados para solicitar acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-gray-900 font-medium">
                Nome completo
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="bg-white border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="bg-white border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-gray-900 font-medium">
                Código de convite
              </Label>
              <Input
                id="codigo"
                type="text"
                placeholder="Ex: A1B2C3D4"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value.toUpperCase())}
                className="bg-white border-gray-300 focus:ring-blue-500 uppercase"
                disabled={loading}
              />
              {/* Campo comum, de propósito: nada aqui diz se o código digitado
                  existe ou não. A conferência acontece só no envio, junto com o
                  resto do formulário. */}
              <p className="text-xs text-gray-500">
                Peça o código à sua escola. Ele diz automaticamente em qual escola (e turma) você
                vai entrar — não é mais possível escolher a escola livremente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-gray-900 font-medium">
                Telefone
              </Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(99) 9 9999-9999"
                value={telefone}
                onChange={(event) => setTelefone(formatarTelefone(event.target.value))}
                maxLength={17}
                className="bg-white border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-gray-900 font-medium">
                Senha
              </Label>
              <Input
                id="senha"
                type="password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="bg-white border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="space-y-2 pb-2">
              <Label htmlFor="confirmacao" className="text-gray-900 font-medium">
                Confirmar senha
              </Label>
              <Input
                id="confirmacao"
                type="password"
                placeholder="Repita a senha"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                className="bg-white border-gray-300 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            {errosEnvio.length > 0 && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errosEnvio.length === 1 ? (
                  <p className="font-medium">{errosEnvio[0]}</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 font-medium">
                    {errosEnvio.map((mensagem) => (
                      <li key={mensagem}>{mensagem}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Cadastrar Conta"}
            </Button>
            <div className="text-center">
              <p className="text-sm text-gray-600 text-left">
                Ja possui conta?{" "}
                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                  Entrar
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    );
};

export default CadastroUsuario;
