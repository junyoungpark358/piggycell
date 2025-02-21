import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import BaseLayout from "./BaseLayout";

const { Content } = Layout;

const AdminLayout = () => {
  return (
    <BaseLayout className="admin-layout">
      <Content className="p-6">
        <div className="bg-white p-6 rounded-lg min-h-[80vh]">
          <Outlet />
        </div>
      </Content>
    </BaseLayout>
  );
};

export default AdminLayout;
