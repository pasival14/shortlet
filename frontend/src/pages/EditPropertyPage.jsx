// src/pages/EditPropertyPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPropertyById, updateProperty } from '../services/apiService';
import { useAuth } from '../context/AuthContext'; // For authorization context if needed

function EditPropertyPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth(); // Needed to ensure user is logged in

  // State for form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [listingState, setListingState] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [numBedrooms, setNumBedrooms] = useState('');
  const [numBathrooms, setNumBathrooms] = useState('');
  const [amenities, setAmenities] = useState('');
  const [powerBackup, setPowerBackup] = useState('');
  const [existingPhotos, setExistingPhotos] = useState([]); // To display existing photos

  // State for loading/submission
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch existing property data on mount
  useEffect(() => {
    const fetchPropertyData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getPropertyById(propertyId);
        const data = response.data;
        // Populate state with fetched data
        setTitle(data.title || '');
        setDescription(data.description || '');
        setAddress(data.address || '');
        setCity(data.city || '');
        setListingState(data.state || '');
        setPricePerNight(data.price_per_night?.toString() || ''); // Convert numbers to strings for input values
        setMaxGuests(data.max_guests?.toString() || '');
        setNumBedrooms(data.num_bedrooms?.toString() || '');
        setNumBathrooms(data.num_bathrooms?.toString() || '');
        setAmenities(Array.isArray(data.amenities) ? data.amenities.join(', ') : ''); // Join array back to string
        setPowerBackup(data.power_backup_details || '');
        setExistingPhotos(data.listing_photos || []);
      } catch (err) {
        setError('Failed to load property data for editing.');
        console.error("Fetch property error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPropertyData();
  }, [propertyId]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (!token) {
      setError("Authentication error.");
      return;
    }
    // Add validation for required fields if necessary...

    setIsUpdating(true);

    // --- Create FormData for PATCH ---
    // Even though we are not sending files now, the backend expects form-data
    // because the POST route uses it. Keep consistent or update backend PATCH.
    // Let's assume backend PATCH uses request.form
    const formData = new FormData();

    // Append ALL text fields (backend PATCH logic handles updating only changed ones based on presence)
    formData.append('title', title);
    formData.append('description', description);
    formData.append('address', address);
    formData.append('city', city);
    formData.append('state', listingState);
    formData.append('price_per_night', pricePerNight);
    formData.append('max_guests', maxGuests);
    formData.append('num_bedrooms', numBedrooms);
    formData.append('num_bathrooms', numBathrooms);
    formData.append('amenities', amenities); // Send as comma-separated string
    formData.append('power_backup_details', powerBackup);
     // NOTE: We are NOT sending listing_photos here, as this PATCH doesn't handle file updates yet.

    try {
      const response = await updateProperty(propertyId, formData);
      setSuccessMessage('Property updated successfully!');
      setTimeout(() => {
        // Redirect back to My Listings or the detail page
        navigate('/my-listings');
        // Or navigate(`/properties/${propertyId}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update property.');
      console.error("Update property error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading property data...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 mb-8 p-6 border rounded shadow-lg bg-white">
      <h1 className="text-2xl font-semibold mb-6 text-center">Edit Property</h1>
      {/* Re-use the form structure from CreateListingPage, but without file input/previews */}
      <form onSubmit={handleSubmit} className="space-y-4">
         {successMessage && <p className="text-green-600 bg-green-100 p-3 rounded text-center">{successMessage}</p>}
         {error && <p className="text-red-600 bg-red-100 p-3 rounded text-center">{error}</p>}

         {/* --- Input fields (same as CreateListingPage, bound to state here) --- */}
         {/* Title */}
         <div><label>Title*</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="..." /></div>
         {/* Description */}
         <div><label>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="..."></textarea></div>
         {/* Address */}
          <div><label>Address*</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="..." /></div>
         {/* City & State */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label>City*</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className="..."/></div>
             <div><label>State*</label><input type="text" value={listingState} onChange={(e) => setListingState(e.target.value)} required className="..."/></div>
         </div>
         {/* Price & Guests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label>Price per Night (₦)*</label><input type="number" value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} required min="0" step="0.01" className="..."/></div>
             <div><label>Max Guests*</label><input type="number" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} required min="1" step="1" className="..."/></div>
          </div>
         {/* Bed & Bath */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label>Bedrooms*</label><input type="number" value={numBedrooms} onChange={(e) => setNumBedrooms(e.target.value)} required min="0" step="1" className="..."/></div>
             <div><label>Bathrooms*</label><input type="number" value={numBathrooms} onChange={(e) => setNumBathrooms(e.target.value)} required min="0" step="0.5" className="..."/></div>
          </div>
         {/* Amenities */}
          <div><label>Amenities (comma-separated)</label><input type="text" value={amenities} onChange={(e) => setAmenities(e.target.value)} className="..." placeholder="e.g., WiFi, AC, Pool"/></div>
         {/* Power */}
          <div><label>Power Backup Details</label><input type="text" value={powerBackup} onChange={(e) => setPowerBackup(e.target.value)} className="..." placeholder="e.g., Generator 7pm-7am, 24/7 Inverter"/></div>

         {/* Display Existing Images (Read-only for now) */}
          {existingPhotos.length > 0 && (
             <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Images:</p>
                <div className="flex flex-wrap gap-2">
                    {existingPhotos.map((url, index) => (
                        <img key={index} src={url} alt={`Listing photo ${index + 1}`} className="h-20 w-20 object-cover rounded-md border" />
                    ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">Image editing/replacement not yet implemented.</p>
             </div>
          )}


         {/* Submit/Cancel Buttons */}
         <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => navigate('/my-listings')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
                Cancel
            </button>
            <button type="submit" disabled={isUpdating} className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
         </div>
      </form>
    </div>
  );
}

export default EditPropertyPage;