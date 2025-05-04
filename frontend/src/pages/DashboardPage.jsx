import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Use auth context directly
import { getProfile } from '../services/apiService'; // Use API service if context doesn't have all info

function DashboardPage() {
  const { user } = useAuth(); // Get basic user info from context first
  const [profileData, setProfileData] = useState(null); // More detailed profile if needed
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch detailed profile info if needed, or just use context user
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getProfile();
        setProfileData(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Could not load profile details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    // Alternatively, if context 'user' has everything:
    // setProfileData(user);
    // setIsLoading(false);

  }, []); // Fetch on mount

  if (isLoading) return <div className="p-4 text-center">Loading Dashboard...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  // Use 'profileData' if fetched, fallback to 'user' from context
   const displayUser = profileData || user;

   if (!displayUser) return <div className="p-4 text-center">Could not load user data.</div>;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Dashboard</h1>

      {/* Profile Summary Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6 border">
        <div className="flex items-center space-x-4 mb-4">
            {/* Basic Avatar Placeholder */}
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-bold">
                {displayUser.first_name?.[0]}{displayUser.last_name?.[0]}
            </div>
            <div>
                <h2 className="text-xl font-semibold">{displayUser.first_name} {displayUser.last_name}</h2>
                <p className="text-gray-600">{displayUser.email}</p>
                <p className="text-sm capitalize text-indigo-600 font-medium">{displayUser.user_type} Account</p>
            </div>
        </div>
        <Link
            to="/edit-profile"
            className="inline-block text-sm text-blue-600 hover:underline"
        >
            Edit Profile
        </Link>
      </div>

      {/* Quick Links Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* My Trips Card */}
        <Link to="/my-trips" className="block p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-1">My Trips</h3>
          <p className="text-sm text-gray-600">View your upcoming and past bookings.</p>
        </Link>

        {/* My Property Bookings Card */}
         <Link to="/host/bookings" className="block p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-1">My Property Bookings</h3>
          <p className="text-sm text-gray-600">Manage bookings for properties you host.</p>
        </Link>

        {/* List Property Card */}
         <Link to="/create-listing" className="block p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-1">List a New Property</h3>
          <p className="text-sm text-gray-600">Add your shortlet to our listings.</p>
        </Link>

        {/* --- My Listings Card --- */}
        <Link to="/my-listings" className="block p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg mb-1">My Property Listings</h3>
          <p className="text-sm text-gray-600">View, edit, or delete your listings.</p>
        </Link>
         
      </div>
    </div>
  );
}

export default DashboardPage;