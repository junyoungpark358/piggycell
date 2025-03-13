import React, { useEffect, useState, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
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

// 접근 권한 오류 페이지 컴포넌트
const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="access-denied-container">
      <h1>접근 권한이 없습니다</h1>
      <p>죄송합니다. 요청하신 페이지에 접근할 권한이 없습니다.</p>
      <button onClick={() => navigate("/")} className="primary-button">
        홈으로 돌아가기
      </button>
    </div>
  );
};

// 관리자 권한 확인 및 리디렉션 컴포넌트
const AdminRoute: React.FC<{ isAdmin: boolean; element: React.ReactNode }> = ({
  isAdmin,
  element,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    // 관리자가 아니고 아직 리디렉션하지 않았을 때만 리디렉션 수행
    if (!isAdmin && !redirectedRef.current) {
      redirectedRef.current = true; // 리디렉션 수행 여부 기록
      navigate("/access-denied", {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [isAdmin, location.pathname, navigate]);

  return isAdmin ? <>{element}</> : null;
};

// 보호된 경로를 위한 컴포넌트
interface ProtectedRouteProps {
  isAuthenticated: boolean;
  element: React.ReactNode;
  redirectPath?: string;
  requireAdmin?: boolean;
  isAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  element,
  redirectPath = "/nft-market",
  requireAdmin = false,
  isAdmin = false,
}) => {
  // 인증 여부 확인
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // 관리자 권한 필요한 경우 AdminRoute 컴포넌트 사용
  if (requireAdmin) {
    return <AdminRoute isAdmin={isAdmin} element={element} />;
  }

  return <>{element}</>;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const authManager = AuthManager.getInstance();
      await authManager.init();
      const authenticated = await authManager.isAuthenticated();
      const admin = await authManager.isAdmin();
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);
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
          <Route
            path="/"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<Home />}
              />
            }
          />
          <Route path="/nft-market" element={<NFTMarket />} />
          <Route
            path="/staking"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<Staking />}
              />
            }
          />
          <Route
            path="/revenue"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<Revenue />}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<AdminDashboard />}
                requireAdmin={true}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/admin/nft-market"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<AdminNFTManagement />}
                requireAdmin={true}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/admin/revenue"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<AdminRevenue />}
                requireAdmin={true}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/admin/token"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                element={<AdminTokenManagement />}
                requireAdmin={true}
                isAdmin={isAdmin}
              />
            }
          />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<Navigate to="/nft-market" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
