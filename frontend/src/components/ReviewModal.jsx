import React, { useState } from 'react';

function ReviewModal({ show, onClose, onSubmit, propertyTitle }) {
  const [rating, setRating] = useState(0); // 0 indicates no rating selected
  const [hoverRating, setHoverRating] = useState(0); // For star hover effect
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRatingClick = (rate) => {
    setRating(rate);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // Call the onSubmit prop passed from MyTripsPage
      await onSubmit({ rating, comment });
      // Reset form and close on successful submission (handled by parent calling onClose)
    } catch (err) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple Star component for selection
  const Star = ({ index, filled }) => (
    <span
      key={index}
      className={`cursor-pointer text-3xl ${filled ? 'text-yellow-500' : 'text-gray-300'}`}
      onClick={() => handleRatingClick(index)}
      onMouseEnter={() => setHoverRating(index)}
      onMouseLeave={() => setHoverRating(0)}
    >
      ★
    </span>
  );

  if (!show) {
    return null;
  }

  return (
    // Basic Modal Structure (you might want a dedicated modal library later)
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Leave a Review</h3>
          <p className="text-sm text-gray-600 mb-4">For: {propertyTitle || 'Property'}</p>

          <form onSubmit={handleSubmit}>
            {/* Star Rating Input */}
            <div className="flex justify-center items-center mb-4 space-x-1">
               <label className="text-sm font-medium text-gray-700 mr-3">Rating:</label>
              {[1, 2, 3, 4, 5].map((index) => (
                <Star key={index} index={index} filled={hoverRating >= index || rating >= index} />
              ))}
            </div>

            {/* Comment Input */}
            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 text-left">Comment (Optional)</label>
              <textarea
                id="comment"
                rows="4"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              ></textarea>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {/* Action Buttons */}
            <div className="items-center px-4 py-3 space-x-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className={`px-4 py-2 text-white rounded-md text-sm ${isSubmitting || rating === 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;