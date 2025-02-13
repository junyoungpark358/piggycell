import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
  Outlet,
} from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import type { MenuProps } from "antd";
import {
  HomeOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  BarChartOutlined,
  DashboardOutlined,
  SettingOutlined,
  FundOutlined,
} from "@ant-design/icons";
import Home from "./pages/Home";
import NFTMarket from "./pages/NFTMarket";
import Staking from "./pages/Staking";
import Revenue from "./pages/Revenue";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminNFTManagement from "./pages/admin/NFTManagement";
import AdminRevenue from "./pages/admin/Revenue";
import "./App.css";
import { AuthManager } from "./utils/auth";

const { Header, Content, Footer } = Layout;

type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const authManager = AuthManager.getInstance();
      await authManager.init();
      const authenticated = await authManager.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
      setIsAdmin(true);
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    const authManager = AuthManager.getInstance();
    await authManager.login();
  };

  const handleLogout = async () => {
    const authManager = AuthManager.getInstance();
    await authManager.logout();
  };

  const userMenuItems: MenuItem[] = [
    { key: "/", label: "PiggyCell", icon: null, path: "/" },
    {
      key: "/market",
      label: "NFT 마켓",
      icon: <ShoppingCartOutlined />,
      path: "/market",
    },
    {
      key: "/staking",
      label: "스테이킹",
      icon: <BankOutlined />,
      path: "/staking",
    },
    {
      key: "/revenue",
      label: "수익 현황",
      icon: <BarChartOutlined />,
      path: "/revenue",
    },
  ];

  const adminMenuItems: MenuItem[] = [
    {
      key: "/admin",
      label: "관리자",
      icon: <DashboardOutlined />,
      path: "/admin",
    },
    {
      key: "/admin/nft-management",
      label: "NFT 관리",
      icon: <SettingOutlined />,
      path: "/admin/nft-management",
    },
    {
      key: "/admin/revenue",
      label: "수익 관리",
      icon: <FundOutlined />,
      path: "/admin/revenue",
    },
  ];

  const items: MenuProps["items"] = [
    ...userMenuItems.map((item) => ({
      key: item.key,
      label: <Link to={item.path}>{item.label}</Link>,
      icon: item.icon,
      className: item.key === "/" ? "logo-menu-item" : "",
    })),
    {
      key: "auth",
      label: isAuthenticated ? (
        <Button onClick={handleLogout}>로그아웃</Button>
      ) : (
        <Button onClick={handleLogin}>로그인</Button>
      ),
    },
    ...(isAuthenticated && isAdmin
      ? [
          { type: "divider" as const },
          ...adminMenuItems.map((item) => ({
            key: item.key,
            label: <Link to={item.path}>{item.label}</Link>,
            icon: item.icon,
          })),
        ]
      : []),
  ];

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Layout>
      <Header>
        <nav className="max-w-7xl mx-auto px-4">
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={items}
            className="border-0"
          />
        </nav>
      </Header>
      <Content>
        <div className="site-layout-content">
          <Outlet />
        </div>
      </Content>
      <Footer>
        PiggyCell ©{new Date().getFullYear()} Created by PiggyCell Team
      </Footer>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="market" element={<NFTMarket />} />
          <Route path="staking" element={<Staking />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/nft-management" element={<AdminNFTManagement />} />
          <Route path="admin/revenue" element={<AdminRevenue />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
