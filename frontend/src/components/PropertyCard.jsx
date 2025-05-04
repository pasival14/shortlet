import React from 'react';
import { Link } from 'react-router-dom';

// Expects a 'property' object prop with details later
function PropertyCard({ property }) {

  // Placeholder data if property prop is not yet available
  const displayData = property || {
      id: 'N/A',
      title: 'Placeholder Property Title',
      city: 'Placeholder City',
      state: 'State',
      price_per_night: 0,
      listing_photos: [] // Use an empty array for photos initially
  };

  // Use a placeholder image if no photos are available
  const imageUrl = displayData.listing_photos && displayData.listing_photos.length > 0
      ? displayData.listing_photos[0] // Use the first photo URL
      : 'https://via.placeholder.com/300x200.png?text=Shortlet+Image'; // Placeholder

  return (
    <div className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <Link to={`/properties/${displayData.id}`}>
        <img
          src={imageUrl}
          alt={`View of ${displayData.title}`}
          className="w-full h-48 object-cover" // Fixed height, cover scaling
        />
        <div className="p-4">
          <h3 className="font-semibold text-lg truncate">{displayData.title}</h3>
          <p className="text-sm text-gray-600">{displayData.city}, {displayData.state}</p>
          <p className="mt-2 font-bold">
            ₦{displayData.price_per_night.toLocaleString()} <span className="font-normal text-sm text-gray-500">/ night</span>
          </p>
        </div>
      </Link>
    </div>
  );
}

export default PropertyCard;