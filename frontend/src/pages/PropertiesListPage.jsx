// src/pages/PropertiesListPage.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { getProperties } from '../services/apiService';
import PropertyCard from '../components/PropertyCard';
import { format, addDays } from 'date-fns';

function PropertiesListPage() {
  // State for fetched properties
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State for Filter Inputs ---
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [minBedroomsFilter, setMinBedroomsFilter] = useState('');
  const [minGuestsFilter, setMinGuestsFilter] = useState('');

  const [checkInFilter, setCheckInFilter] = useState('');
  const [checkOutFilter, setCheckOutFilter] = useState('');

  // --- State for Applied Filters ---
  // This triggers the useEffect when the user actually searches
  const [appliedFilters, setAppliedFilters] = useState({});

  // --- Function to Fetch Properties ---
  // Use useCallback to memoize the function, preventing unnecessary runs if dependencies don't change
   const fetchProperties = useCallback(async () => {
    console.log("Fetching properties with filters:", appliedFilters); // Debug log
    setIsLoading(true);
    setError(null);
    try {
      // Pass only non-empty applied filters to the API service
      const activeFilters = {};
      for (const key in appliedFilters) {
        if (appliedFilters[key] !== '' && appliedFilters[key] !== null && appliedFilters[key] !== undefined) {
            activeFilters[key] = appliedFilters[key];
        }
      }
      const response = await getProperties(activeFilters); // Pass active filters
      setProperties(response.data);
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError(err.response?.data?.description || err.message || 'Failed to fetch properties.');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]); // Depend on appliedFilters state

  // --- Effect to fetch data when appliedFilters change ---
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]); // fetchProperties is memoized by useCallback

  // --- Handler for Search/Apply Filters Button ---
  const handleSearch = (e) => {
    e.preventDefault();
    // Basic date validation
    if (checkInFilter && checkOutFilter && checkOutFilter <= checkInFilter) {
        setError("Check-out date must be after check-in date.");
        return;
    }
     setError(null); // Clear previous errors

    const newFilters = {
        city: cityFilter,
        state: stateFilter,
        min_price: minPriceFilter,
        max_price: maxPriceFilter,
        min_bedrooms: minBedroomsFilter,
        min_guests: minGuestsFilter,
        // --- ADD DATES ---
        check_in: checkInFilter || undefined, // Send only if set, use names backend expects
        check_out: checkOutFilter || undefined,
    };
    // Remove undefined keys before setting state
    Object.keys(newFilters).forEach(key => newFilters[key] === undefined && delete newFilters[key]);
    setAppliedFilters(newFilters);
  };

  const clearFilters = () => {
        setCityFilter('');
        setStateFilter('');
        setMinPriceFilter('');
        setMaxPriceFilter('');
        setMinBedroomsFilter('');
        setMinGuestsFilter('');
        // --- CLEAR DATES ---
        setCheckInFilter('');
        setCheckOutFilter('');
        setAppliedFilters({});
        setError(null); // Clear errors as well
  };

  // --- Render Logic ---
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-6">Available Properties</h1>

      {/* --- Filter Form --- */}
      <form onSubmit={handleSearch} className="bg-gray-100 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        {/* City Input */}
        <div>
          <label htmlFor="cityFilter" className="block text-sm font-medium text-gray-700">City</label>
          <input type="text" id="cityFilter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>
         {/* State Input */}
        <div>
          <label htmlFor="stateFilter" className="block text-sm font-medium text-gray-700">State</label>
          <input type="text" id="stateFilter" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>

        {/* Min Price Input */}
        <div>
          <label htmlFor="minPriceFilter" className="block text-sm font-medium text-gray-700">Min Price (₦)</label>
          <input type="number" id="minPriceFilter" value={minPriceFilter} onChange={(e) => setMinPriceFilter(e.target.value)} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>

        {/* Max Price Input */}
        <div>
          <label htmlFor="maxPriceFilter" className="block text-sm font-medium text-gray-700">Max Price (₦)</label>
          <input type="number" id="maxPriceFilter" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>

         {/* Min Bedrooms Input */}
         <div>
          <label htmlFor="minBedroomsFilter" className="block text-sm font-medium text-gray-700">Min Bedrooms</label>
          <input type="number" id="minBedroomsFilter" value={minBedroomsFilter} onChange={(e) => setMinBedroomsFilter(e.target.value)} min="0" step="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>

         {/* Min Guests Input */}
         <div>
          <label htmlFor="minGuestsFilter" className="block text-sm font-medium text-gray-700">Min Guests</label>
          <input type="number" id="minGuestsFilter" value={minGuestsFilter} onChange={(e) => setMinGuestsFilter(e.target.value)} min="1" step="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm" />
        </div>

        {/* Check-in Date Input */}
        <div>
          <label htmlFor="checkInFilter" className="block text-sm font-medium text-gray-700">Check-in</label>
          <input
            type="date"
            id="checkInFilter"
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')} // Prevent past dates
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm"
          />
        </div>

        {/* Check-out Date Input */}
        <div>
          <label htmlFor="checkOutFilter" className="block text-sm font-medium text-gray-700">Check-out</label>
          <input
            type="date"
            id="checkOutFilter"
            value={checkOutFilter}
            onChange={(e) => setCheckOutFilter(e.target.value)}
            min={checkInFilter || format(addDays(new Date(), 1), 'yyyy-MM-dd')} // Min checkout is day after checkin
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border sm:text-sm"
            disabled={!checkInFilter} // Disable checkout until checkin is selected
          />
        </div>

        {/* Search Button */}
        <div className="md:col-span-1 flex space-x-2">
          <button type="submit" className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Search
          </button>
           <button type="button" onClick={clearFilters} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Clear
          </button>
        </div>
      </form>
      {/* --- End Filter Form --- */}


      {/* --- Property List Display --- */}
      {isLoading ? (
        <div className="text-center"><p>Loading available properties...</p></div>
      ) : error ? (
        <div className="text-center text-red-600"><p>Error: {error}</p></div>
      ) : properties.length === 0 ? (
        <p className="text-center text-gray-500">No properties found matching your criteria.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
      {/* --- End Property List Display --- */}

    </div>
  );
}

export default PropertiesListPage;