import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyListings, deleteProperty } from '../services/apiService';
import PropertyCard from '../components/PropertyCard'; // Reuse PropertyCard or create a list item component

function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // Track which listing is being deleted

  const navigate = useNavigate();

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyListings();
      setListings(response.data);
    } catch (err) {
      setError("Failed to load your listings.");
      console.error("Fetch listings error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDelete = async (propertyId) => {
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this property listing? This action cannot be undone.")) {
      return;
    }

    setDeletingId(propertyId); // Show loading state for the specific item
    setDeleteError(null);
    try {
      await deleteProperty(propertyId);
      // Remove deleted item from state for immediate UI update
      setListings(currentListings => currentListings.filter(p => p.id !== propertyId));
      // Optionally show a success message/toast
    } catch (err) {
      setDeleteError("Failed to delete listing. Please try again.");
      console.error("Delete property error:", err);
    } finally {
      setDeletingId(null); // Clear loading state
    }
  };


  if (isLoading) return <div className="p-4 text-center">Loading your listings...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">My Property Listings</h1>
          <Link to="/create-listing" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm">
            + List New Property
          </Link>
      </div>


      {deleteError && <p className="text-red-600 bg-red-100 p-3 rounded text-sm text-center mb-4">{deleteError}</p>}

      {listings.length === 0 ? (
        <p>You haven't listed any properties yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((property) => (
            <div key={property.id} className="relative">
              <PropertyCard property={property} />
              {/* Add Edit/Delete buttons overlay or below card */}
              <div className="mt-2 flex justify-end space-x-2 p-2 bg-gray-50 rounded-b-lg border-t">
                <Link
                    to={`/edit-property/${property.id}`}
                    className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-2 rounded"
                >
                    Edit
                </Link>
                 <button
                    onClick={() => handleDelete(property.id)}
                    disabled={deletingId === property.id}
                    className={`text-xs font-semibold py-1 px-2 rounded ${deletingId === property.id ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                    {deletingId === property.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListingsPage;