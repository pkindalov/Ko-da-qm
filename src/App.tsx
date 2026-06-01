import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import './shared/styles/globals.css';

const AppShell = lazy(() => import('./app/AppShell').then(m => ({ default: m.AppShell })));
const LoginScreen = lazy(() => import('./features/auth/components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const RegisterScreen = lazy(() => import('./features/auth/components/RegisterScreen').then(m => ({ default: m.RegisterScreen })));
const ResetPasswordScreen = lazy(() => import('./features/auth/components/ResetPasswordScreen').then(m => ({ default: m.ResetPasswordScreen })));
const LandingPage = lazy(() => import('./features/landing/components/LandingPage').then(m => ({ default: m.LandingPage })));
const FeaturesPage = lazy(() => import('./features/landing/components/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const HowItWorksPage = lazy(() => import('./features/landing/components/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const UserProfilePage = lazy(() => import('./features/userProfile/components/UserProfilePage').then(m => ({ default: m.UserProfilePage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
const TOAST_DURATION_MS = 3000;

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton duration={TOAST_DURATION_MS} />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/login" element={<ErrorBoundary><LoginScreen /></ErrorBoundary>} />
            <Route path="/register" element={<ErrorBoundary><RegisterScreen /></ErrorBoundary>} />
            <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordScreen /></ErrorBoundary>} />
            <Route path="/features" element={<ErrorBoundary><FeaturesPage /></ErrorBoundary>} />
            <Route path="/how-it-works" element={<ErrorBoundary><HowItWorksPage /></ErrorBoundary>} />
            <Route path="/user/:id" element={<ProtectedRoute><ErrorBoundary><UserProfilePage /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/:tab" element={<ProtectedRoute><ErrorBoundary><AppShell /></ErrorBoundary></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
