import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import BaseLayout from "./BaseLayout";

const { Content } = Layout;

const AdminLayout = () => {
  return (
    <BaseLayout className="admin-layout">
      <Content className="base-content">
        <div className="page-container">
          <Outlet />
        </div>
      </Content>
    </BaseLayout>
  );
};

export default AdminLayout;
