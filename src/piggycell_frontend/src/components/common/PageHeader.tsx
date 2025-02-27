import React, { useEffect, useState } from "react";
import { Space, Tooltip, message, Modal } from "antd";
import {
  WalletOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { StyledButton } from "./StyledButton";
import { getUserBalance } from "../../utils/statsApi";
import "../common/UserBalanceInfo.css";
import { AuthManager } from "../../utils/auth";
import styled from "@emotion/styled";
import { formatPGCBalance } from "../../utils/tokenUtils";

// 모바일에서 높이를 일관되게 유지하기 위한 스타일 추가
const HeaderButtonsContainer = styled(Space)`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    .user-balance-badge,
    .ant-btn {
      height: 40px !important;
      line-height: 34px !important;
    }
  }
`;

interface PageHeaderProps {
  title: string;
  onRefresh: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onRefresh }) => {
  const [pgcBalance, setPgcBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCopied, setIsCopied] = useState({
    balance: false,
    principal: false,
  });
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [principalId, setPrincipalId] = useState<string | null>(null);

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

  // 복사 핸들러 - 잔액
  const handleCopyBalance = () => {
    if (pgcBalance !== null) {
      // 정확한 전체 값을 클립보드에 복사 (지수 표기법 없이)
      const fullBalance = formatPGCBalance(pgcBalance, 8);
      navigator.clipboard
        .writeText(fullBalance)
        .then(() => {
          setIsCopied({ ...isCopied, balance: true });
          message.success({
            content: "잔액이 클립보드에 복사되었습니다!",
            icon: <CheckOutlined style={{ color: "#52c41a" }} />,
            duration: 2,
          });

          // 2초 후 복사 상태 초기화
          setTimeout(() => {
            setIsCopied({ ...isCopied, balance: false });
          }, 2000);
        })
        .catch((err) => {
          message.error("복사에 실패했습니다: " + err);
        });
    }
  };

  // 복사 핸들러 - Principal ID
  const handleCopyPrincipal = () => {
    if (principalId) {
      navigator.clipboard
        .writeText(principalId)
        .then(() => {
          setIsCopied({ ...isCopied, principal: true });
          message.success({
            content: "Principal ID가 클립보드에 복사되었습니다!",
            icon: <CheckOutlined style={{ color: "#52c41a" }} />,
            duration: 2,
          });

          // 2초 후 복사 상태 초기화
          setTimeout(() => {
            setIsCopied({ ...isCopied, principal: false });
          }, 2000);
        })
        .catch((err) => {
          message.error("복사에 실패했습니다: " + err);
        });
    }
  };

  useEffect(() => {
    // 인증 상태 확인 및 Principal ID 가져오기
    const checkAuth = async () => {
      const authManager = AuthManager.getInstance();
      const authenticated = await authManager.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        fetchBalance();
        try {
          // Principal ID 가져오기
          const principal = await authManager.getPrincipal();
          if (principal) {
            setPrincipalId(principal.toString());
          }
        } catch (error) {
          console.error("Principal ID 가져오기 오류:", error);
        }
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
    return `${formatPGCBalance(pgcBalance, 8)} PGC`;
  };

  // 축약된 잔액 값(소수점 2자리)
  const getShortBalanceDisplay = () => {
    if (pgcBalance === null) return "- PGC";
    return `${formatPGCBalance(pgcBalance, 2)} PGC`;
  };

  return (
    <div className="page-header">
      <h1 className="mb-6 text-5xl font-extrabold text-sky-600">{title}</h1>
      <HeaderButtonsContainer>
        {isAuthenticated && (
          <>
            <Tooltip title="클릭하여 전체 잔액 보기">
              <div
                className={`user-balance-badge ${
                  isCopied.balance ? "copied" : ""
                }`}
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
              ]}
            >
              <div className="balance-modal-content">
                {/* Principal ID 정보 */}
                <div className="balance-detail">
                  <div className="balance-label">
                    <UserOutlined /> Principal ID:
                  </div>
                  <div
                    className="principal-value"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <span
                      style={{ wordBreak: "break-all", marginRight: "8px" }}
                    >
                      {principalId || "로딩 중..."}
                    </span>
                    <StyledButton
                      customVariant="primary"
                      customSize="sm"
                      onClick={handleCopyPrincipal}
                      icon={
                        isCopied.principal ? (
                          <CheckOutlined />
                        ) : (
                          <CopyOutlined />
                        )
                      }
                    >
                      {isCopied.principal ? "복사됨" : "복사"}
                    </StyledButton>
                  </div>

                  {/* 잔액 정보 */}
                  <div className="balance-label">
                    <WalletOutlined /> 현재 PGC 잔액:
                  </div>
                  <div
                    className="balance-value-full"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <span style={{ marginRight: "8px" }}>
                      {balanceLoading ? "로딩 중..." : getFullBalanceDisplay()}
                    </span>
                    <StyledButton
                      customVariant="primary"
                      customSize="sm"
                      onClick={handleCopyBalance}
                      icon={
                        isCopied.balance ? <CheckOutlined /> : <CopyOutlined />
                      }
                    >
                      {isCopied.balance ? "복사됨" : "복사"}
                    </StyledButton>
                  </div>
                </div>

                <div className="balance-info-text">
                  위 정보를 복사하여 다른 곳에서 사용할 수 있습니다.
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
      </HeaderButtonsContainer>
    </div>
  );
};

export default PageHeader;
