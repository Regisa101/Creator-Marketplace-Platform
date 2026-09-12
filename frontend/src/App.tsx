import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import { LoginCreator } from "./pages/auth/LoginCreator";
import { LoginBusiness } from "./pages/auth/LoginBusiness";
import { RegisterCreator } from "./pages/auth/RegisterCreator";
import { RegisterBusiness } from "./pages/auth/RegisterBusiness";
import { RoleSelect } from "./pages/auth/RoleSelect";

import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { CreatorOnboarding } from "./pages/onboarding/CreatorOnboarding";
import { BusinessOnboarding } from "./pages/onboarding/BusinessOnboarding";

import { CreatorProfile } from "./pages/CreatorProfile";
import { BusinessProfile } from "./pages/Businessprofile";
import { BusinessSettings } from "./pages/Settings";

import CampaignDetail from "./pages/Campaigndetail";

import {
  CampaignCreate,
  CampaignEdit,
} from "./pages/Campaignform";

import { CampaignBrowse } from "./pages/Campaignbrowse";

import { ApplicationsInbox } from "./pages/Applicationsinbox";
import { SavedCampaigns } from "./pages/Savedcampaigns";

import { BrandProfile } from "./pages/Brandprofile";
import { CreatorDiscovery } from "./pages/CreatorDiscovery";
import { CreatorPublicProfile } from "./pages/CreatorPublicProfile";

import { WorkspaceActive } from "./pages/workspace/WorkspaceActive";
import { WorkspaceDeliverables } from "./pages/workspace/WorkspaceDeliverables";
import { WorkspaceHistory } from "./pages/workspace/WorkspaceHistory";

import { PaymentReturn } from "./pages/workspace/PaymentReturn";
import { DemoPayment } from "./pages/workspace/DemoPayment";

import { Notifications } from "./pages/Notifications";

import Analytics from "./pages/Analytics";

/*
 * =========================================================
 * PROFILE ROUTER
 * =========================================================
 *
 * Both creators and businesses use:
 *
 * /profile
 *
 * The correct profile page is selected according
 * to the currently logged-in user's role.
 */

function ProfileRouter() {
  const { user } = useAuth();

  if (user?.role === "business") {
    return <BusinessProfile />;
  }

  return <CreatorProfile />;
}

/*
 * =========================================================
 * APP
 * =========================================================
 */

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* =================================================
              PUBLIC ROUTES
              ================================================= */}

          {/* Landing Page */}

          <Route
            path="/"
            element={<Landing />}
          />

          {/* Login */}

          <Route
            path="/login"
            element={<RoleSelect />}
          />

          <Route
            path="/register"
            element={<RoleSelect />}
          />

          <Route
            path="/login/creator"
            element={<LoginCreator />}
          />

          <Route
            path="/login/business"
            element={<LoginBusiness />}
          />

          <Route
            path="/register/creator"
            element={<RegisterCreator />}
          />

          <Route
            path="/register/business"
            element={<RegisterBusiness />}
          />

          {/* About */}

          <Route
            path="/about"
            element={
              <Navigate
                to="/#why-we-exist"
                replace
              />
            }
          />

          {/* Public Brand Profile */}

          <Route
            path="/brands/:businessId"
            element={<BrandProfile />}
          />

          {/* =================================================
              PUBLIC CAMPAIGN MARKETPLACE
              ================================================= */}

          {/*
           * IMPORTANT:
           *
           * Campaign browsing is PUBLIC.
           *
           * Visitors can browse campaigns without logging in.
           * Login is required only when they want to apply.
           */}

          <Route
            path="/campaigns"
            element={<CampaignBrowse />}
          />

          {/*
           * Campaign details are also PUBLIC.
           *
           * A visitor can view the campaign before deciding
           * whether to apply.
           */}

          <Route
            path="/campaigns/:id"
            element={<CampaignDetail />}
          />

          {/* =================================================
              ONBOARDING
              ================================================= */}

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

          {/* =================================================
              DASHBOARD
              ================================================= */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              PROFILE
              ================================================= */}

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileRouter />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              SETTINGS
              ================================================= */}

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <BusinessSettings />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              CAMPAIGN MANAGEMENT
              ================================================= */}

          {/*
           * Creating a campaign is protected.
           * Only logged-in users should access this page.
           */}

          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute>
                <CampaignCreate />
              </ProtectedRoute>
            }
          />

          {/*
           * Editing a campaign is protected.
           */}

          <Route
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <CampaignEdit />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              SAVED CAMPAIGNS
              ================================================= */}

          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedCampaigns />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              APPLICATIONS
              ================================================= */}

          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <ApplicationsInbox />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              CREATOR DISCOVERY
              ================================================= */}

          <Route
            path="/creators"
            element={
              <ProtectedRoute>
                <CreatorDiscovery />
              </ProtectedRoute>
            }
          />

          <Route
            path="/creators/:id"
            element={
              <ProtectedRoute>
                <CreatorPublicProfile />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              WORKSPACE
              
              Calendar has been completely removed.
              ================================================= */}

          <Route
            path="/workspace/active"
            element={
              <ProtectedRoute>
                <WorkspaceActive />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/deliverables"
            element={
              <ProtectedRoute>
                <WorkspaceDeliverables />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/history"
            element={
              <ProtectedRoute>
                <WorkspaceHistory />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              NOTIFICATIONS
              ================================================= */}

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              ANALYTICS
              ================================================= */}

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              PAYMENTS
              ================================================= */}

          <Route
            path="/payments/return"
            element={
              <ProtectedRoute>
                <PaymentReturn />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments/demo"
            element={
              <ProtectedRoute>
                <DemoPayment />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              FALLBACK
              ================================================= */}

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

export default App;