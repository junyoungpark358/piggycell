import { Layout } from "antd";
import { Outlet, useLocation } from "react-router-dom";
import "./UserLayout.css";
import BaseLayout from "./BaseLayout";
import { AuthManager } from "../utils/auth";
import { useEffect, useState } from "react";

const { Content } = Layout;

const UserLayout = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 현재 경로가 관리자 페이지인지 확인
  const isAdminPage = location.pathname.startsWith("/admin");

  useEffect(() => {
    const checkAuth = async () => {
      const authManager = AuthManager.getInstance();
      const authenticated = await authManager.isAuthenticated();
      setIsAuthenticated(authenticated);
    };

    checkAuth();
  }, []);

  // 로그인 상태 확인 로그 추가
  useEffect(() => {
    console.log("UserLayout - 인증 상태:", isAuthenticated);
    console.log("UserLayout - 현재 경로:", location.pathname);
    console.log("UserLayout - 관리자 페이지:", isAdminPage);
  }, [isAuthenticated, location.pathname, isAdminPage]);

  return (
    <BaseLayout className="user-layout">
      <Content className="base-content">
        <div className="page-container">
          <Outlet />
        </div>
      </Content>
    </BaseLayout>
  );
};

export default UserLayout;
