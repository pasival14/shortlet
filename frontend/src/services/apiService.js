import axios from 'axios';
import eventEmitter from '../utils/eventEmitter';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Flag to prevent multiple concurrent refresh attempts ---
let isRefreshing = false;
let failedQueue = []; // Store requests that failed while refreshing

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// --- Axios Response Interceptor ---
apiClient.interceptors.response.use(
  (response) => {
    // Any status code within 2xx range cause this function to trigger
    return response;
  },
  async (error) => {
    // Any status codes outside 2xx range cause this function to trigger
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry or refresh request
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        // If already refreshing, queue the original request
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest); // Retry with new token from successful refresh
        }).catch(err => {
          return Promise.reject(err); // Reject if refresh failed
        });
      }

      // Mark this request as a retry attempt
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('authRefreshToken');

      if (!refreshToken) {
        console.error("No refresh token available, logging out.");
        isRefreshing = false; // Reset flag
        // Handle logout - redirect or trigger logout action
        // Simplest: Redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log("Access token expired. Attempting to refresh...");
        // Use raw axios or a new instance for the refresh request to avoid interceptor loop
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
           headers: { 'Authorization': `Bearer ${refreshToken}` }
        });

        const newAccessToken = refreshResponse.data.access_token;
        console.log("Token refreshed successfully.");

        // Update token in local storage and default headers
        localStorage.setItem('authToken', newAccessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        // Update the header of the original failed request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        eventEmitter.dispatch('tokenRefreshed', { token: newAccessToken }); // Notify other parts of the app about the new token

        // Process the queue with the new token
        processQueue(null, newAccessToken);

        // Retry the original request with the new token
        return apiClient(originalRequest);

      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError.response?.data || refreshError.message);
        // Refresh token failed (likely expired or invalid) - Logout user
        localStorage.removeItem('authToken');
        localStorage.removeItem('authRefreshToken');
        localStorage.removeItem('authUser');
        delete apiClient.defaults.headers.common['Authorization'];
        console.error("Refresh token failed, logging out.");
        // Process the queue with the error
        processQueue(refreshError, null);
        // Redirect to login
         window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
         isRefreshing = false; // Reset refreshing flag
      }
    }

    // For errors other than 401, just reject the promise
    return Promise.reject(error);
  }
);

// --- API Functions ---

/**
 * Fetches properties, optionally filtered by params
 * @param {object} [params] - Optional object containing query parameters (e.g., { city: 'Lagos', min_price: 50000 })
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getProperties = (params) => { // Accept params object
  return apiClient.get('/properties', { params }); // Pass params to axios config
};

/**
 * Fetches a single property by its ID
 * @param {number | string} propertyId
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getPropertyById = (propertyId) => {
  return apiClient.get(`/properties/${propertyId}`);
};

/**
 * Creates a new property listing using FormData for file uploads
 * @param {FormData} formData - The FormData object containing text fields and files
 * @returns {Promise<AxiosResponse<any>>}
 */
export const createProperty = (formData) => {
  // When sending FormData, explicitly set the Content-Type header
  // Axios might do this automatically, but being explicit is safer
  // We rely on the default Authorization header already set in apiClient
  return apiClient.post('/properties', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Creates a booking request for a property
 * @param {number|string} propertyId
 * @param {object} bookingData - { check_in_date, check_out_date, num_guests }
 * @returns {Promise<AxiosResponse<any>>}
 */
export const createBooking = (propertyId, bookingData) => {
  return apiClient.post(`/properties/${propertyId}/bookings`, bookingData);
};

/**
 * Fetches bookings made by the current logged-in user
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getMyBookings = () => {
  return apiClient.get('/my-bookings');
};

/**
 * Fetches bookings for properties hosted by the current logged-in user
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getHostBookings = () => {
  return apiClient.get('/host/bookings');
};

/**
 * Confirms a booking (Host action)
 * @param {number|string} bookingId
 * @returns {Promise<AxiosResponse<any>>}
 */
export const confirmBooking = (bookingId) => {
  return apiClient.patch(`/host/bookings/${bookingId}/confirm`);
};

/**
 * Cancels a booking (Host action)
 * @param {number|string} bookingId
 * @returns {Promise<AxiosResponse<any>>}
 */
export const cancelBooking = (bookingId) => {
  return apiClient.patch(`/host/bookings/${bookingId}/cancel`);
};

/**
 * Initiates the payment process for a booking
 * @param {number|string} bookingId
 * @returns {Promise<AxiosResponse<any>>} Response should contain { authorization_url, access_code, reference }
 */
export const initiatePayment = (bookingId) => {
  return apiClient.post(`/bookings/${bookingId}/pay`);
};

/**
 * Fetches reviews for a specific property
 * @param {number|string} propertyId
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getReviewsForProperty = (propertyId) => {
  return apiClient.get(`/properties/${propertyId}/reviews`);
};

/**
 * Submits a new review for a property
 * @param {number|string} propertyId
 * @param {object} reviewData - { rating, comment }
 * @returns {Promise<AxiosResponse<any>>}
 */
export const submitReview = (propertyId, reviewData) => {
  // Assumes JWT token is set in default headers
  return apiClient.post(`/properties/${propertyId}/reviews`, reviewData);
};

/**
 * Fetches the profile data for the currently logged-in user
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getProfile = () => {
  // Assumes JWT token is set in default headers
  return apiClient.get('/auth/profile');
};

/**
 * Updates the profile data for the currently logged-in user
 * @param {object} profileData - Data to update (e.g., { first_name, last_name })
 * @returns {Promise<AxiosResponse<any>>}
 */
export const updateProfile = (profileData) => {
  // Assumes JWT token is set in default headers
  return apiClient.patch('/auth/profile', profileData); // Using PATCH
};

/**
 * Fetches booked date ranges for a specific property
 * @param {number|string} propertyId
 * @returns {Promise<AxiosResponse<any>>} Response should be an array like [{ startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }]
 */
export const getBookedDates = (propertyId) => {
  return apiClient.get(`/properties/${propertyId}/booked-dates`);
};

/**
 * Fetches listings created by the currently logged-in user
 * @returns {Promise<AxiosResponse<any>>}
 */
export const getMyListings = () => {
  // Assumes JWT token is set in default headers
  return apiClient.get('/my-listings');
};

/**
 * Updates a specific property listing using FormData (for text fields)
 * @param {number|string} propertyId
 * @param {FormData} formData - FormData object containing text fields to update
 * @returns {Promise<AxiosResponse<any>>}
 */
export const updateProperty = (propertyId, formData) => {
  // Send PATCH with form-data. Remember backend currently only updates text fields from this.
  return apiClient.patch(`/properties/${propertyId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Even if no files, backend expects form-data now for PATCH
    },
  });
};

/**
 * Deletes a specific property listing
 * @param {number|string} propertyId
 * @returns {Promise<AxiosResponse<any>>}
 */
export const deleteProperty = (propertyId) => {
  // Assumes JWT token is set in default headers
  return apiClient.delete(`/properties/${propertyId}`);
};

// Add other functions later...

export default apiClient;