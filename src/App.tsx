import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './features/auth/components/LoginScreen';
import { RegisterScreen } from './features/auth/components/RegisterScreen';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LandingPage } from './features/landing/components/LandingPage';
import { UserProfilePage } from './features/userProfile/components/UserProfilePage';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import './shared/styles/globals.css';

const queryClient = new QueryClient();
const TOAST_DURATION_MS = 3000;

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton duration={TOAST_DURATION_MS} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/user/:id" element={<ProtectedRoute><ErrorBoundary><UserProfilePage /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/*" element={<ProtectedRoute />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
