import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthCard } from './pages/Authcard';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CreatorOnboarding } from './pages/onboarding/CreatorOnboarding';
import { BusinessOnboarding } from './pages/onboarding/BusinessOnboarding';
import { CreatorProfile } from './pages/CreatorProfile';
import { BusinessProfile } from './pages/Businessprofile';
import { CampaignDetail } from './pages/Campaigndetail';
import { CampaignCreate } from './pages/Campaigncreate';
import { CampaignBrowse } from './pages/Campaignbrowse';
import { ApplicationsInbox } from './pages/Applicationsinbox';

// /profile renders the right page for whoever's logged in, so both
// roles share one URL (Dashboard.tsx's "Edit profile" link just points
// at /profile regardless of role) instead of needing two routes.
function ProfileRouter() {
  const { user } = useAuth();
  if (user?.role === 'business') return <BusinessProfile />;
  return <CreatorProfile />;
}

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
                <ProfileRouter />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignBrowse />
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <ApplicationsInbox />
              </ProtectedRoute>
            }
          />

          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute>
                <CampaignCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/campaigns/:id"
            element={
              <ProtectedRoute>
                <CampaignDetail />
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