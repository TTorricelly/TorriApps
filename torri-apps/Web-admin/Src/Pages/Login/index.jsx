import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../../Components/LoginForm"; // Adjusted path
import { useAuthStore } from "../../stores/auth"; // Adjusted path
import logoUrl from "../../Assets/logo-torriapps.png"; // Assuming logo is in Src/Assets

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth); // Assuming a checkAuth method if needed for token validation beyond simple flag

  useEffect(() => {
    // If there's a persisted auth state, Zustand might rehydrate after initial render.
    // A simple check on mount, and potentially if `isAuthenticated` changes.
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Optional: More robust check if token needs validation before redirect
  // useEffect(() => {
  //   const validateTokenAndRedirect = async () => {
  //     // Ideal: if (await checkAuth()) { // checkAuth would verify token validity
  //     if (isAuthenticated) { // Simplified: relies on persisted isAuthenticated flag
  //       navigate("/dashboard", { replace: true });
  //     }
  //   };
  //   validateTokenAndRedirect();
  // }, [checkAuth, isAuthenticated, navigate]);


  // Prevent rendering login form if already authenticated and redirection is pending
  if (isAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">
      {/* Logo TorriApps */}
      <img
        src={logoUrl} // Use imported logo URL
        alt="TorriApps Logo"
        className="max-w-xs w-48 mb-8" // As per requirements (w-48 is approx 192px)
      />

      {/* Card de Login */}
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Bem-vindo ao Web Admin
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
