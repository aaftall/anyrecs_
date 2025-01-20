import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFound from './pages/NotFound';
import UserProfile from './pages/UserProfile';
import GoogleCallback from './components/GoogleCallback';
import Login from './pages/Login';

const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {

  return (
    <BrowserRouter>
      <Routes>

        <Route index element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Oops" element={<NotFound />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path=":username" element={<UserProfile />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
