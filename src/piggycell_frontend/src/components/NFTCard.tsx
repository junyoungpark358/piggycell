import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { StyledCard } from "./common/StyledCard";
import { StyledButton } from "./common/StyledButton";

interface NFTCardProps {
  name: string;
  location: string;
  chargerCount: number;
  price: number;
  status: "available" | "sold";
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
    <StyledCard styleVariant="nft">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        <div className="space-y-2">
          <p className="flex items-center text-gray-600">
            <EnvironmentOutlined className="mr-2 text-sky-600" />
            {location}
          </p>
          <p className="flex items-center text-gray-600">
            <ThunderboltOutlined className="mr-2 text-sky-600" />
            충전기 {chargerCount}개
          </p>
          <p className="flex items-center text-gray-600">
            <DollarOutlined className="mr-2 text-sky-600" />
            {price.toFixed(2)} ICP
          </p>
        </div>
        <div className="flex mt-4 space-x-2">
          <StyledButton
            variant={status === "sold" ? "ghost" : "primary"}
            color="primary"
            onClick={onBuy}
            loading={loading}
            disabled={status === "sold"}
            fullWidth={!secondaryButtonText}
          >
            {status === "sold" ? "판매 완료" : primaryButtonText}
          </StyledButton>
          {secondaryButtonText && onSecondaryAction && (
            <StyledButton
              variant="secondary"
              color="primary"
              onClick={onSecondaryAction}
              loading={loading}
              fullWidth
            >
              {secondaryButtonText}
            </StyledButton>
          )}
        </div>
      </div>
    </StyledCard>
  );
};
