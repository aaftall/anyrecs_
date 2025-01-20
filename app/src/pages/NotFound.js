import React from "react";

function NotPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg p-6 mb-8 text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <footer className="text-center text-gray-500 text-sm">
        made with ❤️ in 🇫🇷
      </footer>
    </div>
  );
}

export default NotPage;
