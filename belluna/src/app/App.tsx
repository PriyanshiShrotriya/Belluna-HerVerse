import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../i18n/t';
import { AuthProvider } from './stubs/auth';
import ErrorBoundary from './ErrorBoundary';
import ProtectedRoute from './ProtectedRoute';
import Layout from '../components/Layout';
import Landing from '../features/landing/Landing';
import Dashboard from '../features/dashboard/Dashboard';
import AuthPage from '../features/auth/AuthPage';
import { ProfileLanguageProvider } from '../features/auth/ProfileLanguageProvider';
import Sos from '../features/sos/Sos';
import { SettingsPage } from '../features/misc/Misc';
import { Loading } from '../components/States';
import { useAuth } from './stubs/auth';

const Translator = lazy(() => import('../features/translator/Translator'));
const Doctors = lazy(() => import('../features/doctors/Doctors'));
const PeriodTracker = lazy(() => import('../features/tracker/PeriodTracker'));
const MedicineLibrary = lazy(() => import('../features/medicines/MedicineLibrary'));
const Awareness = lazy(() => import('../features/learn/Awareness'));
const Community = lazy(() => import('../features/community/Community'));

function Home() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return session ? <Dashboard /> : <Landing />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider><AuthProvider><ProfileLanguageProvider><BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/medicines" element={<MedicineLibrary />} />
              <Route path="/learn" element={<Awareness />} />
              <Route path="/learn/:slug" element={<Awareness />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/translator" element={<Translator />} />
                <Route path="/tracker" element={<PeriodTracker />} />
                <Route path="/tracker/history" element={<PeriodTracker />} />
                <Route path="/community" element={<Community />} />
                <Route path="/community/:slug" element={<Community />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Landing />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter></ProfileLanguageProvider></AuthProvider></I18nProvider>
    </ErrorBoundary>
  );
}
