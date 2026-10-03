import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Login } from './pages/auth/Login';
import { RoleSelect } from './pages/auth/RoleSelect';
import { RegisterCreator } from './pages/auth/RegisterCreator';
import { RegisterBusiness } from './pages/auth/RegisterBusiness';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { AboutUs } from './pages/AboutUs';

import { ProtectedRoute } from './components/ProtectedRoute';

import { CreatorOnboarding } from './pages/onboarding/CreatorOnboarding';
import { BusinessOnboarding } from './pages/onboarding/BusinessOnboarding';

import { CreatorProfile } from './pages/CreatorProfile';
import { BusinessProfile } from './pages/Businessprofile';
import { BusinessSettings } from './pages/Settings';

import CampaignDetail from './pages/Campaigndetail';
import { CampaignCreate, CampaignEdit } from './pages/Campaignform';
import { CampaignBrowse } from './pages/Campaignbrowse';
import { Campaigns } from './pages/Campaigns';

import { ApplicationsInbox } from './pages/Applicationsinbox';
import { MyApplications } from './pages/MyApplications';
import { SavedCampaigns } from './pages/Savedcampaigns';
import { BrandProfile } from './pages/Brandprofile';

/*
 * CreatorPublicProfile.tsx uses:
 *
 * export default function CreatorPublicProfile()
 *
 * Therefore this MUST be a default import.
 */
import CreatorPublicProfile from './pages/CreatorPublicProfile';

import { Notifications } from './pages/Notifications';

import PaymentReturn from './pages/PaymentReturn';

import { Dashboard } from './pages/Dashboard';
import { CreatorDashboard } from './pages/CreatorDashboard';
import AdminDashboard from './pages/AdminDashboard';

/*
 * Same component renders both "Contract History" (creator)
 * and "Collab History" (business).
 */
import { ContractHistory } from './pages/Contracthistory';
import ContractDetail from './pages/ContractDetail';


/* ============================================================
   PROFILE ROUTER
============================================================ */

function ProfileRouter() {
  const { user } = useAuth();

  if (user?.role === 'business') {
    return <BusinessProfile />;
  }

  return <CreatorProfile />;
}


/* ============================================================
   DASHBOARD ROUTER
============================================================ */

function ApplicationsRouter() {
  const { user } = useAuth();

  // Creators see their own applications with the landing navbar;
  // brands keep the applications inbox in the dashboard layout.
  return user?.role === 'creator' ? <MyApplications /> : <ApplicationsInbox />;
}


function CampaignsRouter() {
  const { user } = useAuth();

  // Brands manage their own campaigns in the dashboard layout; creators and
  // visitors browse campaigns with the landing page navbar.
  if (user?.role === 'business') {
    return <CampaignBrowse />;
  }

  return <Campaigns />;
}


/* ============================================================
   DASHBOARD ROUTER
============================================================ */

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'business') {
    return <Dashboard />;
  }

  if (user?.role === 'creator') {
    return <CreatorDashboard />;
  }

  return <Navigate to="/" replace />;
}


/* ============================================================
   APP
============================================================ */

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>

        <Routes>

          {/* ==================================================
              PUBLIC
          ================================================== */}

          <Route
            path="/"
            element={<Landing />}
          />

          <Route
            path="/pricing"
            element={<Pricing />}
          />

          {/* ==================================================
              ABOUT US
          ================================================== */}

          <Route
            path="/about"
            element={<AboutUs />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<RoleSelect />}
          />

          <Route
            path="/register/creator"
            element={<RegisterCreator />}
          />

          <Route
            path="/register/business"
            element={<RegisterBusiness />}
          />

           <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          <Route
            path="/login/creator"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          <Route
            path="/login/business"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />


          {/* ==================================================
              PUBLIC PROFILES
          ================================================== */}

          <Route
            path="/brands/:businessId"
            element={<BrandProfile />}
          />

          <Route
            path="/creators/:id"
            element={<CreatorPublicProfile />}
          />


          {/* ==================================================
              CAMPAIGNS
          ================================================== */}

          <Route
            path="/campaigns"
            element={<CampaignsRouter />}
          />

          <Route
            path="/campaigns/:id"
            element={<CampaignDetail />}
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


          {/* ==================================================
              ONBOARDING
          ================================================== */}

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


          {/* ==================================================
              DASHBOARD
          ================================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              PROFILE / SETTINGS
          ================================================== */}

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
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedCampaigns />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              APPLICATIONS
          ================================================== */}

          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <ApplicationsRouter />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              CONTRACT HISTORY
          ================================================== */}

          <Route
            path="/contracts/:contractId"
            element={
              <ProtectedRoute>
                <ContractDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <ContractHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/collab-history"
            element={
              <ProtectedRoute>
                <ContractHistory />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              REAL KHALTI PAYMENT RETURN
          ================================================== */}

          <Route
            path="/payments/return"
            element={
              <ProtectedRoute>
                <PaymentReturn />
              </ProtectedRoute>
            }
          />


          {/* ==================================================
              LEGACY ROUTES
          ================================================== */}

          <Route
            path="/workspace/*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/analytics"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/creators"
            element={
              <Navigate
                to="/applications"
                replace
              />
            }
          />


          {/* ==================================================
              FALLBACK
          ================================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>
    </BrowserRouter>
  );
}