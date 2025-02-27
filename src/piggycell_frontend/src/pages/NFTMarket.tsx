import React from "react";
import { Row, Col, message, Spin, Empty, Tabs } from "antd";
import {
  SearchOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ThunderboltOutlined,
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
import { NFTCard } from "../components/NFTCard";
import { StatCard } from "../components/StatCard";
import { StyledInput } from "../components/common/StyledInput";
import { getMarketStats, NFTStats, createActor } from "../utils/statsApi";
import PageHeader from "../components/common/PageHeader";

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
  const [marketStats, setMarketStats] = useState<NFTStats>({
    totalSupply: 0,
    stakedCount: 0,
    activeUsers: 0,
    totalVolume: 0,
    availableNFTs: 0,
    soldNFTs: 0,
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

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            console.log("마지막 요소가 화면에 표시됨. 추가 데이터 로드 시작");
            fetchMoreNFTs();
          }
        },
        {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        }
      );

      if (node) {
        console.log("마지막 요소에 observer 연결됨");
        observer.current.observe(node);
      }
    },
    [loading, loadingMore, hasMore]
  );

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

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;
          metadataFields.forEach(([key, value]) => {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            }
          });
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
      const stats = await getMarketStats();
      setMarketStats(stats);
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
            if (key === "piggycell:location" && value.Text) {
              location = value.Text;
            } else if (key === "piggycell:charger_count" && value.Nat) {
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

  const fetchInitialNFTs = async (showMessage = false) => {
    try {
      // 로딩 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        const messageKey = "refreshMessage";
        message.loading({
          content: "데이터를 새로고침 중입니다...",
          key: messageKey,
          duration: 0,
        });
      }

      setLoading(true);
      const actor = await createActor();

      // 통계 데이터 가져오기
      const stats = await getMarketStats();
      setMarketStats(stats);

      // 리스팅 데이터 가져오기
      console.log("초기 NFT 데이터 로딩 시작");
      console.log("Actor 생성 완료");

      // 페이지 크기를 5에서 8로 증가
      const result = await actor.getListings([], BigInt(8));
      console.log("마켓 리스팅 결과:", result);
      console.log("마켓 리스팅 항목 수:", result.items.length);
      console.log(
        "마켓 리스팅 항목 세부 정보:",
        JSON.stringify(
          result.items,
          (_, v) => (typeof v === "bigint" ? v.toString() : v),
          2
        )
      );

      // 전체 NFT 수 조회
      const totalSupply = await actor.icrc7_total_supply();
      console.log("전체 NFT 발행량:", Number(totalSupply));

      // 총 거래량 조회
      const totalVolume = await actor.getTotalVolume();
      console.log("총 거래량:", Number(totalVolume));

      if (result.items.length === 0) {
        console.log("판매 중인 NFT가 없음");
        setNfts([]);
        setMarketStats({
          totalSupply: Number(totalSupply),
          availableNFTs: 0,
          soldNFTs: Number(totalSupply),
          totalVolume: Number(totalVolume),
          stakedCount: 0,
          activeUsers: 0,
        });
        setHasMore(false);

        // 성공 메시지는 showMessage가 true일 때만 표시
        if (showMessage) {
          message.success({
            content: "새로고침 완료!",
            key: "refreshMessage",
            duration: 2,
          });
        }

        setLoading(false);
        return;
      }

      const nftDataPromises = result.items.map(async (listing) => {
        const tokenId = listing.tokenId;
        const metadata = await actor.icrc7_token_metadata([tokenId]);

        let location = "위치 정보 없음";
        let chargerCount = 0;

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;
          metadataFields.forEach(([key, value]) => {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            }
          });
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

      // 통계 업데이트
      const avail = Number(result.total);
      const total = Number(totalSupply);
      const sold = total - avail;

      console.log("통계 계산 상세:", {
        "전체 NFT (totalSupply)": total,
        "판매중 NFT (result.total)": avail,
        "계산된 판매완료 NFT (totalSupply - result.total)": sold,
        "현재 페이지 NFT 개수": nftData.length,
        "모든 NFT 정보": nftData,
      });

      setMarketStats({
        totalSupply: total,
        availableNFTs: avail,
        soldNFTs: sold,
        totalVolume: Number(totalVolume),
        stakedCount: 0,
        activeUsers: 0,
      });

      // 성공 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        message.success({
          content: "새로고침 완료!",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } catch (error) {
      console.error("NFT 데이터 로딩 실패:", error);

      // 실패 메시지는 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "NFT 데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 로딩 시에는 메시지를 표시하지 않음 (showMessage = false)
    fetchInitialNFTs(false);
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

      // 먼저 사용자의 PGC 잔액 확인
      const authManager = AuthManager.getInstance();
      const userPrincipal = await authManager.getPrincipal();
      if (!userPrincipal) {
        message.error("로그인이 필요합니다.");
        return;
      }

      // 현재 NFT 가격 확인
      const nftInfo = nfts.find((nft) => nft.id === nftId);
      if (!nftInfo) {
        message.error("NFT 정보를 찾을 수 없습니다.");
        return;
      }

      // 사용자의 PGC 잔액 확인
      const account = {
        owner: userPrincipal,
        subaccount: [] as [] | [Uint8Array],
      };
      const balance = await actor.icrc1_balance_of(account);

      // 잔액이 부족한 경우
      if (balance < nftInfo.price) {
        const formattedBalance = Number(balance) / Math.pow(10, 8); // 8 decimal places for PGC
        const formattedPrice = Number(nftInfo.price) / Math.pow(10, 8);
        message.error(
          `잔액이 부족합니다. 현재 잔액: ${formattedBalance.toFixed(
            2
          )} PGC, 필요한 금액: ${formattedPrice.toFixed(2)} PGC`
        );
        return;
      }

      // NFT 구매 시도
      const result = await actor.buyNFT(nftId);

      if ("ok" in result) {
        message.success("NFT 구매가 완료되었습니다.");
        setNfts((prevNfts) => prevNfts.filter((nft) => nft.id !== nftId));
        setMarketStats((prev) => ({
          ...prev,
          availableNFTs: (prev.availableNFTs || 0) - 1,
          soldNFTs: (prev.soldNFTs || 0) + 1,
        }));
      } else {
        message.error(`구매 실패: ${getErrorMessage(result.err)}`);
      }
    } catch (error) {
      console.error("NFT 구매 실패:", error);
      message.error("NFT 구매 중 오류가 발생했습니다.");
    } finally {
      setBuyingNFT(null);
    }
  };

  return (
    <div className="nft-market-page">
      <PageHeader
        title="마켓플레이스"
        onRefresh={() => fetchInitialNFTs(true)}
      />

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 NFT"
            value={marketStats.totalSupply}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="판매 중인 NFT"
            value={marketStats.availableNFTs || 0}
            prefix={<ThunderboltOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="판매 완료 NFT"
            value={marketStats.soldNFTs || 0}
            prefix={<CheckCircleOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 거래량"
            value={marketStats.totalVolume}
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
      </Row>

      <div className="mb-4 search-box">
        <StyledInput
          placeholder="충전 허브 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          customSize="md"
        />
      </div>

      <Tabs
        defaultActiveKey="available"
        items={[
          {
            key: "available",
            label: "판매 중인 NFT",
            children: (
              <Row gutter={[24, 24]} className="nft-grid">
                {nfts.map((nft, index) => (
                  <Col
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    key={nft.id.toString()}
                    ref={
                      index === nfts.length - 1 ? lastNFTElementRef : undefined
                    }
                  >
                    <NFTCard
                      name={nft.name}
                      location={nft.location}
                      chargerCount={nft.chargerCount}
                      price={Number(nft.price)}
                      status="available"
                      onBuy={() => handleBuyNFT(nft.id)}
                      loading={buyingNFT === nft.id}
                      primaryButtonText="구매하기"
                    />
                  </Col>
                ))}
                {(loading || loadingMore) && (
                  <Col span={24} className="my-5 text-center">
                    <Spin size="large" />
                  </Col>
                )}
                {!loading && !loadingMore && nfts.length === 0 && (
                  <Col span={24} className="my-5 text-center">
                    <Empty description="판매중인 NFT가 없습니다" />
                  </Col>
                )}
              </Row>
            ),
          },
          {
            key: "sold",
            label: "판매 완료된 NFT",
            children: (
              <Row gutter={[24, 24]} className="nft-grid">
                {soldNfts.map((nft) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={nft.id.toString()}>
                    <NFTCard
                      name={nft.name}
                      location={nft.location}
                      chargerCount={nft.chargerCount}
                      price={Number(nft.price)}
                      status="sold"
                      primaryButtonText="판매 완료"
                    />
                  </Col>
                ))}
                {loading && (
                  <Col span={24} className="my-5 text-center">
                    <Spin size="large" />
                  </Col>
                )}
                {!loading && soldNfts.length === 0 && (
                  <Col span={24} className="my-5 text-center">
                    <Empty description="판매 완료된 NFT가 없습니다" />
                  </Col>
                )}
              </Row>
            ),
          },
        ]}
      />

      <div className="mt-6 text-center text-gray-500">
        {hasMore ? (
          loadingMore ? (
            <p>추가 NFT 로딩 중...</p>
          ) : (
            <p>더 많은 NFT를 보려면 스크롤하세요</p>
          )
        ) : (
          nfts.length > 0 && <p>모든 NFT가 로드되었습니다</p>
        )}
      </div>
    </div>
  );
};

export default NFTMarket;
