import React, { useState, useEffect, useCallback } from 'react'; // Make sure useCallback is imported
import { Link } from 'react-router-dom';
import { getMyBookings, initiatePayment } from '../services/apiService';
import { format, isPast } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import ReviewModal from '../components/ReviewModal';

function MyTripsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const { user } = useAuth();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // Store { propertyId, propertyTitle }
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  // Track submitted reviews in this session to hide button
  const [reviewsSubmitted, setReviewsSubmitted] = useState({}); // { propertyId: true }

  // Define fetchBookings OUTSIDE useEffect, wrapped in useCallback
  // useCallback ensures the function reference doesn't change unless its dependencies do (none here)
  const fetchBookings = useCallback(async () => {
    console.log("MyTripsPage: Attempting to fetch bookings..."); // Keep debug logs for now
    console.log("MyTripsPage: Token present?", !!localStorage.getItem('authToken'));
    setIsLoading(true);
    setError(null);
    try {
      console.log("MyTripsPage: Calling getMyBookings API...");
      const response = await getMyBookings();
      console.log("MyTripsPage: API call successful, response data:", response.data);
      setBookings(response.data);
    } catch (err) {
      console.error("MyTripsPage: Error fetching bookings (inside catch):", err);
       if (err.response) {
           console.error("MyTripsPage: Error response data:", err.response.data);
           console.error("MyTripsPage: Error response status:", err.response.status);
       } else if (err.request) {
           console.error("MyTripsPage: Error request:", err.request);
       } else {
           console.error("MyTripsPage: Error message:", err.message);
       }
      setError(err.response?.data?.message || "Could not load your trips.");
    } finally {
      console.log("MyTripsPage: Setting loading to false.");
      setIsLoading(false);
    }
  }, []); // Empty dependency array for useCallback - fetchBookings doesn't depend on changing props/state

  // Call fetchBookings ONCE on mount using ONE useEffect
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]); // The fetchBookings reference is now stable

  // --- Handle Pay Now ---
  const handlePayNow = async (booking) => {
    if (!user) {
      setPaymentError("User not found. Please log in again.");
      return;
    }
    setPayingBookingId(booking.id);
    setPaymentError(null);

    try {
      const response = await initiatePayment(booking.id);
      const { authorization_url, access_code, reference } = response.data;

      const handler = PaystackPop.setup({ /* ... Paystack config ... */
         key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
         email: user.email,
         amount: booking.total_price * 100,
         ref: reference,
         onClose: function(){
            console.log('Paystack popup closed.');
            setPayingBookingId(null);
         },
         callback: function(response){
            console.log('Paystack payment successful (client-side callback): ', response);
            alert(`Payment successful (Ref: ${response.reference}). Status will update shortly.`);
            setPayingBookingId(null);
            setBookings(currentBookings =>
              currentBookings.map(b =>
                b.id === booking.id
                  ? { ...b, payment_status: 'paid', status: 'confirmed' } // Assume paid and confirmed
                  : b
              )
            );
            // Use the stable fetchBookings reference here
            setTimeout(fetchBookings, 1500);
         }
      });
      handler.openIframe();

    } catch (err) {
      console.error("Payment Initiation Failed:", err);
      setPaymentError(err.response?.data?.message || "Failed to initiate payment. Please try again.");
      setPayingBookingId(null);
    }
  };

  const handleOpenReviewModal = (booking) => {
    if (!booking || !booking.property) return;
    setReviewTarget({ propertyId: booking.property.id, propertyTitle: booking.property.title });
    setShowReviewModal(true);
    setReviewError(''); // Clear previous errors
  };

  // --- Handle Review Submission ---
  const handleSubmitReview = async (reviewData) => { // reviewData = { rating, comment }
    if (!reviewTarget) return;
    setSubmittingReview(true);
    setReviewError('');
    try {
        await submitReview(reviewTarget.propertyId, reviewData);
        // Mark as submitted for this session
        setReviewsSubmitted(prev => ({ ...prev, [reviewTarget.propertyId]: true }));
        setShowReviewModal(false); // Close modal on success
        setReviewTarget(null);
        // Optionally show a global success message/toast
    } catch (err) {
        console.error("Error submitting review:", err);
        setReviewError(err.response?.data?.message || "Failed to submit review.");
        // Keep modal open to show error
    } finally {
        setSubmittingReview(false);
    }
  };

  // --- Render Logic ---
  if (isLoading) return <div className="p-4 text-center">Loading your trips...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-6">My Trips</h1>

      {/* Display Payment Error if any */}
      {paymentError && <p className="text-red-600 bg-red-100 p-3 rounded text-sm text-center mb-4">{paymentError}</p>}

      {bookings.length === 0 ? (
         <p>You haven't booked any trips yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => { // Use curly braces {} instead of ()

          // Now you can define variables *before* the return statement
          const canReview = booking.status === 'confirmed' &&
                            isPast(new Date(booking.check_out_date)) &&
                            !reviewsSubmitted[booking.property_id];

          // Explicitly return the JSX
          return (
            <div key={booking.id} className="border rounded p-4 shadow flex flex-col md:flex-row justify-between items-start md:items-center">
              {/* Booking Info */}
              <div className="space-y-1 mb-4 md:mb-0">
                {/* ... booking details ... */}
                <h2 className="font-semibold text-lg">
                  {booking.property ? (
                    <Link to={`/properties/${booking.property.id}`} className="text-blue-600 hover:underline">
                      {booking.property.title}
                    </Link>
                  ) : 'Property details unavailable'}
                </h2>
                {/* ... other details ... */}
                <p className="text-sm">Status: <span className="font-medium capitalize">{booking.status}</span></p>
                <p className="text-sm">Payment: <span className="font-medium capitalize">{booking.payment_status}</span></p>
                <p className="text-sm font-semibold">Total: ₦{booking.total_price.toLocaleString()}</p>
              </div>

              {/* Action Buttons Area (Payment & Review) */}
              <div className="flex-shrink-0 flex flex-col space-y-2 md:space-y-0 md:space-x-2 md:flex-row items-stretch md:items-center">
                {/* Payment Button */}
                  {booking.status === 'confirmed' && booking.payment_status === 'unpaid' && (
                      <button onClick={() => handlePayNow(booking)} /* ... other props ... */ >
                          {payingBookingId === booking.id ? 'Processing...' : 'Pay Now'}
                      </button>
                  )}
                  {booking.payment_status === 'paid' && (
                      <span /* ... Paid Badge ... */ >Paid</span>
                  )}

                  {/* Review Button */}
                  {canReview && ( // Now uses the correctly defined 'canReview'
                      <button
                          onClick={() => handleOpenReviewModal(booking)}
                          className="w-full md:w-auto inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                          Add Review
                      </button>
                  )}
                  {reviewsSubmitted[booking.property_id] && !canReview && booking.status === 'confirmed' && isPast(new Date(booking.check_out_date)) && (
                      <span className="text-xs text-center text-green-700 font-medium">Review Submitted</span>
                  )}
              </div>
            </div>
          ); // End of return statement
          })}
        </div>
      )}

      <ReviewModal
        show={showReviewModal}
        onClose={() => {setShowReviewModal(false); setReviewTarget(null); setReviewError('');}}
        onSubmit={handleSubmitReview}
        propertyTitle={reviewTarget?.propertyTitle}
        // Pass submitting state and error to modal if needed
        // isSubmitting={submittingReview}
        // error={reviewError}
      />
    </div>
  );
}

export default MyTripsPage;