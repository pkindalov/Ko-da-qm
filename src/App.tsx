import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './features/auth/components/LoginScreen';
import { RegisterScreen } from './features/auth/components/RegisterScreen';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LandingPage } from './features/landing/components/LandingPage';
import { UserProfilePage } from './features/userProfile/components/UserProfilePage';
import './shared/styles/globals.css';

const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton duration={3000} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/user/:id" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/*" element={<ProtectedRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
