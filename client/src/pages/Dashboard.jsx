import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Trophy, Users, Bell, TrendingUp, Settings, LogOut } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Visão Geral das Atividades",
      description: "12 provas ativas no momento",
      icon: Trophy,
      value: "12",
      color: "text-blue-600",
    },
    {
      title: "Status da Gincana",
      description: "Em andamento - Dia 3 de 7",
      icon: TrendingUp,
      value: "43%",
      color: "text-blue-600",
    },
    {
      title: "Notificações Recentes",
      description: "5 novas atualizações",
      icon: Bell,
      value: "5",
      color: "text-blue-600",
    },
    {
      title: "Progresso das Equipes",
      description: "8 equipes participando",
      icon: Users,
      value: "8",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Gincana</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/provas")}
              className="border-gray-300 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Provas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Acompanhe o andamento da gincana em tempo real</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <CardDescription className="text-xs text-gray-600">
                  {stat.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Summary */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Próximas Provas</CardTitle>
              <CardDescription className="text-gray-600">
                Programadas para os próximos dias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Prova de Conhecimento</p>
                  <p className="text-sm text-gray-600">Amanhã, 14:00</p>
                </div>
                <span className="text-sm font-medium text-blue-600">100 pts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Gincana Esportiva</p>
                  <p className="text-sm text-gray-600">Sexta, 16:00</p>
                </div>
                <span className="text-sm font-medium text-blue-600">150 pts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Desafio Criativo</p>
                  <p className="text-sm text-gray-600">Sábado, 10:00</p>
                </div>
                <span className="text-sm font-medium text-blue-600">120 pts</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900">Ranking de Equipes</CardTitle>
              <CardDescription className="text-gray-600">
                Classificação atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-blue-600 text-lg">1º</span>
                  <div>
                    <p className="font-semibold text-gray-900">Equipe Alfa</p>
                    <p className="text-sm text-gray-600">580 pontos</p>
                  </div>
                </div>
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-lg">2º</span>
                  <div>
                    <p className="font-semibold text-gray-900">Equipe Beta</p>
                    <p className="text-sm text-gray-600">520 pontos</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-lg">3º</span>
                  <div>
                    <p className="font-semibold text-gray-900">Equipe Gama</p>
                    <p className="text-sm text-gray-600">495 pontos</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;