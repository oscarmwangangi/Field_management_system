import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("access");

  // not logged in → redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // logged in → allow access
  return <Outlet />;
};

export default ProtectedRoute;