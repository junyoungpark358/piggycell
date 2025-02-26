import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import NFTMarket from "./pages/NFTMarket";
import Staking from "./pages/Staking";
import Revenue from "./pages/Revenue";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminNFTManagement from "./pages/admin/NFTManagement";
import AdminRevenue from "./pages/admin/Revenue";
import AdminTokenManagement from "./pages/admin/TokenManagement";
import UserLayout from "./layouts/UserLayout";
import { AuthManager } from "./utils/auth";
import "./App.css";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const authManager = AuthManager.getInstance();
      await authManager.init();
      const authenticated = await authManager.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };
    initAuth();
  }, []);

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route element={<UserLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nft-market" element={<NFTMarket />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/revenue" element={<Revenue />} />
          {isAuthenticated && (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="/admin/nft-market"
                element={<AdminNFTManagement />}
              />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/token" element={<AdminTokenManagement />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
