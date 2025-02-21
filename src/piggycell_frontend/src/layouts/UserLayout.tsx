import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import "./UserLayout.css";
import BaseLayout from "./BaseLayout";

const { Content } = Layout;

const UserLayout = () => {
  return (
    <BaseLayout className="user-layout">
      <Content className="p-6">
        <div className="bg-white p-6 rounded-lg min-h-[80vh]">
          <Outlet />
        </div>
      </Content>
    </BaseLayout>
  );
};

export default UserLayout;
