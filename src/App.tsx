import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LeadsProvider } from './context/LeadsContext'
import { NotificationProvider } from './context/NotificationContext'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './features/dashboard/Dashboard'
import { LeadList } from './features/leads/LeadList'
import { PipelineView } from './features/pipeline/PipelineView'
import { FollowupsView } from './features/followups/FollowupsView'
import { WorkingReport } from './features/reports/WorkingReport'
import { UsersView } from './features/users/UsersView'
import { LeadFormModal } from './features/leads/LeadFormModal'
import { AdminLogin } from './features/admin/AdminLogin'
import { LeadPage } from './features/leads/LeadPage'
import { TagsView } from './features/tags/TagsView'

// A wrapper component to provide the layout with Outlet for nested routes
function AuthenticatedLayout({ onAddLead }: { onAddLead: () => void }) {
  return (
    <AppLayout onAddLead={onAddLead}>
      <Outlet />
    </AppLayout>
  );
}

function AppContent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { isAdmin, user } = useAuth()

  return (
    <Router>
        <div className="animate-fadeIn h-full">
          <Routes>
            <Route path="/" element={<Navigate to={user ? (isAdmin ? "/admin/dashboard" : "/dashboard") : "/login"} replace />} />

            {/* Public/Standard Routes */}
            {user ? (
              <Route element={<AuthenticatedLayout onAddLead={() => setIsModalOpen(true)} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/contacts" element={<LeadList />} />
                <Route path="/contact/:id" element={<LeadPage />} />
                <Route path="/pipeline" element={<PipelineView />} />
                <Route path="/followups" element={<FollowupsView />} />
                <Route path="/tags" element={<TagsView />} />

                {/* Admin Routes */}
                {isAdmin && (
                  <>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/contacts" element={<LeadList />} />
                    <Route path="/admin/contact/:id" element={<LeadPage />} />
                    <Route path="/admin/pipeline" element={<PipelineView />} />
                    <Route path="/admin/followups" element={<FollowupsView />} />
                    <Route path="/admin/tags" element={<TagsView />} />
                    <Route path="/admin/report" element={<WorkingReport />} />
                    <Route path="/admin/users" element={<UsersView />} />
                  </>
                )}
                
                <Route
                  path="/report"
                  element={isAdmin ? <Navigate to="/admin/report" replace /> : <Navigate to="/login" replace />}
                />
                <Route
                  path="/users"
                  element={isAdmin ? <Navigate to="/admin/users" replace /> : <Navigate to="/login" replace />}
                />
                <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />} />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
            
            {/* The unified Login Route */}
            <Route path="/login" element={user ? <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace /> : <AdminLogin />} />
            
            {/* Redirect old admin-login to new login */}
            <Route path="/admin-login" element={<Navigate to="/login" replace />} />
            
          </Routes>
        </div>

        {isModalOpen && <LeadFormModal onClose={() => setIsModalOpen(false)} />}
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LeadsProvider>
          <AppContent />
        </LeadsProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
