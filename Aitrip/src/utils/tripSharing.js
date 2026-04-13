import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export const generateShareLink = async (tripId) => {
  try {
    const response = await axios.get(`${API_BASE}/share/${tripId}`);
    if (response.data.success) {
      return `${window.location.origin}/shared/${tripId}`;
    }
    return null;
  } catch (error) {
    console.error('Error generating share link:', error);
    return null;
  }
};

export const getSharedTrip = async (tripId) => {
  try {
    const response = await axios.get(`${API_BASE}/share/${tripId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching shared trip:', error);
    return { success: false, error: 'Trip not found or has been removed.' };
  }
};