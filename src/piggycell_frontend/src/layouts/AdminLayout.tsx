import { Layout, Menu } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  AppstoreOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: "/admin",
      label: <Link to="/admin">대시보드</Link>,
      icon: <DashboardOutlined />,
    },
    {
      key: "/admin/nft-management",
      label: <Link to="/admin/nft-management">NFT 관리</Link>,
      icon: <AppstoreOutlined />,
    },
    {
      key: "/admin/revenue",
      label: <Link to="/admin/revenue">수익 관리</Link>,
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white px-4">
        <div className="text-2xl font-bold">PiggyCell 관리자</div>
      </Header>
      <Layout>
        <Sider width={200} className="bg-white">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="h-full border-r"
          />
        </Sider>
        <Content className="p-6">
          <div className="bg-white p-6 rounded-lg min-h-[80vh]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
