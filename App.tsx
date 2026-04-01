import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Play from "./pages/Play";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Monitor from "./pages/admin/Monitor";
import CreateQuiz from "./pages/admin/CreateQuiz";
import EditQuiz from "./pages/admin/EditQuiz";
import LeaderboardPage from "./pages/LeaderboardPage";

const ProtectedRoute = ({
  children,
  requireAdmin = false,
}: {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}) => {
  const { user, loading, userData } = useAuth();

  if (loading)
    return (
      <div className="h-screen w-full flex items-center justify-center">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && userData?.role !== "admin")
    return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen bg-white text-black antialiased selection:bg-zinc-200">
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* User Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play/:quizId"
              element={
                <ProtectedRoute>
                  <Play />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard/:quizId"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/create"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/edit/:quizId"
              element={
                <ProtectedRoute requireAdmin>
                  <EditQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/monitor/:quizId"
              element={
                <ProtectedRoute requireAdmin>
                  <Monitor />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
