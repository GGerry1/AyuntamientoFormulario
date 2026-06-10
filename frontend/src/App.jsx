/**
 * App.jsx - Routes & Auth Guards
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages
import LandingPage from './pages/LandingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage'; // inscritos por curso
import StatisticsPage from './pages/StatisticsPage';
import ConfigPage from './pages/ConfigPage';
import InscriptionPage from './pages/InscriptionPage';
import CourseStatsPage from './pages/CourseStatsPage';
import PublicReportPage from './pages/PublicReportPage';
import ArchivedCoursesPage from './pages/ArchivedCoursesPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/admin" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0a0a14'
    }}>
      <div style={{ width: 48, height: 48, border: '3px solid #6c63ff',
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/inscripcion/:token" element={<InscriptionPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/cursos" element={
            <ProtectedRoute><CoursesPage /></ProtectedRoute>
          } />
          <Route path="/cursos/:id" element={
            <ProtectedRoute><CourseDetailPage /></ProtectedRoute>
          } />
          <Route path="/estadisticas" element={
            <ProtectedRoute><StatisticsPage /></ProtectedRoute>
          } />
          <Route path="/configuracion" element={
            <ProtectedRoute><ConfigPage /></ProtectedRoute>
          } />

          <Route path="/cursos-archivados" element={
            <ProtectedRoute>
            <ArchivedCoursesPage />
            </ProtectedRoute>
          }/>

          <Route path="/inscritos" element={
            <ProtectedRoute><CourseDetailPage /></ProtectedRoute>
          } />

          {/* Individual course stats */}
          <Route path="/estadisticas/curso/:nombre" element={
            <ProtectedRoute><CourseStatsPage /></ProtectedRoute>
          } />

          {/* Public shareable report - no auth */}
          <Route path="/reporte/:nombre" element={<PublicReportPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
