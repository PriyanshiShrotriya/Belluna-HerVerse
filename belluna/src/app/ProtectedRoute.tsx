
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './stubs/auth';
import { Loading } from '../components/States';
import { getProfileAccessState } from './profileAccess';
import { ProfileLoadError } from '../features/auth/AdultConfirmation';

export default function ProtectedRoute() {
  const {
    session, loading, profile, profileLoading, profileError, refreshProfile,
  } = useAuth();
  const loc = useLocation();
  const access = getProfileAccessState({
    authLoading: loading,
    userId: session?.userId ?? null,
    profile,
    profileLoading,
    profileError,
  });
  if (access === 'loading-auth' || access === 'loading-profile') return <Loading />;
  if (access === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (access === 'profile-error') {
    return <ProfileLoadError message={profileError} onRetry={async () => { await refreshProfile(); }} />;
  }
  if (access === 'confirmation-required') {
    return <Navigate to="/confirm-age" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}
