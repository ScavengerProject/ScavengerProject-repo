import React from 'react';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Resultados() {
  const { usuario, logout } = useAuth();

  return (
    <MainLayout usuario={usuario} onLogout={logout}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Resultados
          </h2>
          <p className="text-gray-600">
            Confira seus resultados e desempenho nas provas da gincana
          </p>
        </div>

        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              Em Desenvolvimento
            </CardTitle>
            <CardDescription className="text-gray-600">
              Esta funcionalidade estará disponível em breve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Em breve você poderá visualizar seus resultados e estatísticas detalhadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

