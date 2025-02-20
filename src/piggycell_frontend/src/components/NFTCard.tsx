import { Button } from "antd";
import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { StyledCard } from "./common/StyledCard";

interface NFTCardProps {
  name: string;
  location: string;
  chargerCount: number;
  price: number;
  status: "available" | "sold";
  onBuy?: () => void;
  loading?: boolean;
}

export const NFTCard: React.FC<NFTCardProps> = ({
  name,
  location,
  chargerCount,
  price,
  status,
  onBuy,
  loading,
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
        <div className="mt-4">
          <Button
            type="primary"
            className={status === "sold" ? "sold-button" : "primary-gradient"}
            onClick={onBuy}
            loading={loading}
            disabled={status === "sold"}
            block
          >
            {status === "sold" ? "판매 완료" : "구매하기"}
          </Button>
        </div>
      </div>
    </StyledCard>
  );
};
