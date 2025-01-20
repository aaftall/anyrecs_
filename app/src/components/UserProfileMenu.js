import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const UserProfileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/users/me`, { withCredentials: true });
        console.log(response.data);
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return <div className="fixed top-4 right-4">Loading...</div>;
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4" ref={dropdownRef}>
      <button
        className="flex flex-col items-center focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className="h-10 w-10 rounded-full overflow-hidden">
          <img
            src={userData.picture || "https://randomuser.me/api/portraits/lego/0.jpg"}
            alt={userData.username}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.onerror = null; // Prevent infinite loop
              e.target.src = "https://randomuser.me/api/portraits/lego/0.jpg"; // Set to default Lego image on error
            }}
          />
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 mt-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">

          <a href={userData.url} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <User className="mr-2 h-4 w-4" />
            <span className="flex-grow">Profile</span>
          </a>

          {/* <a href="#settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Settings className="mr-2 h-4 w-4" />
            <span className="flex-grow">Settings</span>
          </a> */}

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="flex-grow">Logout</span>
          </button>

        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;