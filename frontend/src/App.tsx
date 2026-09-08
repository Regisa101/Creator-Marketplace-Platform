// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleSelect } from './pages/auth/RoleSelect';
import { LoginCreator } from './pages/auth/LoginCreator';
import { LoginBusiness } from './pages/auth/LoginBusiness';
import { RegisterCreator } from './pages/auth/RegisterCreator';
import { RegisterBusiness } from './pages/auth/RegisterBusiness';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CreatorOnboarding } from './pages/onboarding/CreatorOnboarding';
import { BusinessOnboarding } from './pages/onboarding/BusinessOnboarding';
import { CreatorProfile } from './pages/CreatorProfile';
import { BusinessProfile } from './pages/Businessprofile';
import { BusinessSettings } from './pages/Settings';
import { CampaignDetail } from './pages/Campaigndetail';
import { CampaignCreate, CampaignEdit } from './pages/Campaignform';
import { CampaignBrowse } from './pages/Campaignbrowse';
import { ApplicationsInbox } from './pages/Applicationsinbox';
import { SavedCampaigns } from './pages/Savedcampaigns';
import { BrandProfile } from './pages/Brandprofile';

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
          <Route path="/login" element={<RoleSelect />} />
<Route path="/register" element={<RoleSelect />} />
<Route path="/login/creator" element={<LoginCreator />} />
<Route path="/login/business" element={<LoginBusiness />} />
<Route path="/register/creator" element={<RegisterCreator />} />
<Route path="/register/business" element={<RegisterBusiness />} />
          <Route path="/brands/:businessId" element={<BrandProfile />} />
          
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
            path="/settings"
            element={
              <ProtectedRoute>
                <BusinessSettings />
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
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedCampaigns />
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
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <CampaignEdit />
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