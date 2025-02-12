import { Layout, Menu } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  HomeOutlined,
  ShoppingCartOutlined,
  BankOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const { Header, Content, Footer } = Layout;

const UserLayout = () => {
  const location = useLocation();

  const menuItems = [
    { key: "/", label: <Link to="/">홈</Link>, icon: <HomeOutlined /> },
    {
      key: "/market",
      label: <Link to="/market">NFT 마켓</Link>,
      icon: <ShoppingCartOutlined />,
    },
    {
      key: "/staking",
      label: <Link to="/staking">스테이킹</Link>,
      icon: <BankOutlined />,
    },
    {
      key: "/revenue",
      label: <Link to="/revenue">수익 현황</Link>,
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">PiggyCell</div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="flex-1 justify-end"
          />
        </div>
      </Header>
      <Content className="p-6">
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
