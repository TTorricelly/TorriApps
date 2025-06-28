import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../../Components/LoginForm"; // Adjusted path
import { useAuthStore } from "../../stores/auth"; // Adjusted path
import { getCompanyInfo } from "../../Services/company";
import logoUrl from "../../assets/logo-torriapps.png"; // Fallback logo

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth); // Assuming a checkAuth method if needed for token validation beyond simple flag
  
  const [companyLogo, setCompanyLogo] = useState(logoUrl); // Default to fallback logo

  useEffect(() => {
    // If there's a persisted auth state, Zustand might rehydrate after initial render.
    // A simple check on mount, and potentially if `isAuthenticated` changes.
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch company logo on mount
  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const companyInfo = await getCompanyInfo();
        if (companyInfo.logo_url) {
          // Handle both relative and absolute URLs
          const logoSrc = companyInfo.logo_url.startsWith('http') 
            ? companyInfo.logo_url 
            : `${window.location.origin}${companyInfo.logo_url}`;
          setCompanyLogo(logoSrc);
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
        // Keep the fallback logo on error
      }
    };

    fetchCompanyLogo();
  }, []);

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
    <div className="min-h-screen flex flex-col justify-center items-center bg-bg-primary p-m font-sans">
      {/* Company Logo */}
      <img
        src={companyLogo}
        alt="Company Logo"
        className="max-w-xs w-48 mb-xl object-contain"
        onError={(e) => {
          // Fallback to default logo if company logo fails to load
          e.target.src = logoUrl;
        }}
      />

      {/* Card de Login */}
      <div className="bg-bg-secondary rounded-card shadow-card-hover border border-bg-tertiary p-xl max-w-md w-full">
        <h1 className="text-h2 font-semibold text-text-primary mb-l text-center">
          Bem-vindo ao Web Admin
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
