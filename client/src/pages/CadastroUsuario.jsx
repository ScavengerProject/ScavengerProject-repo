import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "../components/ui/toast";
import { usuariosService, convitesService } from "../services/api";
import { formatarTelefone } from "../lib/mascaras";

// Tempo de debounce da pré-validação do código: espera o usuário parar de
// digitar antes de consultar o backend (a rota é rate-limitada).
const DEBOUNCE_PREVALIDACAO_MS = 400;

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
    const [prevalidacao, setPrevalidacao] = useState(null); // { escola_nome, turma }
    const [prevalidando, setPrevalidando] = useState(false);
    const [erroCodigo, setErroCodigo] = useState("");

    // Pré-validação com debounce: confirma "Você está entrando na Escola X —
    // 6º Ano" antes do candidato preencher o resto do formulário, sem revelar
    // nada além do que o backend expõe publicamente (GET /convites/:codigo).
    useEffect(() => {
      const codigoLimpo = codigo.trim();
      setPrevalidacao(null);
      setErroCodigo("");

      if (!codigoLimpo) {
        setPrevalidando(false);
        return;
      }

      setPrevalidando(true);
      const timer = setTimeout(() => {
        convitesService
          .prevalidar(codigoLimpo)
          .then((dados) => {
            setPrevalidacao(dados);
          })
          .catch((error) => {
            setErroCodigo(error.message || "Código de convite inválido ou expirado.");
          })
          .finally(() => setPrevalidando(false));
      }, DEBOUNCE_PREVALIDACAO_MS);

      return () => clearTimeout(timer);
    }, [codigo]);

    const handleSubmit = async (event) => {
    event.preventDefault();

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

      // Redireciona para a tela de login após o cadastro ser efetivado
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Não foi possível concluir o cadastro");
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
              <p className="text-xs text-gray-500">
                Peça o código à sua escola. Ele diz automaticamente em qual escola (e turma) você
                vai entrar — não é mais possível escolher a escola livremente.
              </p>
              {prevalidando && (
                <p className="text-xs text-gray-600">Verificando código...</p>
              )}
              {!prevalidando && prevalidacao && (
                <p className="text-xs text-green-700 font-medium">
                  Você está entrando na Escola {prevalidacao.escola_nome}
                  {prevalidacao.turma ? ` — ${prevalidacao.turma}` : " — aguardando aprovação da escola (sem turma de código próprio)"}
                </p>
              )}
              {!prevalidando && !prevalidacao && erroCodigo && (
                <p className="text-xs text-red-600 font-medium">{erroCodigo}</p>
              )}
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
