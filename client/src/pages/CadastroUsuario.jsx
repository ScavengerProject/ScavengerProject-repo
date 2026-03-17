import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "../components/ui/toast";
import { usuariosService } from "../services/api";

const CadastroUsuario = () => {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [telefone, setTelefone] = useState("");
    const [matricula, setMatricula] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
    event.preventDefault();

    if (!nome || !email || !telefone || !matricula || !senha || !confirmacao) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (senha !== confirmacao) {
      toast.error("As senhas nao conferem");
      return;
    }

    setLoading(true);
    try {
      // O backend espera um objeto com a estrutura do Usuario,
      // mas sem os campos que sao preenchidos automaticamente (id, telefone, tipo, turma)
      const dadosParaEnviar = {
        nome: nome,
        email: email,
        telefone: telefone || null,
        tipo: "ALUNO",
        turma: null,
        matricula: matricula || null,
        senha: senha,
        status: "ATIVO"
      };

      await usuariosService.registrar(dadosParaEnviar);
      toast.success("Cadastro enviado para aprovacao");

      setNome("");
      setEmail("");
      setTelefone("");
      setMatricula("");
      setSenha("");
      setConfirmacao("");
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
              <Label htmlFor="matricula" className="text-gray-900 font-medium">
                Matricula
              </Label>
              <Input
                id="matricula"
                type="number"
                placeholder="Ex: 2310102067"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
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