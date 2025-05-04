import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile } from '../services/apiService';

function EditProfilePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();
  // Get the function to update user in context (implement next)
  const { user, updateUserInContext } = useAuth();

  // Fetch current profile data to populate form
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getProfile();
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');
        setProfilePicUrl(response.data.profile_pic_url || '');
      } catch (err) {
        setError('Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    setIsUpdating(true);

    const updatedData = {
      first_name: firstName,
      last_name: lastName,
      profile_pic_url: profilePicUrl,
    };

    try {
      const response = await updateProfile(updatedData);
      setSuccessMessage('Profile updated successfully!');
      // --- Optional: Update user in AuthContext ---
      if (updateUserInContext) {
          updateUserInContext(response.data.user);
      }
      // --- End Optional ---
      setTimeout(() => {
        navigate('/dashboard'); // Redirect back to dashboard after delay
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center">Loading profile...</div>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-8 border rounded shadow-lg">
      <h1 className="text-2xl font-semibold mb-6 text-center">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && <p className="text-green-600 bg-green-100 p-3 rounded text-center">{successMessage}</p>}
        {error && <p className="text-red-600 bg-red-100 p-3 rounded text-center">{error}</p>}

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name*</label>
          <input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name*</label>
          <input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
        </div>

        <div>
          <label htmlFor="profilePicUrl" className="block text-sm font-medium text-gray-700">Profile Picture URL</label>
          <input type="url" id="profilePicUrl" value={profilePicUrl} onChange={(e) => setProfilePicUrl(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="https://..." />
        </div>

         <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
                Cancel
            </button>
            <button
                type="submit"
                disabled={isUpdating}
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
         </div>
      </form>
    </div>
  );
}

export default EditProfilePage;