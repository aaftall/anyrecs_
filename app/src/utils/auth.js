import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const login = async (username, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/auth/login`,
      formData,
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    localStorage.setItem('isAuthenticated', 'true');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const register = async (username, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`,
      { username, email, password },
      { withCredentials: true }
    );
    localStorage.setItem('isAuthenticated', 'true');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    localStorage.removeItem('isAuthenticated');
  } catch (error) {
    console.error('Logout failed:', error);
  }
  window.location.href = '/login';
};
