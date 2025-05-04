// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Navbar() {
  const { user, logout } = useAuth(); // Get user state and logout function

  return (
    <nav className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        {/* Brand/Logo */}
        <Link to="/" className="text-xl font-bold hover:text-gray-300">
          ShortletApp NG
        </Link>

        {/* Navigation Links */}
        <ul className="flex space-x-6">
          <li>
            <Link to="/" className="hover:text-gray-300">Home</Link>
          </li>
          <li>
            <Link to="/properties" className="hover:text-gray-300">Properties</Link>
          </li>
          {/* Conditionally show "Create Listing" link if user is logged in */}
          {user && (
              <li>
                  <Link to="/create-listing" className="hover:text-gray-300">List Property</Link> {/* Add this route later */}
              </li>
          )}
        </ul>

        {/* Auth Links / User Info */}
        <ul className="flex space-x-4 items-center">
          {user ? (
            // If user is logged in
            <>
               {/* <li className="text-sm">Welcome, {user.first_name}!</li> */}
               {/* Add dropdown or separate links for dashboard/bookings */}
               <li>
                  {/* Link the welcome message or add separate Dashboard link */}
                  <Link to="/dashboard" className="text-sm hover:text-gray-300">
                      Welcome, {user.first_name}!
                  </Link>
              </li>
               <li><Link to="/my-trips" className="hover:text-gray-300 text-sm">My Trips</Link></li>
               <li><Link to="/host/bookings" className="hover:text-gray-300 text-sm">My Property Bookings</Link></li>
               <li><button onClick={logout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm">Logout</button></li>
             </>
            ) : (
            // If user is logged out
            <>
              <li>
                <Link to="/login" className="hover:text-gray-300">Login</Link>
              </li>
              <li>
                <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded">Sign Up</Link>
              </li>
            </>
            )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;