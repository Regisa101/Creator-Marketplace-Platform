import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/auth/Login';
import { RoleSelect } from './pages/auth/RoleSelect';
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
import CampaignDetail from './pages/Campaigndetail';
import { CampaignCreate, CampaignEdit } from './pages/Campaignform';
import { CampaignBrowse } from './pages/Campaignbrowse';
import { ApplicationsInbox } from './pages/Applicationsinbox';
import { SavedCampaigns } from './pages/Savedcampaigns';
import { BrandProfile } from './pages/Brandprofile';
import { CreatorDiscovery } from './pages/CreatorDiscovery';
import { CreatorPublicProfile } from './pages/CreatorPublicProfile';
import { WorkspaceActive } from './pages/workspace/WorkspaceActive';
import { WorkspaceDeliverables } from './pages/workspace/WorkspaceDeliverables';
import { WorkspaceHistory } from './pages/workspace/WorkspaceHistory';
import { PaymentReturn } from './pages/workspace/PaymentReturn';
import { DemoPayment } from './pages/workspace/DemoPayment';
import { Notifications } from './pages/Notifications';
import Analytics from './pages/Analytics';
import Campaigns from "./pages/Campaigns";

function ProfileRouter() {
  const { user } = useAuth();
  return user?.role === 'business' ? <BusinessProfile /> : <CreatorProfile />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* One login page. The API determines creator vs business from the account. */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RoleSelect />} />
          <Route path="/login/creator" element={<Navigate to="/login" replace />} />
          <Route path="/login/business" element={<Navigate to="/login" replace />} />
          <Route path="/register/creator" element={<RegisterCreator />} />
          <Route path="/register/business" element={<RegisterBusiness />} />

          <Route path="/about" element={<Navigate to="/#why-we-exist" replace />} />
          <Route path="/brands/:businessId" element={<BrandProfile />} />

          {/* Campaign marketplace is public; applying is protected inside the detail page. */}
          <Route path="/campaigns" element={<CampaignBrowse />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />

          <Route path="/onboarding/creator" element={<ProtectedRoute><CreatorOnboarding /></ProtectedRoute>} />
          <Route path="/onboarding/business" element={<ProtectedRoute><BusinessOnboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileRouter /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><BusinessSettings /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute><SavedCampaigns /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><ApplicationsInbox /></ProtectedRoute>} />
          <Route path="/campaigns/new" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
          <Route path="/campaigns/:id/edit" element={<ProtectedRoute><CampaignEdit /></ProtectedRoute>} />

          <Route path="/creators" element={<ProtectedRoute><CreatorDiscovery /></ProtectedRoute>} />
          <Route path="/creators/:id" element={<CreatorPublicProfile />} />

          <Route path="/workspace" element={<ProtectedRoute><WorkspaceActive /></ProtectedRoute>} />
          <Route path="/workspace/deliverables" element={<ProtectedRoute><WorkspaceDeliverables /></ProtectedRoute>} />
          <Route path="/workspace/history" element={<ProtectedRoute><WorkspaceHistory /></ProtectedRoute>} />
          <Route path="/workspace/payment-return" element={<ProtectedRoute><PaymentReturn /></ProtectedRoute>} />
          <Route path="/workspace/demo-payment" element={<ProtectedRoute><DemoPayment /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

          <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
          <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
          <Route path="/campaigns/:id/edit" element={<ProtectedRoute><CampaignEdit /></ProtectedRoute>} />

          {/* Catch-all route for undefined paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
} 
        
