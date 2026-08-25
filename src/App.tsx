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
      staleTime: 5 * 60 * 1000, // 5 minutes fresh data
      gcTime: 10 * 60 * 1000,    // 10 minutes garbage collection
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
const WorkerVerificationPage = lazy(() =>
  import('./pages/WorkerVerificationPage').then((m) => ({ default: m.WorkerVerificationPage }))
);
const CreateJobPage = lazy(() =>
  import('./pages/CreateJobPage').then((m) => ({ default: m.CreateJobPage }))
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

// Phase 10 — Lazy Loaded Admin Panel Pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminUserManagementPage = lazy(() => import('./pages/admin/AdminUserManagementPage').then((m) => ({ default: m.AdminUserManagementPage })));
const AdminJobModerationPage = lazy(() => import('./pages/admin/AdminJobModerationPage').then((m) => ({ default: m.AdminJobModerationPage })));
const AdminApplicationMonitorPage = lazy(() => import('./pages/admin/AdminApplicationMonitorPage').then((m) => ({ default: m.AdminApplicationMonitorPage })));
const AdminTrustVerificationPage = lazy(() => import('./pages/admin/AdminTrustVerificationPage').then((m) => ({ default: m.AdminTrustVerificationPage })));
const AdminCertificateVerificationPage = lazy(() => import('./pages/admin/AdminCertificateVerificationPage').then((m) => ({ default: m.AdminCertificateVerificationPage })));
const AdminAadhaarKycPage = lazy(() => import('./pages/admin/AdminAadhaarKycPage').then((m) => ({ default: m.AdminAadhaarKycPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminPaymentManagementPage = lazy(() => import('./pages/admin/AdminPaymentManagementPage').then((m) => ({ default: m.AdminPaymentManagementPage })));
const AdminPremiumManagementPage = lazy(() => import('./pages/admin/AdminPremiumManagementPage').then((m) => ({ default: m.AdminPremiumManagementPage })));
const AdminRoleManagementPage = lazy(() => import('./pages/admin/AdminRoleManagementPage').then((m) => ({ default: m.AdminRoleManagementPage })));
const AdminPlatformSettingsPage = lazy(() => import('./pages/admin/AdminPlatformSettingsPage').then((m) => ({ default: m.AdminPlatformSettingsPage })));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })));

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

              {/* Worker Verification Profile Route */}
              <Route
                path="/verification"
                element={
                  <ProtectedRoute>
                    <WorkerVerificationPage />
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

              {/* Job Creation Routes */}
              <Route
                path="/farmer/jobs/create"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer', 'Admin', 'admin']}>
                    <CreateJobPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/jobs/create"
                element={
                  <ProtectedRoute allowedRoles={['Farmer', 'farmer', 'Admin', 'admin']}>
                    <CreateJobPage />
                  </ProtectedRoute>
                }
              />

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

              {/* Phase 10 — Admin Panel Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminUserManagementPage /></ProtectedRoute>} />
              <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminJobModerationPage /></ProtectedRoute>} />
              <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminApplicationMonitorPage /></ProtectedRoute>} />
              <Route path="/admin/trust" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminTrustVerificationPage /></ProtectedRoute>} />
              <Route path="/admin/certificates" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminCertificateVerificationPage /></ProtectedRoute>} />
              <Route path="/admin/aadhaar-kyc" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminAadhaarKycPage /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminReportsPage /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminPaymentManagementPage /></ProtectedRoute>} />
              <Route path="/admin/premium" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminPremiumManagementPage /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminRoleManagementPage /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminPlatformSettingsPage /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminAuditLogsPage /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['Admin', 'admin']}><AdminNotificationsPage /></ProtectedRoute>} />

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
