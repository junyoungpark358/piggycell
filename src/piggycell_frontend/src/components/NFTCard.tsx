import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { StyledCard } from "./common/StyledCard";
import { StyledButton } from "./common/StyledButton";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { formatTokenDisplayForUI } from "../utils/tokenUtils";
import { formatPGCBalance } from "../utils/tokenUtils";
import pgcLogo from "../assets/pgc.png";
import { useTheme } from "../contexts/ThemeContext";
import { message } from "antd";

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem;
`;

const Title = styled.h3(
  ({ theme }) => `
  font-family: ${
    theme?.typography?.fontFamily?.display || "var(--font-display)"
  };
  font-size: ${theme?.typography?.fontSize?.lg || "1.25rem"};
  font-weight: ${theme?.typography?.fontWeight?.semibold || 600};
  color: ${theme?.colors?.text?.primary || "#202124"};
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${theme?.colors?.border?.default || "#E2E8F0"};
`
);

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
`;

const InfoItem = styled.p(
  ({ theme }) => `
  display: flex;
  align-items: center;
  font-family: ${
    theme?.typography?.fontFamily?.primary || "var(--font-primary)"
  };
  color: ${theme?.colors?.text?.secondary || "#5F6368"};
  margin: 0;
  font-size: ${theme?.typography?.fontSize?.md || "1rem"};
  padding: 0.5rem;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #f3f4f6;
    border-radius: 0.375rem;
  }

  .anticon {
    margin-right: 0.75rem;
    color: #0ea5e9;
    font-size: 1.25rem;
  }
`
);

interface ButtonContainerProps {
  hasSecondaryButton?: boolean;
}

const ButtonContainer = styled.div<ButtonContainerProps>(
  ({ hasSecondaryButton, theme }) => `
  display: flex;
  justify-content: ${hasSecondaryButton ? "space-between" : "flex-end"};
  gap: 0.5rem;
  margin-top: 1rem;
`
);

export interface NFTCardProps {
  name: string;
  location: string;
  chargerCount: number;
  price: number | string | bigint;
  status?: "selling" | "sold" | "available";
  onBuy?: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  isAuthenticated?: boolean;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  name,
  location,
  chargerCount,
  price,
  status,
  onBuy,
  onSecondaryAction,
  loading,
  primaryButtonText = "구매하기",
  secondaryButtonText,
  isAuthenticated = false,
}) => {
  const { theme } = useTheme();

  // 로그인하지 않은 상태에서 버튼 클릭 시 처리할 함수
  const handleBuyClick = () => {
    if (!isAuthenticated && status !== "sold") {
      message.error({
        content: "NFT를 구매하려면 로그인이 필요합니다.",
        key: "loginRequired",
        duration: 1,
      });
    } else if (onBuy) {
      onBuy();
    }
  };

  return (
    <StyledCard customVariant="nft">
      <CardContent>
        <Title>{name}</Title>
        <InfoContainer>
          <InfoItem>
            <EnvironmentOutlined />
            {location}
          </InfoItem>
          <InfoItem>
            <ThunderboltOutlined />
            충전기 {chargerCount}개
          </InfoItem>
          <InfoItem>
            <DollarOutlined />
            {formatPGCBalance(price, 8)} PGC
          </InfoItem>
        </InfoContainer>
        <ButtonContainer
          hasSecondaryButton={!!(secondaryButtonText && onSecondaryAction)}
        >
          <StyledButton
            customVariant={status === "sold" ? "ghost" : "primary"}
            customColor="primary"
            onClick={handleBuyClick}
            loading={loading}
            disabled={status === "sold"}
          >
            {status === "sold" ? "판매 완료" : primaryButtonText}
          </StyledButton>
          {secondaryButtonText && onSecondaryAction && (
            <StyledButton
              customVariant="secondary"
              customColor="primary"
              onClick={onSecondaryAction}
              loading={loading}
            >
              {secondaryButtonText}
            </StyledButton>
          )}
        </ButtonContainer>
      </CardContent>
    </StyledCard>
  );
};
