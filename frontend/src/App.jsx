import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css'; // Import your CSS file

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

// Import page components
import HomePage from './pages/HomePage';
import PropertiesListPage from './pages/PropertiesListPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CreateListingPage from './pages/CreateListingPage';
import HostBookingsPage from './pages/HostBookingsPage';
import MyTripsPage from './pages/MyTripsPage';
import DashboardPage from './pages/DashboardPage';
import EditProfilePage from './pages/EditProfilePage';
import MyListingsPage from './pages/MyListingsPage'; // Import new page
import EditPropertyPage from './pages/EditPropertyPage';
// import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      {/* Public routes within Layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="properties" element={<PropertiesListPage />} />
        <Route path="properties/:propertyId" element={<PropertyDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />

        {/* Protected Routes within Layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="create-listing" element={<CreateListingPage />} />
          <Route path="my-trips" element={<MyTripsPage />} />
          <Route path="host/bookings" element={<HostBookingsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="edit-profile" element={<EditProfilePage />} />
          <Route path="my-listings" element={<MyListingsPage />} />
          <Route path="edit-property/:propertyId" element={<EditPropertyPage />} />
        </Route>

        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Route>
    </Routes>
  );
}

export default App;