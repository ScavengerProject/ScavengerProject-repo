import React from "react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "../components/ui/toast";
import { useAuth } from "../hooks/useAuth.jsx";

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => { 
    e.preventDefault();
    
    if (!email || !senha) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      await login(email, senha);
      // Redirecionamento fica por conta das rotas (App.jsx)
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
    <Card className="w-full max-w-md shadow-lg border-gray-300">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold text-gray-900">Arena</CardTitle>
        <CardDescription className="text-gray-600">
          Entre com suas credenciais para acessar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-900 font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white border-gray-300 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha" className="text-gray-900 font-medium">
                Senha
              </Label>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Esqueceu a senha?
              </a>
            </div>
            <Input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="bg-white border-gray-300 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <div>
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <a href="/inscricao" className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                Cadastre-se
              </a>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
  );
};

export default Login;
