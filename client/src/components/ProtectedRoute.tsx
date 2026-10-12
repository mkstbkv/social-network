import React from 'react';
import { Navigate, Outlet } from 'react-router';

interface ProtectedRouteProps {
  token: string | null;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token }) => {
  // Если токена нет, перенаправляем на логин
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Если токен есть, рендерим дочерние маршруты
  return <Outlet />;
};
