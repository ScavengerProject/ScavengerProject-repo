import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "../components/ui/toast";
import { usuariosService, escolasService } from "../services/api";

const CadastroUsuario = () => {
    const navigate = useNavigate();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [loading, setLoading] = useState(false);

    // Multi-escola: o candidato precisa dizer em qual escola quer se cadastrar.
    // A lista vem do endpoint público (ele ainda não tem login).
    const [escolas, setEscolas] = useState([]);
    const [escolaId, setEscolaId] = useState("");

    useEffect(() => {
      let cancelado = false;

      escolasService
        .publicas()
        .then((lista) => {
          if (cancelado) return;
          const disponiveis = lista || [];
          setEscolas(disponiveis);
          // Com uma escola só, seleciona sozinho e o campo nem aparece.
          if (disponiveis.length === 1) {
            setEscolaId(disponiveis[0]._id);
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar escolas:", error);
          if (!cancelado) setEscolas([]);
        });

      return () => { cancelado = true; };
    }, []);

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

    if (!escolaId) {
      toast.error("Selecione a escola em que deseja se cadastrar");
      return;
    }

    setLoading(true);
    try {
      // O backend espera um objeto com a estrutura do Usuario,
      // mas sem os campos que sao preenchidos automaticamente (id, tipo, turma)
      const dadosParaEnviar = {
        nome: nome,
        email: email,
        telefone: telefone || null,
        tipo: "ALUNO",
        turma: null,
        senha: senha,
        status: "ATIVO",
        escola_id: escolaId
      };

      await usuariosService.registrar(dadosParaEnviar);
      toast.success("Cadastro efetuado com sucesso!");

      setNome("");
      setEmail("");
      setTelefone("");
      setSenha("");
      setConfirmacao("");

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
            {escolas.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="escola" className="text-gray-900 font-medium">
                  Escola
                </Label>
                <select
                  id="escola"
                  value={escolaId}
                  onChange={(event) => setEscolaId(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  disabled={loading}
                >
                  <option value="">Selecione sua escola</option>
                  {escolas.map((escola) => (
                    <option key={escola._id} value={escola._id}>
                      {escola.nome}{escola.cidade ? ` — ${escola.cidade}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-gray-900 font-medium">
                Telefone
              </Label>
              <Input
                id="telefone"
                type="telefone"
                placeholder="Ex: (00) 00000-0000"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
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