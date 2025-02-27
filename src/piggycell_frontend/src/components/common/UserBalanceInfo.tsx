import React, { useEffect, useState } from "react";
import { Typography, Tooltip, Spin } from "antd";
import { WalletOutlined, ReloadOutlined } from "@ant-design/icons";
import { getUserBalance } from "../../utils/statsApi";
import { formatPGCBalance } from "../../utils/tokenUtils";
import "./UserBalanceInfo.css";

const { Text } = Typography;

interface UserBalanceInfoProps {
  className?: string;
}

const UserBalanceInfo: React.FC<UserBalanceInfoProps> = ({
  className = "",
}) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const userBalance = await getUserBalance();
      setBalance(userBalance);
    } catch (error) {
      console.error("토큰 잔액 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // 30초마다 잔액 업데이트
    const intervalId = window.setInterval(() => {
      fetchBalance();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={`user-balance-info ${className}`}>
      <div className="balance-value">
        <WalletOutlined className="wallet-icon" />
        {loading ? (
          <Spin size="small" />
        ) : (
          <Text strong style={{ fontSize: "18px", color: "#000" }}>
            {balance !== null ? `${formatPGCBalance(balance, 2)} PGC` : "- PGC"}
          </Text>
        )}
      </div>
      <Tooltip title="새로고침">
        <ReloadOutlined
          className="refresh-icon"
          onClick={(e) => {
            e.preventDefault();
            fetchBalance();
          }}
        />
      </Tooltip>
    </div>
  );
};

export default UserBalanceInfo;
