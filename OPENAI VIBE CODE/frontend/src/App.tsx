import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Customer pages
import { CustomerChatPage } from './pages/customer/CustomerChatPage';
import { CustomerDocumentsPage } from './pages/customer/CustomerDocumentsPage';
import { CustomerTicketsPage } from './pages/customer/CustomerTicketsPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';

// Employee pages
import { EmployeeDashboardPage } from './pages/employee/EmployeeDashboardPage';
import { EmployeeTicketsPage } from './pages/employee/EmployeeTicketsPage';
import { EmployeeKnowledgePage } from './pages/employee/EmployeeKnowledgePage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminKnowledgePage } from './pages/admin/AdminKnowledgePage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Customer Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['customer', 'employee', 'admin']} />}>
              <Route path="/chat" element={<CustomerChatPage />} />
              <Route path="/documents" element={<CustomerDocumentsPage />} />
              <Route path="/tickets" element={<CustomerTicketsPage />} />
              <Route path="/profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Employee Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['employee', 'admin']} />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee/tickets" element={<EmployeeTicketsPage />} />
              <Route path="/employee/knowledge" element={<EmployeeKnowledgePage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/knowledge" element={<AdminKnowledgePage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
