import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CashRegister from './pages/CashRegister';
import CashRegisterHistory from './pages/CashRegisterHistory';
import Tables from './pages/Tables';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Inventory from './pages/Inventory';
import Ingredients from './pages/Ingredients';
import Combos from './pages/Combos';
import Profile from './pages/Profile';
import ProfitReport from './pages/ProfitReport';
import Accounting from './pages/Accounting';

import { useAuth } from './hooks';

import ProtectedRoute from './components/ProtectedRoute';
import CashRegisterGuard from './components/CashRegisterGuard';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const { isAuthenticated, loading, cashRegisterId } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        </Route>

        <Route element={<ProtectedRoute><CashRegisterGuard><MainLayout /></CashRegisterGuard></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/cash-register" element={<CashRegister />} />
          <Route path="/cash-register-history" element={<CashRegisterHistory />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/combos" element={<Combos />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profit-report" element={<ProfitReport />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/settings/*" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated ? (cashRegisterId ? "/dashboard" : "/cash-register") : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Box>
  );
};

export default App;
