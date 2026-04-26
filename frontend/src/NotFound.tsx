import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-500/10 p-4 rounded-full">
            <AlertTriangle size={40} className="text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold text-emerald-400 mb-3">404</h1>

        {/* Message */}
        <h2 className="text-xl font-semibold mb-2">
          Page not found
        </h2>
        <p className="text-slate-400 mb-6">
          The page you're looking for doesn’t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link
            to="/admin/dashboard"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium transition"
          >
            Go Dashboard
          </Link>

          <Link
            to="/login"
            className="px-5 py-2.5 border border-slate-700 hover:bg-white/5 rounded-lg text-sm font-medium transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;