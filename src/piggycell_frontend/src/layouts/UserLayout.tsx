import { Layout, Menu, Drawer } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  HomeOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  BarChartOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  SettingOutlined,
  FundOutlined,
  CrownOutlined,
  AppstoreOutlined,
  DollarOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { AuthManager } from "../utils/auth";
import "./UserLayout.css";
import { StyledButton } from "../components/common/StyledButton";

const { Header, Content, Footer } = Layout;

const MOBILE_BREAKPOINT = 768;

const UserLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= MOBILE_BREAKPOINT
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
      setIsAuthenticated(authenticated);
      setIsAdmin(true); // 임시로 관리자 권한 설정
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    const authManager = AuthManager.getInstance();
    await authManager.login();
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const authManager = AuthManager.getInstance();
    await authManager.logout();
    setIsAuthenticated(false);
  };

  const userMenuItems = [
    {
      key: "/",
      label: "홈",
      icon: <HomeOutlined />,
    },
    {
      key: "/nft-market",
      label: "NFT 마켓",
      icon: <ShoppingCartOutlined />,
    },
    {
      key: "/staking",
      label: "스테이킹",
      icon: <BankOutlined />,
    },
    {
      key: "/revenue",
      label: "수익 현황",
      icon: <BarChartOutlined />,
    },
  ];

  const adminMenuItems = [
    {
      key: "/admin",
      icon: <CrownOutlined />,
      label: "관리자",
    },
    {
      key: "/admin/nft-market",
      icon: <AppstoreOutlined />,
      label: "NFT 관리",
    },
    {
      key: "/admin/revenue",
      icon: <DollarOutlined />,
      label: "수익 관리",
    },
  ];

  const allMenuItems = [
    ...userMenuItems,
    ...(isAuthenticated && isAdmin
      ? [
          {
            type: "divider",
            key: "admin-divider",
            className: "admin-menu-divider",
          },
          ...adminMenuItems,
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <Layout className="min-h-screen">
      <Header className="header-custom">
        <div className="header-content">
          {isMobile ? (
            <>
              <StyledButton
                variant="ghost"
                size="md"
                icon={
                  <MenuUnfoldOutlined
                    style={{ fontSize: "24px", color: "#000000" }}
                  />
                }
                onClick={() => setMobileMenuOpen(true)}
                className="mobile-menu-button"
              />
              <Link to="/" className="logo-link">
                <img
                  src="/piggycell_logo.png"
                  alt="PiggyCell Logo"
                  className="logo-image"
                />
              </Link>
              <div className="auth-button">
                {isAuthenticated ? (
                  <StyledButton onClick={handleLogout}>로그아웃</StyledButton>
                ) : (
                  <StyledButton variant="primary" onClick={handleLogin}>
                    로그인
                  </StyledButton>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/" className="logo-link">
                <img
                  src="/piggycell_logo.png"
                  alt="PiggyCell Logo"
                  className="logo-image"
                />
              </Link>
              <div className="menu-container">
                <Menu
                  mode="horizontal"
                  selectedKeys={[location.pathname]}
                  items={userMenuItems}
                  onClick={handleMenuClick}
                  className="desktop-menu"
                />
                {isAuthenticated && isAdmin && (
                  <>
                    <div className="admin-menu-divider" />
                    <Menu
                      mode="horizontal"
                      selectedKeys={[location.pathname]}
                      items={adminMenuItems}
                      onClick={handleMenuClick}
                      className="desktop-menu"
                    />
                  </>
                )}
              </div>
              <div className="auth-button">
                {isAuthenticated ? (
                  <StyledButton onClick={handleLogout}>로그아웃</StyledButton>
                ) : (
                  <StyledButton variant="primary" onClick={handleLogin}>
                    로그인
                  </StyledButton>
                )}
              </div>
            </>
          )}
        </div>
      </Header>

      {isMobile && (
        <Drawer
          title={<div className="text-xl font-bold">PiggyCell 메뉴</div>}
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          bodyStyle={{ padding: 0 }}
          headerStyle={{
            borderBottom: "1px solid #f0f0f0",
            padding: "16px 24px",
          }}
          maskStyle={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        >
          <Menu
            mode="vertical"
            selectedKeys={[location.pathname]}
            items={userMenuItems}
            onClick={handleMenuClick}
            className="mobile-menu"
          />
          {isAuthenticated && isAdmin && (
            <>
              <div className="admin-menu-divider" />
              <Menu
                mode="vertical"
                selectedKeys={[location.pathname]}
                items={adminMenuItems}
                onClick={handleMenuClick}
                className="mobile-menu"
              />
            </>
          )}
        </Drawer>
      )}

      <Content className="content-custom">
        <div className="bg-white p-6 rounded-lg min-h-[80vh]">
          <Outlet />
        </div>
      </Content>
      <Footer className="text-center">
        PiggyCell ©{new Date().getFullYear()} Created by PiggyCell Team
      </Footer>
    </Layout>
  );
};

export default UserLayout;
