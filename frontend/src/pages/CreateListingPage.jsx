import React, { useState, useEffect } from 'react'; // Need useEffect for cleanup
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To ensure user is logged in conceptually
import { createProperty } from '../services/apiService'; // API function

function CreateListingPage() {
  // State for TEXT form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [listingState, setListingState] = useState(''); // Renamed state variable to avoid conflict with React's state concept
  const [pricePerNight, setPricePerNight] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [numBedrooms, setNumBedrooms] = useState('');
  const [numBathrooms, setNumBathrooms] = useState('');
  const [amenities, setAmenities] = useState(''); // Still comma-separated for simplicity
  const [powerBackup, setPowerBackup] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // State for FILE form fields
  const [selectedFiles, setSelectedFiles] = useState([]); // Store File objects
  const [imagePreviews, setImagePreviews] = useState([]); // Store preview URLs (object URLs)

  // State for submission status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  const { token } = useAuth();

  // --- Handle File Selection ---
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files); // Convert FileList to Array
    const MAX_FILES = 5; // Example: Limit number of files
    const MAX_SIZE_MB = 5; // Example: 5MB size limit per file

    // Filter out files that exceed limits or invalid types
    const newFiles = [];
    const newPreviews = [];
    let fileError = null;

    files.forEach(file => {
        // Check if adding this file exceeds the total count
        if (selectedFiles.length + newFiles.length >= MAX_FILES) {
            fileError = `You can upload a maximum of ${MAX_FILES} images.`;
            return; // Stop processing more files from this selection
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            fileError = `File ${file.name} is too large (max ${MAX_SIZE_MB}MB).`;
            // Optionally skip just this file instead of stopping all: return;
            return;
        }
        if (!file.type.startsWith('image/')) {
            fileError = `File ${file.name} is not a valid image type.`;
            // Optionally skip just this file: return;
             return;
        }
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file)); // Create temporary preview URL
    });

    // Update state only if no errors occurred during processing this batch
    if (fileError) {
        setError(fileError);
    } else if (newFiles.length > 0) {
        setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
        setImagePreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
        setError(null); // Clear previous errors if new files are added successfully
    }

     // Clear the input value so the user can select the same file again if needed after removing it
     event.target.value = null;
  };

  // --- Handle Image Removal ---
   const removeImage = (indexToRemove) => {
      // Revoke the object URL to prevent memory leaks
      URL.revokeObjectURL(imagePreviews[indexToRemove]);
      // Filter out the image and its preview
      setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
      setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
   };

  // --- Cleanup Object URLs on Unmount ---
  useEffect(() => {
      // This function will be called when the component unmounts
      return () => {
          imagePreviews.forEach(url => URL.revokeObjectURL(url));
          console.log("Cleaned up image preview URLs.");
      };
  }, [imagePreviews]); // Dependency array includes imagePreviews


  // --- MODIFIED: Handle Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (!token) {
        setError("You must be logged in to create a listing.");
        return;
    }

    // --- Basic Validation for text fields ---
    if (!title || !address || !city || !listingState || !pricePerNight || !maxGuests || !numBedrooms || !numBathrooms) {
      setError('Please fill in all required fields marked with *.');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Please upload at least one image.');
      return;
    }
    // Add specific numeric validation if needed before creating FormData

    setIsLoading(true);

    // --- Create FormData ---
    const formData = new FormData();

    // Append text fields (matching backend expected keys from request.form)
    formData.append('title', title);
    formData.append('description', description);
    formData.append('address', address);
    formData.append('city', city);
    formData.append('state', listingState); // Use listingState variable
    formData.append('price_per_night', pricePerNight);
    formData.append('max_guests', maxGuests);
    formData.append('num_bedrooms', numBedrooms);
    formData.append('num_bathrooms', numBathrooms);
    formData.append('amenities', amenities); // Send as comma-separated string
    formData.append('power_backup_details', powerBackup);
    // Append latitude/longitude if available
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);

    // Append files
    selectedFiles.forEach((file) => {
        // Key MUST match what backend expects in request.files.getlist()
        formData.append('listing_photos', file);
    });

    // --- Send FormData ---
    try {
      // Pass FormData to API service - ensure apiService handles multipart/form-data header
      const response = await createProperty(formData);
      setSuccessMessage('Property created successfully!');

      // Clear form state on success
      setTitle('');
      setDescription('');
      setAddress('');
      setCity('');
      setListingState('');
      setPricePerNight('');
      setMaxGuests('');
      setNumBedrooms('');
      setNumBathrooms('');
      setAmenities('');
      setPowerBackup('');
      setLatitude('');
      setLongitude('');
      setSelectedFiles([]);
      // Revoke existing previews before clearing state
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);

      setTimeout(() => {
        navigate(`/properties/${response.data.property.id}`);
      }, 1500);
    } catch (err) {
      console.error("Error creating property:", err);
      const errorMsg = err.response?.data?.message || 'Failed to create property. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX Form Structure ---
  return (
    <div className="max-w-2xl mx-auto mt-8 mb-8 p-6 border rounded shadow-lg bg-white">
      <h1 className="text-2xl font-semibold mb-6 text-center">List Your Property</h1>
      {/* Use onSubmit on the form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Display Success/Error Messages */}
        {successMessage && <p className="text-green-600 bg-green-100 p-3 rounded text-center">{successMessage}</p>}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded text-center">{error}</p>}

        {/* --- Input Fields --- */}
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title*</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"></textarea>
        </div>

         {/* Address */}
         <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address*</label>
          <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
        </div>

         {/* City & State (Side-by-side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">City*</label>
                <input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
             <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">State*</label>
                {/* Changed state variable name to listingState */}
                <input type="text" id="state" value={listingState} onChange={(e) => setListingState(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
        </div>

        {/* Price & Max Guests (Side-by-side) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="pricePerNight" className="block text-sm font-medium text-gray-700">Price per Night (₦)*</label>
                <input type="number" id="pricePerNight" value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} required min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
             <div>
                <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700">Max Guests*</label>
                <input type="number" id="maxGuests" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} required min="1" step="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
        </div>

        {/* Bedrooms & Bathrooms (Side-by-side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="numBedrooms" className="block text-sm font-medium text-gray-700">Bedrooms*</label>
                <input type="number" id="numBedrooms" value={numBedrooms} onChange={(e) => setNumBedrooms(e.target.value)} required min="0" step="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
                <label htmlFor="numBathrooms" className="block text-sm font-medium text-gray-700">Bathrooms*</label>
                <input type="number" id="numBathrooms" value={numBathrooms} onChange={(e) => setNumBathrooms(e.target.value)} required min="0" step="0.5" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
        </div>

         {/* Amenities */}
        <div>
            <label htmlFor="amenities" className="block text-sm font-medium text-gray-700">Amenities (comma-separated)</label>
            <input type="text" id="amenities" value={amenities} onChange={(e) => setAmenities(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="e.g., WiFi, AC, Pool"/>
        </div>

        {/* Power Backup */}
        <div>
            <label htmlFor="powerBackup" className="block text-sm font-medium text-gray-700">Power Backup Details</label>
            <input type="text" id="powerBackup" value={powerBackup} onChange={(e) => setPowerBackup(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="e.g., Generator 7pm-7am, 24/7 Inverter"/>
        </div>

        {/* --- Lat/Lon Inputs --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">Latitude (Optional)</label>
                <input
                    type="number"
                    step="any" // Allows decimals
                    id="latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm"
                    placeholder="e.g., 6.4473"
                 />
            </div>
             <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">Longitude (Optional)</label>
                 <input
                    type="number"
                    step="any"
                    id="longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm"
                    placeholder="e.g., 3.4723"
                 />
            </div>
        </div>

         {/* --- File Input for Photos --- */}
         <div>
          <label htmlFor="photos" className="block text-sm font-medium text-gray-700">
            Property Photos (Max 5, 5MB each)*
          </label>
          <input
            type="file"
            id="photos"
            multiple // Allow multiple file selection
            accept="image/png, image/jpeg, image/jpg, image/webp" // Accept specific image types
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">Upload at least one image.</p>
        </div>

        {/* --- Image Previews --- */}
        {imagePreviews.length > 0 && (
            <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Images ({selectedFiles.length}/{5}):</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {imagePreviews.map((previewUrl, index) => (
                        <div key={previewUrl} className="relative group h-20 w-20"> {/* Added fixed size */}
                            <img src={previewUrl} alt={`Preview ${index + 1}`} className="h-full w-full object-cover rounded-md border" />
                            <button
                                type="button" // Important: Prevent form submission
                                onClick={() => removeImage(index)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-75 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                aria-label="Remove image"
                            >
                                X
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        {/* --- End Image Previews --- */}


        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating Listing...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateListingPage;