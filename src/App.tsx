import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginScreen } from './features/auth/components/LoginScreen';
import { RegisterScreen } from './features/auth/components/RegisterScreen';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import './shared/styles/globals.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/*" element={<ProtectedRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
