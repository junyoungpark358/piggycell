import React from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Statistic,
  message,
  Spin,
  Empty,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useRef, useCallback } from "react";
import { AuthManager } from "../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type {
  _SERVICE,
  Listing,
  PageResult,
  Metadata,
} from "../../../declarations/piggycell_backend/piggycell_backend.did";
import "./NFTMarket.css";
import "../styles/components/StatisticCard.css";

interface NFTMetadata {
  location?: string;
  chargerCount?: number;
}

interface NFTData {
  id: bigint;
  name: string;
  location: string;
  price: bigint;
  status: string;
  chargerCount: number;
}

const NFTMarket = () => {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalNFTs: 0,
    availableNFTs: 0,
    totalChargers: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [buyingNFT, setBuyingNFT] = useState<bigint | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastNFTElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreNFTs();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore]
  );

  const createActor = async () => {
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();

    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    const agent = new HttpAgent({ identity });

    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    const canisterId = process.env.CANISTER_ID_PIGGYCELL_BACKEND;
    if (!canisterId) {
      throw new Error("Canister ID를 찾을 수 없습니다.");
    }

    return Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId,
    });
  };

  const fetchMoreNFTs = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const actor = await createActor();
      const result = await actor.getListings(
        [BigInt(nextStart || 0)],
        BigInt(5)
      );

      if (result.items.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const newNFTDataPromises = result.items.map(async (listing) => {
        const tokenId = listing.tokenId;
        const metadata = await actor.icrc7_metadata(tokenId);

        let location = "위치 정보 없음";
        let chargerCount = 0;

        if (metadata && metadata.length > 0 && metadata[0]) {
          const metadataEntries = metadata[0];
          for (const [key, value] of metadataEntries) {
            if (key === "location" && "Text" in value) {
              location = value.Text;
            } else if (key === "chargerCount" && "Nat" in value) {
              chargerCount = Number(value.Nat);
            }
          }
        }

        return {
          id: tokenId,
          name: `충전 허브 #${tokenId.toString()}`,
          location,
          price: listing.price,
          status: "available",
          chargerCount,
        };
      });

      const newNFTData = await Promise.all(newNFTDataPromises);
      setNfts((prev) => [...prev, ...newNFTData]);
      setNextStart(result.nextStart ? Number(result.nextStart) : null);
      setHasMore(!!result.nextStart);

      // 통계 업데이트
      const allNFTs = [...nfts, ...newNFTData];
      const stats = {
        totalNFTs: Number(result.total),
        availableNFTs: allNFTs.length,
        totalChargers: allNFTs.reduce((sum, nft) => sum + nft.chargerCount, 0),
        totalValue: allNFTs.reduce((sum, nft) => sum + Number(nft.price), 0),
      };
      setTotalStats(stats);
    } catch (error) {
      console.error("추가 NFT 데이터 로딩 실패:", error);
      message.error("추가 NFT 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const fetchInitialNFTs = async () => {
      try {
        const actor = await createActor();
        const result = await actor.getListings([], BigInt(5));

        if (result.items.length === 0) {
          setNfts([]);
          setTotalStats({
            totalNFTs: 0,
            availableNFTs: 0,
            totalChargers: 0,
            totalValue: 0,
          });
          setHasMore(false);
          setLoading(false);
          return;
        }

        const nftDataPromises = result.items.map(async (listing) => {
          const tokenId = listing.tokenId;
          const metadata = await actor.icrc7_metadata(tokenId);

          let location = "위치 정보 없음";
          let chargerCount = 0;

          if (metadata && metadata.length > 0 && metadata[0]) {
            const metadataEntries = metadata[0];
            for (const [key, value] of metadataEntries) {
              if (key === "location" && "Text" in value) {
                location = value.Text;
              } else if (key === "chargerCount" && "Nat" in value) {
                chargerCount = Number(value.Nat);
              }
            }
          }

          return {
            id: tokenId,
            name: `충전 허브 #${tokenId.toString()}`,
            location,
            price: listing.price,
            status: "available",
            chargerCount,
          };
        });

        const nftData = await Promise.all(nftDataPromises);
        setNfts(nftData);
        setNextStart(result.nextStart ? Number(result.nextStart) : null);
        setHasMore(!!result.nextStart);

        const stats = {
          totalNFTs: Number(result.total),
          availableNFTs: nftData.length,
          totalChargers: nftData.reduce(
            (sum, nft) => sum + nft.chargerCount,
            0
          ),
          totalValue: nftData.reduce((sum, nft) => sum + Number(nft.price), 0),
        };
        setTotalStats(stats);
      } catch (error) {
        console.error("NFT 데이터 로딩 실패:", error);
        message.error("NFT 데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialNFTs();
  }, []);

  const getErrorMessage = (error: any) => {
    if (typeof error === "object" && error !== null) {
      if ("NotOwner" in error) return "판매자가 아닙니다.";
      if ("AlreadyListed" in error) return "이미 판매 중인 NFT입니다.";
      if ("NotListed" in error) return "판매 중이 아닌 NFT입니다.";
      if ("InvalidPrice" in error) return "유효하지 않은 가격입니다.";
      if ("InsufficientBalance" in error) return "잔액이 부족합니다.";
      if ("TransferError" in error) return "NFT 전송 중 오류가 발생했습니다.";
    }
    return "알 수 없는 오류가 발생했습니다.";
  };

  const handleBuyNFT = async (nftId: bigint) => {
    try {
      setBuyingNFT(nftId);
      const actor = await createActor();

      const result = await actor.buyNFT(nftId);

      if ("ok" in result) {
        message.success("NFT 구매가 완료되었습니다.");
        setNfts((prevNfts) => prevNfts.filter((nft) => nft.id !== nftId));
        setTotalStats((prev) => ({
          ...prev,
          availableNFTs: prev.availableNFTs - 1,
        }));
      } else {
        message.error(`NFT 구매 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("NFT 구매 실패:", error);
      message.error("NFT 구매 중 오류가 발생했습니다.");
    } finally {
      setBuyingNFT(null);
    }
  };

  return (
    <div className="nft-market">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">NFT 마켓</h1>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="전체 충전 허브"
              value={totalStats.totalNFTs}
              suffix="개"
              prefix={<ShoppingCartOutlined style={{ color: "#0284c7" }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="판매중인 충전 허브"
              value={totalStats.availableNFTs}
              suffix="개"
              prefix={<BarChartOutlined style={{ color: "#0284c7" }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 설치 충전기"
              value={totalStats.totalChargers}
              suffix="대"
              prefix={<ThunderboltOutlined style={{ color: "#0284c7" }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="충전 허브 총 가치"
              value={totalStats.totalValue}
              suffix="PGC"
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="충전 허브 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          size="middle"
        />
      </div>

      {/* NFT 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <Spin size="large" />
        </div>
      ) : nfts.length === 0 ? (
        <Col span={24}>
          <Empty description="판매 중인 NFT가 없습니다." />
        </Col>
      ) : (
        <Row gutter={[16, 16]}>
          {nfts.map((nft, index) => (
            <Col
              key={nft.id.toString()}
              xs={24}
              sm={12}
              md={8}
              lg={6}
              ref={index === nfts.length - 1 ? lastNFTElementRef : undefined}
            >
              <Card title={nft.name} className="nft-card">
                <div className="mb-4">
                  <p className="flex items-center mb-2 text-gray-600">
                    <EnvironmentOutlined className="mr-3 text-sky-600" />
                    <span className="mr-2 font-medium">위치:</span>{" "}
                    {nft.location}
                  </p>
                  <p className="flex items-center mb-2 text-gray-600">
                    <DollarOutlined className="mr-3 text-sky-600" />
                    <span className="mr-2 font-medium">가격:</span>{" "}
                    {nft.price.toString()} PGC
                  </p>
                  <p className="flex items-center text-gray-600">
                    <ThunderboltOutlined className="mr-3 text-sky-600" />
                    <span className="mr-2 font-medium">충전기:</span>{" "}
                    {nft.chargerCount}대
                  </p>
                </div>
                <Button
                  type="primary"
                  onClick={() => handleBuyNFT(nft.id)}
                  loading={buyingNFT === nft.id}
                  className={nft.status === "sold" ? "sold-button" : ""}
                  disabled={nft.status === "sold" || buyingNFT === nft.id}
                  block
                >
                  {nft.status === "sold"
                    ? "판매 완료"
                    : buyingNFT === nft.id
                    ? "구매 처리 중..."
                    : "구매하기"}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {loadingMore && (
        <div className="py-4 text-center">
          <Spin size="small" />
          <p className="mt-2">추가 NFT를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
};

export default NFTMarket;
