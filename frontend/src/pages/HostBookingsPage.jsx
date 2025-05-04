import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getHostBookings, confirmBooking, cancelBooking } from '../services/apiService'; // Import booking functions
import { format } from 'date-fns';

function HostBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add state to track which booking action is loading
  const [actionLoading, setActionLoading] = useState(null); // Store the ID of booking being actioned
  const [actionError, setActionError] = useState(null);

  // Function to fetch bookings
  const fetchHostBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getHostBookings();
      setBookings(response.data);
    } catch (err) {
      console.error("Error fetching host bookings:", err);
      setError(err.response?.data?.message || "Could not load your property bookings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch bookings on component mount
  useEffect(() => {
    fetchHostBookings();
  }, [fetchHostBookings]);

  // --- Action Handlers ---
  const handleConfirm = async (bookingId) => {
    setActionLoading(bookingId); // Set loading state for this specific booking
    setActionError(null);
    try {
      const response = await confirmBooking(bookingId);
      // Update the booking status in the local state for immediate feedback
      setBookings(currentBookings =>
        currentBookings.map(b =>
          b.id === bookingId ? { ...b, status: response.data.booking.status } : b
        )
      );
    } catch (err) {
        console.error("Error confirming booking:", err);
        setActionError(err.response?.data?.message || "Failed to confirm booking.");
        // Optionally clear error after few seconds
        setTimeout(() => setActionError(null), 4000);
    } finally {
        setActionLoading(null); // Clear loading state
    }
  };

  const handleCancel = async (bookingId) => {
    setActionLoading(bookingId); // Set loading state
    setActionError(null);
     // Optional: Add a confirmation dialog
     if (!window.confirm("Are you sure you want to cancel this booking?")) {
         setActionLoading(null);
         return;
     }
    try {
      const response = await cancelBooking(bookingId);
      // Update local state
      setBookings(currentBookings =>
        currentBookings.map(b =>
          b.id === bookingId ? { ...b, status: response.data.booking.status } : b
        )
      );
    } catch (err) {
        console.error("Error cancelling booking:", err);
        setActionError(err.response?.data?.message || "Failed to cancel booking.");
        setTimeout(() => setActionError(null), 4000);
    } finally {
        setActionLoading(null);
    }
  };

  // --- Render Logic ---
  if (isLoading) return <div className="p-4 text-center">Loading bookings for your properties...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-6">Guest Bookings for Your Properties</h1>

      {/* Display Action Error if any */}
      {actionError && <p className="text-red-600 bg-red-100 p-3 rounded text-sm text-center mb-4">{actionError}</p>}

      {bookings.length === 0 ? (
        <p>You have no bookings for your properties yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.id} className="border rounded p-4 shadow grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Booking Info */}
              <div className="md:col-span-3 space-y-1">
                <h2 className="font-semibold text-lg">
                  Booking for: <Link to={`/properties/${booking.property_id}`} className="text-blue-600 hover:underline">
                    Property ID {booking.property_id} {/* TODO: Fetch/display property title */}
                  </Link>
                </h2>
                <p className="text-sm text-gray-700">
                  Guest: {booking.guest ? `${booking.guest.first_name} ${booking.guest.last_name}` : 'N/A'}
                </p>
                <p className="text-sm">Check-in: {format(new Date(booking.check_in_date), 'PPP')}</p>
                <p className="text-sm">Check-out: {format(new Date(booking.check_out_date), 'PPP')}</p>
                <p className="text-sm">Guests: {booking.num_guests}</p>
                <p className="text-sm">Status: <span className="font-medium capitalize px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">{booking.status}</span></p> {/* Basic status styling */}
                <p className="text-sm">Payment: <span className="font-medium capitalize">{booking.payment_status}</span></p>
              </div>

              {/* Action Buttons Area */}
              <div className="md:col-span-1 flex flex-col space-y-2 items-stretch">
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleConfirm(booking.id)}
                      disabled={actionLoading === booking.id}
                      className={`w-full text-sm py-1 px-3 rounded ${actionLoading === booking.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white`}
                    >
                      {actionLoading === booking.id ? 'Processing...' : 'Confirm'}
                    </button>
                    <button
                       onClick={() => handleCancel(booking.id)}
                       disabled={actionLoading === booking.id}
                       className={`w-full text-sm py-1 px-3 rounded ${actionLoading === booking.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white`}
                    >
                      {actionLoading === booking.id ? 'Processing...' : 'Cancel'}
                    </button>
                  </>
                )}
                 {booking.status === 'confirmed' && (
                     // Only allow cancellation for confirmed bookings for now
                     <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={actionLoading === booking.id}
                        className={`w-full text-sm py-1 px-3 rounded ${actionLoading === booking.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white`}
                     >
                       {actionLoading === booking.id ? 'Processing...' : 'Cancel Booking'}
                     </button>
                )}
                 {booking.status === 'cancelled' && (
                      <p className="text-xs text-center text-red-600 font-medium">Cancelled</p>
                 )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HostBookingsPage;