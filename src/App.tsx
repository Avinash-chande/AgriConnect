import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { FarmerRegistrationPage } from './pages/FarmerRegistrationPage';
import { WorkerRegistrationPage } from './pages/WorkerRegistrationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OTPVerificationPage } from './pages/OTPVerificationPage';

import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastContainer } from './components/common/Toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { PresenceProvider } from './context/PresenceContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ToastMessage } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Lazy-loaded pages for optimal bundle size & initial load speed
const CreateProfilePage = lazy(() =>
  import('./pages/CreateProfilePage').then((m) => ({ default: m.CreateProfilePage }))
);
const EditProfilePage = lazy(() =>
  import('./pages/EditProfilePage').then((m) => ({ default: m.EditProfilePage }))
);
const ViewProfilePage = lazy(() =>
  import('./pages/ViewProfilePage').then((m) => ({ default: m.ViewProfilePage }))
);
const PublicProfilePage = lazy(() =>
  import('./pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage }))
);
const FarmerProfilePage = lazy(() =>
  import('./pages/FarmerProfilePage').then((m) => ({ default: m.FarmerProfilePage }))
);
const WorkerProfilePage = lazy(() =>
  import('./pages/WorkerProfilePage').then((m) => ({ default: m.WorkerProfilePage }))
);
const EditJobPage = lazy(() =>
  import('./pages/EditJobPage').then((m) => ({ default: m.EditJobPage }))
);
const JobDetailsPage = lazy(() =>
  import('./pages/JobDetailsPage').then((m) => ({ default: m.JobDetailsPage }))
);
const SavedJobsPage = lazy(() =>
  import('./pages/SavedJobsPage').then((m) => ({ default: m.SavedJobsPage }))
);
const NearbyJobsPage = lazy(() =>
  import('./pages/NearbyJobsPage').then((m) => ({ default: m.NearbyJobsPage }))
);
const MapJobDiscoveryPage = lazy(() =>
  import('./pages/MapJobDiscoveryPage').then((m) => ({ default: m.MapJobDiscoveryPage }))
);
const NearbyWorkersPage = lazy(() =>
  import('./pages/NearbyWorkersPage').then((m) => ({ default: m.NearbyWorkersPage }))
);
const WorkerDiscoveryMapPage = lazy(() =>
  import('./pages/WorkerDiscoveryMapPage').then((m) => ({ default: m.WorkerDiscoveryMapPage }))
);
const RouteNavigationPage = lazy(() =>
  import('./pages/RouteNavigationPage').then((m) => ({ default: m.RouteNavigationPage }))
);
const FarmerJobDashboardPage = lazy(() =>
  import('./pages/FarmerJobDashboardPage').then((m) => ({ default: m.FarmerJobDashboardPage }))
);
const FarmerChatDashboardPage = lazy(() =>
  import('./pages/FarmerChatDashboardPage').then((m) => ({ default: m.FarmerChatDashboardPage }))
);
const WorkerJobFeedPage = lazy(() =>
  import('./pages/WorkerJobFeedPage').then((m) => ({ default: m.WorkerJobFeedPage }))
);
const MyApplicationsPage = lazy(() =>
  import('./pages/MyApplicationsPage').then((m) => ({ default: m.MyApplicationsPage }))
);
const FarmerApplicationsPage = lazy(() =>
  import('./pages/FarmerApplicationsPage').then((m) => ({ default: m.FarmerApplicationsPage }))
);
const FarmerApplicationDashboardPage = lazy(() =>
  import('./pages/FarmerApplicationDashboardPage').then((m) => ({ default: m.FarmerApplicationDashboardPage }))
);
const WorkerDashboardPage = lazy(() =>
  import('./pages/WorkerDashboardPage').then((m) => ({ default: m.WorkerDashboardPage }))
);
const WorkerCommunicationDashboardPage = lazy(() =>
  import('./pages/WorkerCommunicationDashboardPage').then((m) => ({ default: m.WorkerCommunicationDashboardPage }))
);
const ChatPage = lazy(() =>
  import('./pages/ChatPage').then((m) => ({ default: m.ChatPage }))
);
const AiAssistantPage = lazy(() =>
  import('./pages/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const PaymentHistoryPage = lazy(() =>
  import('./pages/PaymentHistoryPage').then((m) => ({ default: m.PaymentHistoryPage }))
);
const PaymentDetailsPage = lazy(() =>
  import('./pages/PaymentDetailsPage').then((m) => ({ default: m.PaymentDetailsPage }))
);
const SubscriptionManagementPage = lazy(() =>
  import('./pages/SubscriptionManagementPage').then((m) => ({ default: m.SubscriptionManagementPage }))
);

import { AiAssistantWidget } from './components/ai/AiAssistantWidget';

/**
 * Fallback Spinner for Suspense Lazy Loading
 */
const PageLoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
    <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-2xl">
      <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-semibold text-slate-300">Loading Page...</span>
    </div>
  </div>
);

export function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <PresenceProvider>
            <BrowserRouter>
        <div className="min-h-screen bg-agri-bg text-agri-text flex flex-col font-sans antialiased selection:bg-agri-light selection:text-agri-dark">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Public Authentication & Search Pages */}
              <Route path="/" element={<LandingPage addToast={addToast} />} />
              <Route path="/login" element={<LoginPage addToast={addToast} />} />
              <Route path="/register-farmer" element={<FarmerRegistrationPage addToast={addToast} />} />
              <Route path="/register-worker" element={<WorkerRegistrationPage addToast={addToast} />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage addToast={addToast} />} />
              <Route path="/verify-otp" element={<OTPVerificationPage addToast={addToast} />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/payment-history" element={<PaymentHistoryPage />} />
              <Route path="/payment-details/:transactionId" element={<PaymentDetailsPage />} />
              <Route path="/subscription" element={<SubscriptionManagementPage />} />

              {/* Worker Job Feed Routes */}
              <Route path="/jobs" element={<WorkerJobFeedPage />} />
              <Route path="/worker/feed" element={<WorkerJobFeedPage />} />
              <Route path="/jobs/map" element={<MapJobDiscoveryPage />} />
              <Route path="/jobs/map-discovery" element={<MapJobDiscoveryPage />} />

              {/* Public Profile & Job Details Routes */}
              <Route path="/profile/user/:identifier" element={<PublicProfilePage />} />
              <Route path="/jobs/:id" element={<JobDetailsPage />} />
              <Route path="/route-navigation" element={<RouteNavigationPage />} />

              {/* Farmer Job Management Dashboard */}
              <Route
                path="/farmer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <FarmerJobDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/applications"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <FarmerApplicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/application-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <FarmerApplicationDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/chat-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <FarmerChatDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/nearby-workers"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <NearbyWorkersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farmer/worker-map"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <WorkerDiscoveryMapPage />
                  </ProtectedRoute>
                }
              />

              {/* Saved Jobs Route (Worker Only) */}
              <Route
                path="/saved-jobs"
                element={
                  <ProtectedRoute allowedRoles={['Worker', 'worker']}>
                    <SavedJobsPage />
                  </ProtectedRoute>
                }
              />

              {/* My Applications Route (Worker Only) */}
              <Route
                path="/my-applications"
                element={
                  <ProtectedRoute allowedRoles={['Worker', 'worker']}>
                    <MyApplicationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Worker Dashboard */}
              <Route
                path="/worker/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Worker', 'worker']}>
                    <WorkerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/worker/communication-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Worker', 'worker']}>
                    <WorkerCommunicationDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Nearby Jobs Route */}
              <Route path="/jobs/nearby" element={<NearbyJobsPage />} />

              {/* Job Editing Route */}
              <Route
                path="/jobs/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer', 'Admin', 'admin']}>
                    <EditJobPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Profile Pages */}
              <Route
                path="/create-profile"
                element={
                  <ProtectedRoute>
                    <CreateProfilePage addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/edit-profile"
                element={
                  <ProtectedRoute>
                    <EditProfilePage addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile/me"
                element={
                  <ProtectedRoute>
                    <ViewProfilePage addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/farmer/profile"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer']}>
                    <FarmerProfilePage addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/worker/profile"
                element={
                  <ProtectedRoute allowedRoles={['Worker', 'worker']}>
                    <WorkerProfilePage addToast={addToast} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:conversationId"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated AgriConnect AI Workspace Route */}
              <Route
                path="/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AiAssistantPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Catch-all Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Floating AI Assistant Widget Accessible Anywhere */}
          <AiAssistantWidget />

          {/* Toast Notification Container */}
          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </div>
      </BrowserRouter>
    </PresenceProvider>
  </SocketProvider>
</QueryClientProvider>
</AuthProvider>
  );
}

export default App;
