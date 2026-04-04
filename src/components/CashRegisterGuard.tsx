import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface CashRegisterGuardProps {
  children: React.ReactNode;
}

/**
 * CashRegisterGuard - Protege rutas que requieren caja abierta
 *
 * Redirige a /cash-register si no hay caja abierta.
 * La única excepción es la página de caja registradora y settings.
 */
const CashRegisterGuard: React.FC<CashRegisterGuardProps> = ({ children }) => {
  const { cashRegisterId } = useAuth();
  const location = useLocation();

  const allowedWithoutCashRegister = [
    '/cash-register',
    '/settings',
    '/employees',
  ];

  const isAllowedRoute = allowedWithoutCashRegister.some(route =>
    location.pathname.startsWith(route)
  );

  if (!cashRegisterId && !isAllowedRoute) {
    return <Navigate to="/cash-register" replace />;
  }

  return <>{children}</>;
};

export default CashRegisterGuard;
