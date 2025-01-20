import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const url = searchParams.get('url');

    if (token) {
      // Set the token in a cookie (this is just for consistency, as the backend already sets the cookie)
      document.cookie = `access_token=Bearer ${token}; path=/; secure; samesite=lax`;

      // Set isAuthenticated in localStorage
      localStorage.setItem('isAuthenticated', 'true');

      // Redirect to the user page
      navigate(`/${url}`);

    } else {
      // Handle error case
      navigate('/login');
    }
  }, [navigate, location]);

  return <div>Processing Google login...</div>;
}

export default GoogleCallback;