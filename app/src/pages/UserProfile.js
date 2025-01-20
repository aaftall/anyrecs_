import { useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Share2, Plus, X, AlertTriangle, AlertCircle, Loader } from "lucide-react";
import axios from 'axios';
import Tool from "../components/Tool";
import UserProfileMenu from "../components/UserProfileMenu";

const API_URL = process.env.REACT_APP_API_URL;
const MAX_NB_TOOLS = parseInt(process.env.REACT_APP_MAX_NB_TOOLS, 10);


const AddToolModal = ({ isOpen, onClose, onAddTool }) => {
  const [newToolUrl, setNewToolUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAddTool = async () => {
    if (validateUrl(newToolUrl)) {
      setIsLoading(true);
      try {
        await onAddTool(newToolUrl);
        setNewToolUrl("");
        setUrlError("");
        onClose();
      } catch (error) {
        setUrlError("Failed to add tool. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setUrlError("Please enter a valid URL");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Tool</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">Tool URL</label>
            <input
              type="text"
              id="url"
              value={newToolUrl}
              onChange={(e) => {
                setNewToolUrl(e.target.value);
                setUrlError("");
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              placeholder="https://example.com"
            />
            {urlError && <p className="mt-2 text-sm text-red-600">{urlError}</p>}
          </div>
        </div>
        <div className="mt-6">
          <button
            onClick={handleAddTool}
            disabled={isLoading}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            {isLoading ? (
              <Loader className="animate-spin mr-2" size={20} />
            ) : (
              <Plus size={20} className="mr-2" />
            )}
            {isLoading ? "Adding Tool..." : "Add Tool"}
          </button>
        </div>
      </div>
    </div>
  );
};


function UserProfile() {
  const { username } = useParams();
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [randomLegoImage, setRandomLegoImage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const handleError = (error, defaultMessage) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status >= 400 && status < 500) {
        // User error (4xx status code)
        setError({
          type: 'user',
          message: data.detail || defaultMessage,
        });
      } else {
        // Server error (5xx status code) or other errors
        setError({
          type: 'server',
          message: defaultMessage,
        });
      }
    } else {
      // Network error or other issues
      setError({
        type: 'server',
        message: defaultMessage,
      });
    }
  };

  useEffect(() => {
    const getUserPublicData = async (username) => {
      try {
        const response = await axios.get(`${API_URL}/auth/users/${username}`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        setUserData(response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching user public data:', error);
        if (error.response && error.response.status === 404) {
          window.location.href = '/Oops';
        } else {
          handleError(error, "Failed to fetch user data. Please try again later.");
        }
      }
    };

    getUserPublicData(username);
  }, [username]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get(`${API_URL}/auth/users/me`, { withCredentials: true });
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const randomNumber = Math.floor(Math.random() * 10);
    setRandomLegoImage(`https://randomuser.me/api/portraits/lego/${randomNumber}.jpg`);
  }, []);

  const handleAddTool = async (url) => {
    try {
      const response = await axios.post(`${API_URL}/tool/`, { link: url }, { withCredentials: true });
      setUserData(prevData => {
        const updatedTools = [...prevData.tools, response.data];
        if (updatedTools.length >= MAX_NB_TOOLS) {
          setIsModalOpen(false); // Close the modal when reaching the limit
        }
        return {
          ...prevData,
          tools: updatedTools
        };
      });
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error adding new tool:', error);
      handleError(error, "Failed to add new tool. Please try again later.");
    }
  };

  const removeTool = async (toolId) => {
    try {
      await axios.delete(`${API_URL}/tool/${toolId}`, {
        withCredentials: true,
      });

      setUserData(prevData => ({
        ...prevData,
        tools: prevData.tools.filter(tool => tool.id !== toolId)
      }));
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error removing tool:', error);
      handleError(error, "Failed to remove tool. Please try again later.");
    }
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setShareMessage('URL copied to clipboard!');
      setTimeout(() => setShareMessage(''), 3000); // Clear message after 3 seconds
    }, (err) => {
      console.error('Could not copy text: ', err);
      setShareMessage('Failed to copy URL');
      setTimeout(() => setShareMessage(''), 3000);
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg p-6 mb-8">

        <UserProfileMenu />

        {error && (
          <div className={`border px-4 py-3 rounded relative mb-4 flex items-center ${
            error.type === 'user' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'bg-red-100 border-red-400 text-red-700'
          }`} role="alert">
            {error.type === 'user' ? (
              <AlertCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertTriangle className="w-5 h-5 mr-2" />
            )}
            <span>{error.message}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 ring-4 ring-gray-300 overflow-hidden">
            {userData ? (
              <>
              <img
                src={userData.picture || randomLegoImage}
                alt={userData.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = randomLegoImage; // Set to random Lego image on error
                }}
              />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>

          {userData && (
              <h1 className="text-2xl font-bold text-gray-800">{userData.username}</h1>
            )}

            <button
              onClick={handleShare}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded flex items-center"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            {shareMessage && (
              <p className="text-sm text-green-600">{shareMessage}</p>
            )}

            <div className="w-full">

            <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">Favorite Tools</h2>
            <div className="space-y-4">

              {/* Tools */}
              {userData && userData.tools && userData.tools.map((tool) => (
                <Tool
                  key={tool.id}
                  tool={tool}
                  userId={userData.id}
                  isAuthenticated={isAuthenticated}
                  onRemove={removeTool}
                />
              ))}

              {/* Add Tools */}
              {isAuthenticated && userData && userData.tools && userData.tools.length < MAX_NB_TOOLS && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
                >
                  <Plus size={24} className="mr-2" />
                  Add New Tool
                </button>
              )}

            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-500 text-sm">
        made with ❤️ in 🇫🇷
      </footer>

      {isAuthenticated && userData && userData.tools && userData.tools.length < MAX_NB_TOOLS && (
        <AddToolModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTool={handleAddTool}
        />
      )}

    </div>
  );
}

export default UserProfile;
