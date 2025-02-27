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

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
`;

const InfoItem = styled.p`
  display: flex;
  align-items: center;
  color: #4b5563;
  margin: 0;
  font-size: 1rem;
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
`;

interface ButtonContainerProps {
  hasSecondaryButton?: boolean;
}

const ButtonContainer = styled.div<ButtonContainerProps>`
  display: flex;
  flex-direction: ${(props) => (props.hasSecondaryButton ? "row" : "column")};
  gap: 0.75rem;
  margin-top: 0.5rem;
  width: 100%;
  overflow: hidden;
  padding: 0.5rem;

  > button {
    width: 100%;
    min-width: 0;
    white-space: nowrap;
    max-width: 100%;
  }

  ${(props) =>
    props.hasSecondaryButton &&
    css`
      > button {
        flex: 1;
      }
    `}
`;

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
}) => {
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
            onClick={onBuy}
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
