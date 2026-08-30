import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthCard } from './pages/Authcard';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CreatorOnboarding } from './pages/onboarding/CreatorOnboarding';
import { BusinessOnboarding } from './pages/onboarding/BusinessOnboarding';
import { CreatorProfile } from './pages/CreatorProfile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthCard />} />
          <Route path="/register" element={<AuthCard />} />
          
          {/* Onboarding Routes */}
          <Route
            path="/onboarding/creator"
            element={
              <ProtectedRoute>
                <CreatorOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/business"
            element={
              <ProtectedRoute>
                <BusinessOnboarding />
              </ProtectedRoute>
            }
          />
          
          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <CreatorProfile />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;