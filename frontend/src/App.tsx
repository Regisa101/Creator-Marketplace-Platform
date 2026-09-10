// frontend/src/App.tsx

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import { RoleSelect } from "./pages/auth/RoleSelect";
import { LoginCreator } from "./pages/auth/LoginCreator";
import { LoginBusiness } from "./pages/auth/LoginBusiness";
import { RegisterCreator } from "./pages/auth/RegisterCreator";
import { RegisterBusiness } from "./pages/auth/RegisterBusiness";

import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { CreatorOnboarding } from "./pages/onboarding/CreatorOnboarding";
import { BusinessOnboarding } from "./pages/onboarding/BusinessOnboarding";

import { CreatorProfile } from "./pages/CreatorProfile";
import { BusinessProfile } from "./pages/Businessprofile";
import { BusinessSettings } from "./pages/Settings";

import { CampaignDetail } from "./pages/Campaigndetail";
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
import { WorkspaceMessages } from "./pages/workspace/WorkspaceMessages";
import { WorkspaceCalendar } from "./pages/workspace/WorkspaceCalendar";
import { WorkspaceDeliverables } from "./pages/workspace/WorkspaceDeliverables";
import { WorkspaceHistory } from "./pages/workspace/WorkspaceHistory";

import { PaymentReturn } from "./pages/workspace/PaymentReturn";
import { DemoPayment } from "./pages/workspace/DemoPayment";

import { Notifications } from "./pages/Notifications";

/*
 * IMPORTANT:
 * Analytics.tsx has a default export:
 *
 * export default Analytics;
 *
 * Therefore this import is correct.
 */
import Analytics from "./pages/Analytics";

/*
 * ---------------------------------------------------------
 * PROFILE ROUTER
 * ---------------------------------------------------------
 *
 * Both creators and businesses use:
 *
 * /profile
 *
 * The correct profile page is selected based on the
 * currently logged-in user's role.
 */

function ProfileRouter() {
  const { user } = useAuth();

  if (user?.role === "business") {
    return <BusinessProfile />;
  }

  return <CreatorProfile />;
}

/*
 * ---------------------------------------------------------
 * APP
 * ---------------------------------------------------------
 */

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* =================================================
              PUBLIC ROUTES
              ================================================= */}

          <Route
            path="/"
            element={<Landing />}
          />

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

          <Route
            path="/brands/:businessId"
            element={<BrandProfile />}
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
              CAMPAIGNS
              ================================================= */}

          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <CampaignBrowse />
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
            path="/workspace/messages"
            element={
              <ProtectedRoute>
                <WorkspaceMessages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/calendar"
            element={
              <ProtectedRoute>
                <WorkspaceCalendar />
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
              CAMPAIGN ANALYTICS
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