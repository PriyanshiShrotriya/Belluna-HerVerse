
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './stubs/auth';
import { Loading } from '../components/States';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <Loading />;

  return session
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
