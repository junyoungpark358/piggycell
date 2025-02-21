import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import "./UserLayout.css";
import BaseLayout from "./BaseLayout";

const { Content } = Layout;

const UserLayout = () => {
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
