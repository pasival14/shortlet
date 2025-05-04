// src/pages/PropertyDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPropertyById, createBooking, getReviewsForProperty, getBookedDates } from '../services/apiService'; // Import createBooking
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { DateRange } from 'react-date-range'; // Import DateRange
import { addDays, format, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';

import 'react-date-range/dist/styles.css'; // Main style file
import 'react-date-range/dist/theme/default.css'; // Theme CSS file

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl; // Delete the problematic default getter

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});


// --- Leaflet Icon Fix (Common issue with build tools like Vite/Webpack) ---
// This ensures the default marker icon images are loaded correctly.
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';


const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
      stars.push(
          <span key={i} className={i <= rating ? 'text-yellow-500' : 'text-gray-300'}>
              ★
          </span>
      );
  }
  return <div className="flex">{stars}</div>;
};

function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth(); // Get auth state

  const [property, setProperty] = useState(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  const [propertyError, setPropertyError] = useState(null);

  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  // --- State for booked dates ---
  const [bookedDateRanges, setBookedDateRanges] = useState([]);
  const [disabledDates, setDisabledDates] = useState([]);

  // --- State for Booking ---
  const [numGuests, setNumGuests] = useState(1);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1), // Default to one day range
      key: 'selection'
    }
  ]);

  // Fetch property details on mount
  useEffect(() => {
    const fetchProperty = async () => {
      setIsLoadingProperty(true);
      setPropertyError(null);
      try {
        const response = await getPropertyById(propertyId);
        setProperty(response.data);
      } catch (err) {
        console.error("Error fetching property:", err);
        setPropertyError(err.response?.data?.description || err.message || 'Failed to load property details.');
      } finally {
        setIsLoadingProperty(false);
      }
    };
    fetchProperty();
  }, [propertyId]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!propertyId) return; // Don't fetch if ID isn't available yet
      setIsLoadingReviews(true);
      setReviewsError(null);
      try {
        const response = await getReviewsForProperty(propertyId);
        setReviews(response.data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setReviewsError("Could not load reviews for this property.");
      } finally {
        setIsLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [propertyId]); // Re-fetch if propertyId changes

  // --- useEffect to Fetch Booked Dates ---
  useEffect(() => {
    const fetchBooked = async () => {
      if (!propertyId) return;
      try {
        const response = await getBookedDates(propertyId);
        setBookedDateRanges(response.data); // Store the raw ranges [{startDate, endDate}]

        // --- Process ranges into individual disabled dates ---
        let datesToDisable = [];
        response.data.forEach(range => {
            try {
                // Parse ISO strings (YYYY-MM-DD) into Date objects
                // Use startOfDay to ignore time component issues
                const start = startOfDay(parseISO(range.startDate));
                // IMPORTANT: Check how your backend/DB stores end dates.
                // If check_out_date is the day *of* checkout (exclusive), use it directly.
                // If check_out_date means the *last night* stayed (inclusive), add a day for interval.
                // Assuming backend check_out_date is EXCLUSIVE (day of departure)
                 const end = startOfDay(parseISO(range.endDate));

                 // Generate dates *between* start (inclusive) and end (exclusive)
                if (end > start) {
                     datesToDisable = datesToDisable.concat(
                         eachDayOfInterval({ start: start, end: addDays(end, -1) }) // Get dates up to, but not including, check-out day
                     );
                }
             } catch (parseError) {
                 console.error("Error parsing booked date range:", range, parseError);
             }
        });
        setDisabledDates(datesToDisable);
        console.log("Disabled dates calculated:", datesToDisable); // Debug log

      } catch (err) {
        console.error("Error fetching booked dates:", err);
        // Don't necessarily show error to user, maybe just log it
      }
    };

    fetchBooked();
  }, [propertyId]); // Re-fetch if propertyId changes

  // --- Calculate Booking Details ---
  const checkInDate = dateRange[0].startDate;
  const checkOutDate = dateRange[0].endDate;
  let numNights = 0;
  let estimatedPrice = 0;

  if (checkInDate && checkOutDate && checkOutDate > checkInDate) {
    // Calculate difference in days
    const diffTime = Math.abs(checkOutDate - checkInDate);
    numNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (property) {
      estimatedPrice = numNights * property.price_per_night;
    }
  }

  // --- Handle Booking Request ---
  const handleBookingRequest = async () => {
    if (!isAuthenticated) {
      setBookingError("Please log in to request a booking.");
      // Optionally redirect: navigate('/login', { state: { from: location } });
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || numNights <= 0) {
        setBookingError("Please select valid check-in and check-out dates.");
        return;
    }
     if (numGuests <= 0) {
        setBookingError("Number of guests must be at least 1.");
        return;
    }
    if (property && numGuests > property.max_guests) {
         setBookingError(`Number of guests exceeds property capacity (${property.max_guests}).`);
         return;
    }


    setBookingError(null);
    setBookingSuccess('');
    setIsBookingLoading(true);

    const bookingData = {
      // Format dates to YYYY-MM-DD strings for the API
      check_in_date: format(checkInDate, 'yyyy-MM-dd'),
      check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
      num_guests: parseInt(numGuests) || 1,
    };

    try {
      const response = await createBooking(propertyId, bookingData);
      setBookingSuccess(response.data.message || "Booking request successful!");
      // Optionally clear form or redirect after success
    } catch (err) {
      console.error("Booking failed:", err);
      setBookingError(err.response?.data?.message || "Booking request failed. Please try again.");
    } finally {
      setIsBookingLoading(false);
    }
  };


  // --- Render Logic ---
  if (isLoadingProperty) return <div className="p-4 text-center">Loading property details...</div>;
  if (propertyError) return <div className="p-4 text-center text-red-600">Error: {propertyError}</div>;
  if (!property) return <div className="p-4 text-center">Property not found.</div>; // Should be handled by 404 ideally

  // Prepare map position if coordinates exist
  const mapPosition = property.latitude && property.longitude ? [property.latitude, property.longitude] : null;

  return (
    // --- Main Page Layout using Grid ---
    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* --- Column 1 & 2: Property Details & Reviews --- */}
        <div className="lg:col-span-2 space-y-6">
            {/* Property Info Section */}
            <div>
                {/* Property Title/Location */}
                <h1 className="text-3xl font-bold mb-1">{property.title}</h1>
                <p className="text-gray-600 mb-4">{property.address} - {property.city}, {property.state}</p>

                 {/* Image Display (Using first image for now) */}
                 {/* TODO: Replace with an image carousel/gallery component */}
                 {property.listing_photos && property.listing_photos.length > 0 ? (
                    <img
                        src={property.listing_photos[0]}
                        alt={`Main view of ${property.title}`}
                        className="w-full h-80 md:h-96 object-cover rounded-lg mb-4 shadow bg-gray-200" // Added bg color for loading phase
                    />
                 ) : (
                     <div className="w-full h-80 md:h-96 bg-gray-200 rounded-lg mb-4 shadow flex items-center justify-center text-gray-500">No Image Available</div>
                 )}

                {/* Description */}
                 <div className="mb-4">
                     <h3 className="font-semibold text-xl mb-2 border-b pb-1">Description</h3>
                     <p className="text-gray-800 whitespace-pre-wrap">{property.description || 'No description provided.'}</p>
                 </div>


                {/* Property Details Box */}
                <div className="bg-gray-50 p-4 rounded border">
                    <h3 className="font-semibold text-lg mb-2">Property Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <p><span className="font-medium">Max Guests:</span> {property.max_guests}</p>
                        <p><span className="font-medium">Bedrooms:</span> {property.num_bedrooms}</p>
                        <p><span className="font-medium">Bathrooms:</span> {property.num_bathrooms}</p>
                        <p className="col-span-2"><span className="font-medium">Power:</span> {property.power_backup_details || 'N/A'}</p>
                    </div>
                     {/* Amenities display */}
                     {property.amenities && property.amenities.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                            <p className="font-medium mb-1">Amenities:</p>
                            <ul className="list-disc list-inside text-sm grid grid-cols-2 gap-x-4">
                                {property.amenities.map((amenity, index) => <li key={index}>{amenity}</li>)}
                            </ul>
                        </div>
                     )}
                </div>
            </div>

            {/* --- Reviews Section --- */}
            <div className="border-t pt-6 mt-6">
                <h2 className="text-2xl font-semibold mb-4">Reviews ({reviews.length})</h2>
                {isLoadingReviews ? (
                    <p>Loading reviews...</p>
                ) : reviewsError ? (
                    <p className="text-red-500">{reviewsError}</p>
                ) : reviews.length === 0 ? (
                    <p className="text-gray-500">No reviews yet for this property.</p>
                ) : (
                    <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="border-b pb-4">
                            <div className="flex items-center mb-1 space-x-2">
                                <StarRating rating={review.rating} />
                                <span className="font-semibold">{review.author?.first_name || 'User'}</span>
                                <span className="text-gray-500 text-sm">
                                    {format(new Date(review.created_at), 'PPP')}
                                </span>
                            </div>
                            <p className="text-gray-700">{review.comment || 'No comment left.'}</p>
                        </div>
                    ))}
                    </div>
                )}
            </div>
             {/* --- End Reviews Section --- */}
        </div>


        {/* --- Column 3: Booking Form & Map --- */}
        {/* Make this column sticky on larger screens */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4 self-start">
             {/* Booking Section */}
            <div className="border rounded-lg p-4 md:p-6 shadow-md space-y-4 bg-white">
                <h2 className="text-xl font-semibold border-b pb-2">Request Booking</h2>
                <p className="text-xl font-bold">
                    ₦{property.price_per_night.toLocaleString()} <span className="font-normal text-base text-gray-500">/ night</span>
                </p>

                {/* Date Range Picker */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Dates</label>
                    <div className="overflow-x-auto"> {/* Allow horizontal scroll if calendar is too wide */}
                        <DateRange
                            editableDateInputs={true}
                            onChange={item => setDateRange([item.selection])}
                            moveRangeOnFirstSelection={false}
                            ranges={dateRange}
                            minDate={startOfDay(new Date())}
                            disabledDates={disabledDates} // Pass disabled dates
                            className="w-full sm:w-auto" // Adjust width if needed
                            months={1} // Show only one month
                            direction="vertical" // Or horizontal if preferred
                            showDateDisplay={false} // Hide the input display above calendar
                        />
                    </div>
                </div>

                {/* Number of Guests */}
                <div>
                    <label htmlFor="numGuests" className="block text-sm font-medium text-gray-700">Number of Guests</label>
                    <input
                        type="number"
                        id="numGuests"
                        value={numGuests}
                        onChange={(e) => setNumGuests(parseInt(e.target.value) || 1)}
                        min="1"
                        max={property.max_guests}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        required
                    />
                </div>

                {/* Booking Summary */}
                {numNights > 0 && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm space-y-1">
                        <div className="flex justify-between"><span>Check-in:</span> <span>{format(checkInDate, 'PPP')}</span></div>
                        <div className="flex justify-between"><span>Check-out:</span> <span>{format(checkOutDate, 'PPP')}</span></div>
                        <div className="flex justify-between"><span>Number of nights:</span> <span>{numNights}</span></div>
                        <div className="flex justify-between font-semibold mt-1 pt-1 border-t"><span>Estimated Price:</span> <span>₦{estimatedPrice.toLocaleString()}</span></div>
                    </div>
                )}

                {/* Booking Messages */}
                {bookingError && <p className="text-red-600 bg-red-100 p-3 rounded text-sm text-center">{bookingError}</p>}
                {bookingSuccess && <p className="text-green-600 bg-green-100 p-3 rounded text-sm text-center">{bookingSuccess}</p>}

                {/* Request Button */}
                <button
                    onClick={handleBookingRequest}
                    disabled={isBookingLoading || numNights <= 0 || !isAuthenticated} // Also disable if not authenticated
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isBookingLoading || numNights <= 0 || !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isBookingLoading ? 'Requesting...' : 'Request to Book'}
                </button>

                {/* Login Prompt */}
                {!isAuthenticated && (
                    <p className="text-center text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        You must be <Link to="/login" state={{ from: location }} className="underline font-medium">logged in</Link> to request a booking.
                    </p>
                )}
            </div>

             {/* --- Map Section --- */}
             {mapPosition ? (
                 <div className="border rounded-lg shadow-md overflow-hidden h-80"> {/* Set height! */}
                     <MapContainer
                          center={mapPosition}
                          zoom={14}
                          scrollWheelZoom={false}
                          style={{ height: '100%', width: '100%' }}
                      >
                         <TileLayer
                             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                         />
                         <Marker position={mapPosition}>
                             <Popup>
                                 {property.title} <br /> {property.address}
                             </Popup>
                         </Marker>
                     </MapContainer>
                 </div>
             ) : (
                 <div className="border rounded-lg p-4 shadow-md bg-gray-50 text-center text-gray-500 h-80 flex items-center justify-center">
                     Map location not available.
                 </div>
             )}
              {/* --- End Map Section --- */}

        </div> {/* End Column 3 */}
    </div> // End Main Grid
 );
}

export default PropertyDetailPage;