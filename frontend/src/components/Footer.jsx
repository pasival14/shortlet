import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear(); // Get current year dynamically

  return (
    <footer className="bg-gray-100 text-gray-600 p-4 mt-8 border-t border-gray-300">
      <div className="container mx-auto text-center text-sm">
        &copy; {currentYear} ShortletApp NG. All rights reserved.
        {/* You can add more footer links or info here */}
      </div>
    </footer>
  );
}

export default Footer;