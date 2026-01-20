import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BlurReveal } from "../components/BlurReveal";
import { Button } from "../components/ui/Button";
import { AtSign } from "lucide-react";

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configInput, setConfigInput] = useState("");

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      console.error("Login Error:", err);
      if (
        err.code === "auth/api-key-not-valid.-please-pass-a-valid-api-key." ||
        err.message?.includes("api-key-not-valid") ||
        err.code === "auth/internal-error"
      ) {
        setError(
          "Invalid Firebase Configuration. Please provide your config object below.",
        );
        setShowConfig(true);
      } else {
        setError(err.message || "Failed to sign in");
      }
    }
  };

  const saveConfig = () => {
    try {
      const parsed = JSON.parse(configInput);
      localStorage.setItem("firebase_config", JSON.stringify(parsed));
      window.location.reload();
    } catch (e) {
      setError("Invalid JSON format.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <BlurReveal className="w-full max-w-sm text-center space-y-8">
        <div className="border border-zinc-200 p-8 rounded-xl shadow-sm space-y-6 bg-white">
          {error && (
            <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-600">
              {error}
            </div>
          )}

          <Button onClick={handleSignIn} className="w-full" size="lg">
            <AtSign className="mr-2" />
            Continue with Google
          </Button>
        </div>
      </BlurReveal>
    </div>
  );
};

export default Login;
