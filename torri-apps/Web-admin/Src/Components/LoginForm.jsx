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
    <form onSubmit={handleSubmit} className="space-y-l">
      {errorMsg && (
        <div role="alert" className="text-small text-status-error p-s bg-bg-tertiary border border-status-error rounded-button">
          {errorMsg}
        </div>
      )}
      
      {/* Global error from mutation if not handled by specific field errors */}
      {loginMutation.isError && !errorMsg && (
         <div role="alert" className="text-small text-status-error p-s bg-bg-tertiary border border-status-error rounded-button">
           Ocorreu um erro ao tentar fazer login. Tente novamente.
         </div>
      )}

      {/* Campo E-mail */}
      <div>
        <label
          htmlFor="email"
          className="block text-small font-medium text-text-primary mb-xs"
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
            setErrorMsg(null);
          }}
          className="input-field w-full"
          autoComplete="email"
        />
        {!isEmailValid(email) && email.length > 0 && (
          <p className="mt-xs text-xs text-status-error">Formato de e-mail inválido.</p>
        )}
      </div>

      {/* Campo Senha */}
      <div>
        <label
          htmlFor="password"
          className="block text-small font-medium text-text-primary mb-xs"
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
            setErrorMsg(null);
          }}
          className="input-field w-full"
          autoComplete="current-password"
        />
      </div>

      {/* Botão Entrar */}
      <div>
        <button
          type="submit"
          disabled={!isFormValid || loginMutation.isLoading}
          className={`w-full flex justify-center font-medium transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary ${
            isFormValid && !loginMutation.isLoading
              ? "btn-primary"
              : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
          }`}
        >
          {loginMutation.isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-current"
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
                d="M4 12a8 8 0 018-8V8H4z"
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
