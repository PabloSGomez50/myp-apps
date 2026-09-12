import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/modules/core/pages/LoginPage';
import { FinanzasDashboard } from '@/modules/finanzas/pages/FinanzasDashboard';
import { MovimientosPage } from '@/modules/finanzas/pages/MovimientosPage';
import { InversionesPage } from '@/modules/finanzas/pages/InversionesPage';
import { ShoppingListPage } from '@/modules/finanzas/pages/ShoppingListPage';
import { InventarioPage } from '@/modules/inventario/pages/InventarioPage';
import { HogarPage } from '@/modules/core/pages/HogarPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/finanzas" replace />} />
              <Route path="finanzas" element={<FinanzasDashboard />} />
              <Route path="finanzas/movimientos" element={<MovimientosPage />} />
              <Route path="finanzas/inversiones" element={<InversionesPage />} />
              <Route path="finanzas/shopping" element={<ShoppingListPage />} />
              <Route path="inventario" element={<InventarioPage />} />
              <Route path="hogar" element={<HogarPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

