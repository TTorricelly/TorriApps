import React, { useState } from "react"; // Removed FormEvent as it's not used directly in the JS version in this way
import { useLogin } from "../Hooks/useLogin"; // Adjusted path

// Material Tailwind components can be imported if desired, e.g.:
// import { Input, Button, Typography } from "@material-tailwind/react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);

  const loginMutation = useLogin();

  const isEmailValid = (email) => {
    // Basic regex for email validation
    return /\S+@\S+\.\S+/.test(email);
  };

  const isFormValid = email !== "" && password !== "" && isEmailValid(email);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null); // Clear previous errors

    if (!isFormValid) {
      if (email === "" || password === "") {
        setErrorMsg("E-mail e senha são obrigatórios.");
      } else if (!isEmailValid(email)) {
        setErrorMsg("Formato de e-mail inválido.");
      }
      return;
    }

    loginMutation.mutate(
      { email, password },
      {
        onError: (error) => { // This error comes from the mutation hook's onError
          // Check if the error object has a specific message from backend if available
          // For now, using the generic message as per requirements
          setErrorMsg("E-mail ou senha incorretos.");
          setPassword(""); // Clear password field on error
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div role="alert" className="text-sm text-red-600 p-2 bg-red-100 rounded-md">
          {errorMsg}
        </div>
      )}
      
      {/* Global error from mutation if not handled by specific field errors */}
      {loginMutation.isError && !errorMsg && (
         <div role="alert" className="text-sm text-red-600 p-2 bg-red-100 rounded-md">
           Ocorreu um erro ao tentar fazer login. Tente novamente.
         </div>
      )}

      {/* Campo E-mail */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          placeholder="usuario@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrorMsg(null); // Clear error when user types
          }}
          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
          autoComplete="email"
          // `required` HTML attribute can be used, but custom validation provides better UX
        />
        {!isEmailValid(email) && email.length > 0 && (
          <p className="mt-1 text-xs text-red-500">Formato de e-mail inválido.</p>
        )}
      </div>

      {/* Campo Senha */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrorMsg(null); // Clear error when user types
          }}
          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
          autoComplete="current-password"
          // `required`
        />
      </div>

      {/* Botão Entrar */}
      <div>
        <button
          type="submit"
          disabled={!isFormValid || loginMutation.isLoading}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
            isFormValid && !loginMutation.isLoading
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-300 cursor-not-allowed"
          }`}
        >
          {loginMutation.isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V8H4z" // Corrected spinner path for better visuals
              ></path>
            </svg>
          ) : (
            "Entrar"
          )}
        </button>
      </div>
    </form>
  );
}
