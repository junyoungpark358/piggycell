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
  Tabs,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
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
} from "../../../declarations/piggycell_backend/piggycell_backend.did";
import "./NFTMarket.css";
import "../styles/components/StatisticCard.css";

interface MetadataValue {
  Text?: string;
  Nat?: bigint;
}

type MetadataEntry = [string, MetadataValue];
type Metadata = MetadataEntry[];

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

interface TransactionResponse {
  txType: string;
  nftId: string[] | null;
  user: string;
  amount: bigint;
  date: string;
}

interface TransactionPage {
  items: TransactionResponse[];
  total: number;
}

const NFTMarket = () => {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [soldNfts, setSoldNfts] = useState<NFTData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalNFTs: 0,
    availableNFTs: 0,
    soldNFTs: 0,
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
        const metadata = await actor.icrc7_token_metadata([tokenId]);

        let location = "위치 정보 없음";
        let chargerCount = 0;

        if (metadata && metadata.length > 0 && metadata[0]) {
          const metadataEntries = metadata[0] as Metadata;
          for (const [key, value] of metadataEntries) {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
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
        soldNFTs: Number(result.total) - allNFTs.length,
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

  const fetchSoldNFTs = async () => {
    try {
      const actor = await createActor();
      const totalSupply = await actor.icrc7_total_supply();

      // 모든 NFT ID 배열 생성
      const allNftIds = Array.from({ length: Number(totalSupply) }, (_, i) =>
        BigInt(i)
      );

      // 판매중인 NFT ID 목록 가져오기
      const listings = await actor.getListings([], BigInt(9999));
      const listedNftIds = new Set(
        listings.items.map((item) => Number(item.tokenId))
      );

      // 판매중이 아닌 NFT ID 필터링
      const soldNftIds = allNftIds.filter(
        (id) => !listedNftIds.has(Number(id))
      );

      // 판매 완료된 NFT 정보 조회
      const soldNFTPromises = soldNftIds.map(async (tokenId) => {
        const metadata = await actor.icrc7_token_metadata([tokenId]);

        let location = "위치 정보 없음";
        let chargerCount = 0;
        let price = BigInt(0);

        if (metadata && metadata.length > 0 && metadata[0]) {
          const metadataEntries = metadata[0] as Metadata;
          for (const [key, value] of metadataEntries) {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            } else if (key === "price" && value.Nat) {
              price = value.Nat;
            }
          }
        }

        return {
          id: tokenId,
          name: `충전 허브 #${tokenId.toString()}`,
          location,
          price,
          status: "sold",
          chargerCount,
        };
      });

      const soldNFTData = await Promise.all(soldNFTPromises);
      setSoldNfts(soldNFTData);
    } catch (error) {
      console.error("판매 완료된 NFT 데이터 로딩 실패:", error);
      message.error("판매 완료된 NFT 데이터를 불러오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    const fetchInitialNFTs = async () => {
      try {
        console.log("초기 NFT 데이터 로딩 시작");
        const actor = await createActor();
        console.log("Actor 생성 완료");

        const result = await actor.getListings([], BigInt(5));
        console.log("마켓 리스팅 결과:", result);

        // 전체 NFT 수 조회
        const totalSupply = await actor.icrc7_total_supply();
        console.log("전체 NFT 발행량:", Number(totalSupply));

        if (result.items.length === 0) {
          console.log("판매 중인 NFT가 없음");
          setNfts([]);
          setTotalStats({
            totalNFTs: Number(totalSupply),
            availableNFTs: 0,
            soldNFTs: Number(totalSupply),
            totalValue: 0,
          });
          setHasMore(false);
          setLoading(false);
          return;
        }

        const nftDataPromises = result.items.map(async (listing) => {
          const tokenId = listing.tokenId;
          console.log(`NFT #${tokenId} 메타데이터 조회 시작`);
          const metadata = await actor.icrc7_token_metadata([tokenId]);
          console.log(`NFT #${tokenId} 메타데이터:`, metadata);

          let location = "위치 정보 없음";
          let chargerCount = 0;

          if (metadata && metadata.length > 0 && metadata[0]) {
            const metadataEntries = metadata[0] as Metadata;
            for (const [key, value] of metadataEntries) {
              if (key === "location" && value.Text) {
                location = value.Text;
              } else if (key === "chargerCount" && value.Nat) {
                chargerCount = Number(value.Nat);
              }
            }
          }

          console.log(`NFT #${tokenId} 파싱 결과:`, { location, chargerCount });
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
        console.log("모든 NFT 데이터 로딩 완료:", nftData);

        setNfts(nftData);
        setNextStart(result.nextStart ? Number(result.nextStart) : null);
        setHasMore(!!result.nextStart);

        const stats = {
          totalNFTs: Number(totalSupply),
          availableNFTs: nftData.length,
          soldNFTs: Number(totalSupply) - nftData.length,
          totalValue: nftData.reduce((sum, nft) => sum + Number(nft.price), 0),
        };
        console.log("최종 통계 데이터:", stats);
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

  useEffect(() => {
    fetchSoldNFTs();
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
              title="판매 희망가 총액"
              value={totalStats.totalValue}
              suffix="PGC"
              prefix={<DollarOutlined style={{ color: "#0284c7" }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="판매 완료된 충전 허브"
              value={totalStats.soldNFTs}
              suffix="개"
              prefix={<CheckCircleOutlined style={{ color: "#0284c7" }} />}
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

      <Tabs
        defaultActiveKey="available"
        items={[
          {
            key: "available",
            label: "판매중인 충전 허브",
            children: loading ? (
              <div className="flex justify-center items-center h-screen">
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
                    ref={
                      index === nfts.length - 1 ? lastNFTElementRef : undefined
                    }
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
            ),
          },
          {
            key: "sold",
            label: "판매 완료된 충전 허브",
            children:
              soldNfts.length === 0 ? (
                <Col span={24}>
                  <Empty description="판매 완료된 NFT가 없습니다." />
                </Col>
              ) : (
                <Row gutter={[16, 16]}>
                  {soldNfts.map((nft) => (
                    <Col key={nft.id.toString()} xs={24} sm={12} md={8} lg={6}>
                      <Card title={nft.name} className="nft-card">
                        <div className="mb-4">
                          <p className="flex items-center mb-2 text-gray-600">
                            <EnvironmentOutlined className="mr-3 text-sky-600" />
                            <span className="mr-2 font-medium">위치:</span>{" "}
                            {nft.location}
                          </p>
                          <p className="flex items-center mb-2 text-gray-600">
                            <DollarOutlined className="mr-3 text-sky-600" />
                            <span className="mr-2 font-medium">
                              판매 가격:
                            </span>{" "}
                            {nft.price.toString()} PGC
                          </p>
                          <p className="flex items-center text-gray-600">
                            <ThunderboltOutlined className="mr-3 text-sky-600" />
                            <span className="mr-2 font-medium">충전기:</span>{" "}
                            {nft.chargerCount}대
                          </p>
                        </div>
                        <Button type="default" disabled block>
                          판매 완료
                        </Button>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
          },
        ]}
      />

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
