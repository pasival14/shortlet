import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth(); // Use isAuthenticated flag from context
  const location = useLocation(); // Get current location

  // Optional: Show a loading indicator while auth status is being determined
  // This avoids flashing the login page briefly if auth state loads slowly
  if (isLoading && !isAuthenticated) { // Check isLoading specifically if you added it
       return <div>Loading authentication status...</div>; // Or a spinner
  }


  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to in state so we can send them back there after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child route's component via <Outlet>
  return <Outlet />;
}

export default ProtectedRoute;