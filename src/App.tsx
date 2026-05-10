import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './features/auth/components/LoginScreen';
import { RegisterScreen } from './features/auth/components/RegisterScreen';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { LandingPage } from './features/landing/components/LandingPage';
import './shared/styles/globals.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/*" element={<ProtectedRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
