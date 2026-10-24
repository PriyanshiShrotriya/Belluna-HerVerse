import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './stubs/auth';
export default function ProtectedRoute() {
  const { session } = useAuth();
  const loc = useLocation();
  return session ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
