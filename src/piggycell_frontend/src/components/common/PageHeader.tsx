import React, { useEffect, useState } from "react";
import { Space } from "antd";
import { WalletOutlined, ReloadOutlined } from "@ant-design/icons";
import { StyledButton } from "./StyledButton";
import { getUserBalance } from "../../utils/statsApi";
import "../common/UserBalanceInfo.css";
import { AuthManager } from "../../utils/auth";

interface PageHeaderProps {
  title: string;
  onRefresh: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onRefresh }) => {
  const [pgcBalance, setPgcBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // PGC 잔액 조회 함수
  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const userBalance = await getUserBalance();
      setPgcBalance(userBalance);
    } catch (error) {
      console.error("토큰 잔액 조회 오류:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    // 데이터 새로고침
    await Promise.all([onRefresh(), fetchBalance()]);
  };

  useEffect(() => {
    // 인증 상태 확인
    const checkAuth = async () => {
      const authManager = AuthManager.getInstance();
      const authenticated = await authManager.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        fetchBalance();
      }
    };

    checkAuth();

    // 30초마다 잔액 업데이트
    const intervalId = window.setInterval(() => {
      if (isAuthenticated) {
        fetchBalance();
      }
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  return (
    <div className="page-header">
      <h1 className="mb-6 text-5xl font-extrabold text-sky-600">{title}</h1>
      <Space>
        {isAuthenticated && (
          <div className="user-balance-badge">
            <WalletOutlined className="wallet-icon-badge" />
            <span className="balance-text">
              {balanceLoading
                ? "로딩 중..."
                : pgcBalance !== null
                ? `${pgcBalance.toFixed(2)} PGC`
                : "- PGC"}
            </span>
          </div>
        )}
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={handleRefresh}
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </Space>
    </div>
  );
};

export default PageHeader;
