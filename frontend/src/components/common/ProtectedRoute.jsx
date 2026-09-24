import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/firebase';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-forest-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // AuthContext's `isAuthenticated` only updates once Firebase's onAuthStateChanged
  // listener fires — an async callback that can land a tick after navigating here
  // right after a successful login. Firebase's own `auth.currentUser` is already
  // set synchronously by that point, so it's used as a fallback to avoid bouncing
  // a just-logged-in user straight back to /login on their first attempt.
  const reallyAuthenticated = isAuthenticated || !!auth.currentUser;

  if (!reallyAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && userRole !== requiredRole) {
  return <Navigate to="/login" replace />;
}

  return children;
};

export default ProtectedRoute;