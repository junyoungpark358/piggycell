import React, { useEffect, useState } from "react";
import { Space, Tooltip, message, Modal } from "antd";
import {
  WalletOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
} from "@ant-design/icons";
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
  const [isCopied, setIsCopied] = useState(false);
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);

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

  // 잔액 클릭 핸들러
  const handleBalanceClick = () => {
    // 상세 밸런스 모달 표시
    setIsBalanceModalVisible(true);
  };

  // 복사 핸들러
  const handleCopy = () => {
    if (pgcBalance !== null) {
      // 정확한 전체 값을 클립보드에 복사
      const fullBalance = pgcBalance.toString();
      navigator.clipboard
        .writeText(fullBalance)
        .then(() => {
          setIsCopied(true);
          message.success({
            content: "잔액이 클립보드에 복사되었습니다!",
            icon: <CheckOutlined style={{ color: "#52c41a" }} />,
            duration: 2,
          });

          // 2초 후 복사 상태 초기화
          setTimeout(() => {
            setIsCopied(false);
          }, 2000);
        })
        .catch((err) => {
          message.error("복사에 실패했습니다: " + err);
        });
    }
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

  // 전체 잔액 값(소수점 모두 표시)
  const getFullBalanceDisplay = () => {
    if (pgcBalance === null) return "- PGC";
    return `${pgcBalance} PGC`;
  };

  // 축약된 잔액 값(소수점 2자리)
  const getShortBalanceDisplay = () => {
    if (pgcBalance === null) return "- PGC";
    return `${pgcBalance.toFixed(2)} PGC`;
  };

  return (
    <div className="page-header">
      <h1 className="mb-6 text-5xl font-extrabold text-sky-600">{title}</h1>
      <Space>
        {isAuthenticated && (
          <>
            <Tooltip title="클릭하여 전체 잔액 보기">
              <div
                className={`user-balance-badge ${isCopied ? "copied" : ""}`}
                onClick={handleBalanceClick}
              >
                <WalletOutlined className="wallet-icon-badge" />
                <span className="balance-text">
                  {balanceLoading ? "로딩 중..." : getShortBalanceDisplay()}
                </span>
              </div>
            </Tooltip>

            <Modal
              title="PGC 토큰 잔액 상세 정보"
              open={isBalanceModalVisible}
              onCancel={() => setIsBalanceModalVisible(false)}
              footer={[
                <StyledButton
                  key="close"
                  customVariant="ghost"
                  onClick={() => setIsBalanceModalVisible(false)}
                >
                  닫기
                </StyledButton>,
                <StyledButton
                  key="copy"
                  customVariant="primary"
                  onClick={handleCopy}
                  icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
                >
                  {isCopied ? "복사됨" : "복사하기"}
                </StyledButton>,
              ]}
            >
              <div className="balance-modal-content">
                <div className="balance-detail">
                  <div className="balance-label">현재 PGC 잔액:</div>
                  <div className="balance-value-full">
                    {balanceLoading ? "로딩 중..." : getFullBalanceDisplay()}
                  </div>
                </div>
                <div className="balance-info-text">
                  이 값을 복사하여 정확한 토큰 잔액을 다른 곳에서 사용할 수
                  있습니다.
                </div>
              </div>
            </Modal>
          </>
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
