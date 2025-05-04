import React from 'react';
import { Outlet } from 'react-router-dom'; // Outlet renders the child route components
import Navbar from './Navbar';
import Footer from './Footer';

function Layout() {
  return (
    <div className="flex flex-col min-h-screen"> {/* Ensures footer sticks to bottom */}
      <Navbar />
      {/* Main content area where routed pages will be displayed */}
      {/* 'flex-grow' makes this div take up available space */}
      <main className="flex-grow container mx-auto px-4">
        <Outlet /> {/* Child routes render here */}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;