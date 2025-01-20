import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export default function Login() {
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');

  const fetchGoogleAuthUrl = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/login/google`);
      setGoogleAuthUrl(response.data.url);
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchGoogleAuthUrl();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg p-6 mb-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold text-gray-800">AppSquad</h1>
          <h2 className="text-xl text-gray-800">Connect, Recommend, Inspire</h2>
        </div>

        <div>
          <a
            href={googleAuthUrl}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Sign in with Google
          </a>
        </div>

      </div>
      <footer className="text-center text-gray-500 text-sm">
        made with ❤️ in 🇫🇷
      </footer>
    </div>
  );
}