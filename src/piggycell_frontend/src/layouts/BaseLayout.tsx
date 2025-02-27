import { Layout, Menu, Drawer, Tooltip, Space } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import React, { ReactNode, useState, useEffect } from "react";
import {
  MenuOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  BarChartOutlined,
  CrownOutlined,
  AppstoreOutlined,
  DollarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { AuthManager } from "../utils/auth";
import { StyledButton } from "../components/common/StyledButton";
import "./BaseLayout.css";

const { Header, Content, Footer } = Layout;

const MOBILE_BREAKPOINT = 768;

interface BaseLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

interface MenuItem {
  key: string;
  label: React.JSX.Element;
  icon?: React.JSX.Element;
  disabled?: boolean;
  className?: string;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  header,
  footer,
  className = "",
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= MOBILE_BREAKPOINT
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [key, setKey] = useState(0); // 강제 리렌더링을 위한 키

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const authManager = AuthManager.getInstance();
      await authManager.init();
      const authenticated = await authManager.isAuthenticated();
      const admin = authenticated ? await authManager.isAdmin() : false;
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);
      setKey((prev) => prev + 1); // 초기 인증 상태 설정 후 리렌더링
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    try {
      const authManager = AuthManager.getInstance();
      await authManager.login();
      const authenticated = await authManager.isAuthenticated();
      const admin = authenticated ? await authManager.isAdmin() : false;
      setIsAuthenticated(authenticated);
      setIsAdmin(admin);
      setKey((prev) => prev + 1); // 로그인 후 리렌더링
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const authManager = AuthManager.getInstance();
      await authManager.logout();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setKey((prev) => prev + 1); // 로그아웃 후 리렌더링
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // 기본 네비게이션 아이템
  const defaultNavItems: MenuItem[] = [
    {
      key: "/",
      label: (
        <Link to="/">
          <HomeOutlined /> 홈
        </Link>
      ),
      icon: <HomeOutlined />,
    },
  ];

  // 사용자 네비게이션 아이템
  const userNavItems: MenuItem[] = [
    {
      key: "/nft-market",
      label: (
        <Link to="/nft-market">
          <ShoppingCartOutlined /> NFT 마켓
        </Link>
      ),
      icon: <ShoppingCartOutlined />,
    },
    {
      key: "/staking",
      label: (
        <Link to="/staking">
          <BankOutlined /> 스테이킹
        </Link>
      ),
      icon: <BankOutlined />,
    },
    {
      key: "/revenue",
      label: (
        <Link to="/revenue">
          <BarChartOutlined /> 수익 현황
        </Link>
      ),
      icon: <BarChartOutlined />,
    },
  ];

  // 관리자 네비게이션 아이템
  const adminNavItems: MenuItem[] = [
    {
      key: "divider",
      label: <span className="menu-divider">\</span>,
      disabled: true,
    },
    {
      key: "/admin",
      label: (
        <Link to="/admin">
          <CrownOutlined /> 관리자
        </Link>
      ),
      icon: <CrownOutlined />,
    },
    {
      key: "/admin/nft-market",
      label: (
        <Link to="/admin/nft-market">
          <AppstoreOutlined /> NFT 관리
        </Link>
      ),
      icon: <AppstoreOutlined />,
    },
    {
      key: "/admin/revenue",
      label: (
        <Link to="/admin/revenue">
          <DollarOutlined /> 수익 관리
        </Link>
      ),
      icon: <DollarOutlined />,
    },
    {
      key: "/admin/token",
      label: (
        <Link to="/admin/token">
          <WalletOutlined /> PGC 관리
        </Link>
      ),
      icon: <WalletOutlined />,
    },
  ];

  const menuItems = [
    ...defaultNavItems,
    ...(isAuthenticated ? userNavItems : []),
    ...(isAdmin ? adminNavItems : []),
  ];

  // 모바일 메뉴용 아이템
  const mobileMenuItems = [
    {
      key: "/",
      label: "홈",
      icon: <HomeOutlined />,
      onClick: () => navigate("/"),
    },
    ...(isAuthenticated
      ? [
          {
            key: "/nft-market",
            label: "NFT 마켓",
            icon: <ShoppingCartOutlined />,
            onClick: () => navigate("/nft-market"),
          },
          {
            key: "/staking",
            label: "스테이킹",
            icon: <BankOutlined />,
            onClick: () => navigate("/staking"),
          },
          {
            key: "/revenue",
            label: "수익 현황",
            icon: <BarChartOutlined />,
            onClick: () => navigate("/revenue"),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            key: "divider",
            label: "\\",
            disabled: true,
          },
          {
            key: "/admin",
            label: "관리자",
            icon: <CrownOutlined />,
            onClick: () => navigate("/admin"),
          },
          {
            key: "/admin/nft-market",
            label: "NFT 관리",
            icon: <AppstoreOutlined />,
            onClick: () => navigate("/admin/nft-market"),
          },
          {
            key: "/admin/revenue",
            label: "수익 관리",
            icon: <DollarOutlined />,
            onClick: () => navigate("/admin/revenue"),
          },
          {
            key: "/admin/token",
            label: "PGC 관리",
            icon: <WalletOutlined />,
            onClick: () => navigate("/admin/token"),
          },
        ]
      : []),
    {
      key: "auth",
      label: isAuthenticated ? "로그아웃" : "로그인",
      className: "auth-menu-item",
      onClick: () => {
        if (isAuthenticated) {
          handleLogout();
        } else {
          handleLogin();
        }
        setMobileMenuOpen(false);
      },
    },
  ];

  // 데스크톱 메뉴용 아이템
  const desktopMenuItems = [
    ...menuItems,
    {
      key: "auth",
      label: isAuthenticated ? (
        <Link to="#" onClick={handleLogout}>
          로그아웃
        </Link>
      ) : (
        <Link to="#" onClick={handleLogin}>
          로그인
        </Link>
      ),
      className: "auth-menu-item",
    },
  ];

  const MobileHeader = (
    <div className="mobile-header">
      <MenuOutlined
        className="menu-icon"
        onClick={() => setMobileMenuOpen(true)}
      />
      <Link to="/" className="logo">
        PiggyCell
      </Link>
    </div>
  );

  const DesktopHeader = (
    <div className="desktop-header">
      <div className="left-section">
        <Link to="/" className="logo">
          PiggyCell
        </Link>
        <nav className="nav-menu">
          <ul className="nav-menu-list">
            {desktopMenuItems.map((item) => (
              <li
                key={item.key}
                className={`nav-menu-item ${item.className || ""} ${
                  location.pathname === item.key ? "active" : ""
                }`}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );

  return (
    <Layout className={`min-h-screen ${className}`} key={key}>
      <Header className="base-header">
        {isMobile ? MobileHeader : DesktopHeader}
      </Header>
      <Drawer
        title="메뉴"
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="mobile-menu-drawer"
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={mobileMenuItems}
          onClick={() => setMobileMenuOpen(false)}
        />
      </Drawer>
      <Content className="base-content">{children || <Outlet />}</Content>
      {footer && <Footer className="base-footer">{footer}</Footer>}
    </Layout>
  );
};

export default BaseLayout;
