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
  AllowanceArgs,
  ApproveArgs,
} from "../../../declarations/piggycell_backend/piggycell_backend.did";
import "./NFTMarket.css";
import { NFTCard } from "../components/NFTCard";
import { StatCard } from "../components/StatCard";
import { StyledInput } from "../components/common/StyledInput";
import { getMarketStats, NFTStats, createActor } from "../utils/statsApi";
import PageHeader from "../components/common/PageHeader";
import { formatTokenDisplayForUI, formatPGCBalance } from "../utils/tokenUtils";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [soldHasMore, setSoldHasMore] = useState(true);
  const [soldNextStart, setSoldNextStart] = useState<number | null>(null);
  const [loadingMoreSold, setLoadingMoreSold] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("available");

  // 각 탭마다 별도의 Observer 관리
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());
  // 스크롤 위치 감지를 위한 추가 이벤트 리스너 관리
  const scrollListenerActive = useRef<boolean>(false);
  // 마지막 로드 시간 추적 (너무 빈번한 호출 방지)
  const lastLoadTime = useRef<{ available: number; sold: number }>({
    available: 0,
    sold: 0,
  });

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 모든 observer 정리
      observersRef.current.forEach((observer) => observer.disconnect());
      observersRef.current.clear();

      // 스크롤 이벤트 제거
      if (scrollListenerActive.current) {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // 스크롤 이벤트 핸들러 - 스로틀링 적용
  const handleScroll = useCallback(() => {
    // 현재 시간
    const now = Date.now();
    // 스로틀링 - 마지막 로드 후 300ms 이내에는 다시 로드하지 않음
    const throttleTime = 300;
    const activeTabLastLoad =
      activeTab === "available"
        ? lastLoadTime.current.available
        : lastLoadTime.current.sold;

    if (now - activeTabLastLoad < throttleTime) {
      return;
    }

    // 페이지가 거의 하단에 도달했는지 확인
    const scrollPercent =
      (window.innerHeight + window.scrollY) / document.body.offsetHeight;

    // 페이지의 70% 이상을 스크롤한 경우 추가 로드
    if (scrollPercent > 0.7) {
      if (activeTab === "available" && hasMore && !loadingMore) {
        console.log("스크롤이 70% 이상에 도달했습니다. 추가 NFT 로드");
        lastLoadTime.current.available = now;
        fetchMoreNFTs();
      } else if (activeTab === "sold" && soldHasMore && !loadingMoreSold) {
        console.log(
          "스크롤이 70% 이상에 도달했습니다. 추가 판매 완료 NFT 로드"
        );
        lastLoadTime.current.sold = now;
        fetchMoreSoldNFTs();
      }
    }
  }, [activeTab, hasMore, loadingMore, soldHasMore, loadingMoreSold]);

  // 탭 변경 시 스크롤 이벤트 리스너 업데이트
  useEffect(() => {
    // 이전 스크롤 이벤트 제거
    if (scrollListenerActive.current) {
      window.removeEventListener("scroll", handleScroll);
      scrollListenerActive.current = false;
    }

    // 새 스크롤 이벤트 추가 (현재 탭에 더 불러올 데이터가 있는 경우만)
    if (
      (activeTab === "available" && hasMore) ||
      (activeTab === "sold" && soldHasMore)
    ) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      scrollListenerActive.current = true;
    }

    return () => {
      if (scrollListenerActive.current) {
        window.removeEventListener("scroll", handleScroll);
        scrollListenerActive.current = false;
      }
    };
  }, [activeTab, hasMore, soldHasMore, handleScroll]);

  // 개선된 NFT 관찰 함수 - 각 요소마다 별도의 observer 사용
  const getNFTRefCallback = useCallback(
    (index: number, total: number) => {
      // 관찰할 요소 결정: 마지막 5개 요소를 모두 관찰
      const observeCount = Math.min(5, total);
      const shouldObserve = total > 0 && index >= total - observeCount;

      if (!shouldObserve || loading || activeTab !== "available")
        return undefined;

      return (node: HTMLDivElement | null) => {
        if (!node) return;

        // 기존 observer 제거
        const observerId = `available-${index}`;
        if (observersRef.current.has(observerId)) {
          const oldObserver = observersRef.current.get(observerId);
          oldObserver?.disconnect();
          observersRef.current.delete(observerId);
        }

        // 새 observer 생성
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore) {
              console.log(
                `Available 탭: ${index}번째 요소가 화면에 표시됨. 추가 데이터 로드 시작`
              );
              const now = Date.now();
              if (now - lastLoadTime.current.available > 300) {
                // 300ms 스로틀링
                lastLoadTime.current.available = now;
                fetchMoreNFTs();
              }
            }
          },
          {
            root: null,
            rootMargin: "200px", // 더 넓은 감지 영역
            threshold: 0.1, // 작은 부분만 보여도 감지
          }
        );

        observer.observe(node);
        observersRef.current.set(observerId, observer);
      };
    },
    [loading, loadingMore, hasMore, activeTab]
  );

  // 판매 완료된 NFT용 개선된 ref 콜백
  const getSoldNFTRefCallback = useCallback(
    (index: number, total: number) => {
      // 관찰할 요소 결정: 마지막 5개 요소를 모두 관찰
      const observeCount = Math.min(5, total);
      const shouldObserve = total > 0 && index >= total - observeCount;

      if (!shouldObserve || loading || activeTab !== "sold") return undefined;

      return (node: HTMLDivElement | null) => {
        if (!node) return;

        // 기존 observer 제거
        const observerId = `sold-${index}`;
        if (observersRef.current.has(observerId)) {
          const oldObserver = observersRef.current.get(observerId);
          oldObserver?.disconnect();
          observersRef.current.delete(observerId);
        }

        // 새 observer 생성
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && soldHasMore && !loadingMoreSold) {
              console.log(
                `Sold 탭: ${index}번째 요소가 화면에 표시됨. 추가 데이터 로드 시작`
              );
              const now = Date.now();
              if (now - lastLoadTime.current.sold > 300) {
                // 300ms 스로틀링
                lastLoadTime.current.sold = now;
                fetchMoreSoldNFTs();
              }
            }
          },
          {
            root: null,
            rootMargin: "200px", // 더 넓은 감지 영역
            threshold: 0.1, // 작은 부분만 보여도 감지
          }
        );

        observer.observe(node);
        observersRef.current.set(observerId, observer);
      };
    },
    [loading, loadingMoreSold, soldHasMore, activeTab]
  );

  // 탭 변경 시 observer 정리
  useEffect(() => {
    // 모든 observer 정리
    observersRef.current.forEach((observer) => observer.disconnect());
    observersRef.current.clear();
  }, [activeTab]);

  const fetchMoreNFTs = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      console.log("추가 NFT 로드 시작, 현재 개수:", nfts.length);
      const actor = await createActor();
      const result = await actor.getListings(
        [BigInt(nextStart || 0)],
        BigInt(12) // 더 많은 데이터를 한번에 가져오기
      );

      if (result.items.length === 0) {
        console.log("더 이상 불러올 NFT가 없습니다.");
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const newNFTDataPromises = result.items.map(async (listing) => {
        const tokenId = listing.tokenId;
        // 이미 로드된 NFT인지 확인
        const isDuplicate = nfts.some(
          (nft) => nft.id.toString() === tokenId.toString()
        );
        if (isDuplicate) {
          console.log(`중복 NFT 발견: ${tokenId.toString()}, 건너뜁니다.`);
          return null;
        }

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

      const newNFTData = (await Promise.all(newNFTDataPromises)).filter(
        Boolean
      ) as NFTData[];
      console.log(`새 NFT ${newNFTData.length}개 로드됨, 중복 제외`);

      // 실제로 추가할 새 데이터가 없는 경우 더 이상 불러올 항목이 없음을 표시
      if (newNFTData.length === 0) {
        console.log("모든 새 NFT가 중복이므로 더 이상 불러올 항목이 없습니다.");
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      // 중복 확인 후 추가
      setNfts((prev) => {
        const uniqueNewNFTs = newNFTData.filter(
          (newNFT) =>
            !prev.some(
              (existingNFT) =>
                existingNFT.id.toString() === newNFT.id.toString()
            )
        );
        console.log(`최종 추가되는 NFT 개수: ${uniqueNewNFTs.length}개`);

        // 실제로 추가할 항목이 없는 경우 hasMore를 false로 설정
        if (uniqueNewNFTs.length === 0) {
          setHasMore(false);
          return prev;
        }

        return [...prev, ...uniqueNewNFTs];
      });

      // nextStart가 없으면 더 이상 데이터가 없음
      setNextStart(result.nextStart ? Number(result.nextStart) : null);
      setHasMore(!!result.nextStart);

      // 통계 업데이트
      const stats = await getMarketStats();
      setMarketStats(stats);
    } catch (error) {
      console.error("추가 NFT 데이터 로딩 실패:", error);
      message.error("추가 NFT 데이터를 불러오는데 실패했습니다.");
      setHasMore(false); // 오류 발생 시 더 이상 로드하지 않음
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchMoreSoldNFTs = async () => {
    if (!soldHasMore || loadingMoreSold) return;

    try {
      setLoadingMoreSold(true);
      console.log(
        "판매 완료된 NFT 추가 로드 시작, 현재 개수:",
        soldNfts.length
      );
      const actor = await createActor();

      console.log(
        `판매 완료된 NFT 추가 로드 시작, 시작 인덱스: ${soldNextStart}`
      );
      // @ts-ignore - 새로 추가된 메서드이므로 타입 정의가 아직 없음
      const result = await actor.getSoldNFTs(
        soldNextStart !== null ? [BigInt(soldNextStart)] : [],
        BigInt(12) // 더 많은 데이터를 한번에 가져오기
      );

      console.log("판매 완료된 NFT 추가 로드 결과:", result);
      console.log("결과에 포함된 아이템 수:", result.items.length);

      if (result.items.length === 0) {
        console.log("더 이상 불러올 판매 완료 NFT가 없습니다.");
        setSoldHasMore(false);
        setLoadingMoreSold(false);
        return;
      }

      const soldNFTDataPromises = result.items.map(async (listing: Listing) => {
        const tokenId = listing.tokenId;
        // 이미 로드된 NFT인지 확인
        const isDuplicate = soldNfts.some(
          (nft) => nft.id.toString() === tokenId.toString()
        );
        if (isDuplicate) {
          console.log(
            `중복 판매 완료 NFT 발견: ${tokenId.toString()}, 건너뜁니다.`
          );
          return null;
        }

        const metadata = await actor.icrc7_token_metadata([tokenId]);

        let location = "위치 정보 없음";
        let chargerCount = 0;
        let price = listing.price;

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;
          metadataFields.forEach(([key, value]) => {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            } else if (key === "price" && value.Nat) {
              price = value.Nat;
            }
            if (key === "piggycell:location" && value.Text) {
              location = value.Text;
            } else if (key === "piggycell:charger_count" && value.Nat) {
              chargerCount = Number(value.Nat);
            }
          });
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

      const soldNFTData = (await Promise.all(soldNFTDataPromises)).filter(
        Boolean
      ) as NFTData[];
      console.log(`새 판매 완료 NFT ${soldNFTData.length}개 로드됨, 중복 제외`);

      // 실제로 추가할 새 데이터가 없는 경우 더 이상 불러올 항목이 없음을 표시
      if (soldNFTData.length === 0) {
        console.log(
          "모든 새 판매 완료 NFT가 중복이므로 더 이상 불러올 항목이 없습니다."
        );
        setSoldHasMore(false);
        setLoadingMoreSold(false);
        return;
      }

      // 중복 확인 후 추가
      setSoldNfts((prev) => {
        const uniqueNewNFTs = soldNFTData.filter(
          (newNFT) =>
            !prev.some(
              (existingNFT) =>
                existingNFT.id.toString() === newNFT.id.toString()
            )
        );
        console.log(
          `최종 추가되는 판매 완료 NFT 개수: ${uniqueNewNFTs.length}개`
        );

        // 실제로 추가할 항목이 없는 경우 soldHasMore를 false로 설정
        if (uniqueNewNFTs.length === 0) {
          setSoldHasMore(false);
          return prev;
        }

        return [...prev, ...uniqueNewNFTs];
      });

      // nextStart가 없으면 더 이상 데이터가 없음
      setSoldNextStart(result.nextStart ? Number(result.nextStart) : null);
      setSoldHasMore(!!result.nextStart);
    } catch (error) {
      console.error("판매 완료된 NFT 추가 데이터 로딩 실패:", error);
      message.error("판매 완료된 NFT 추가 데이터를 불러오는데 실패했습니다.");
      setSoldHasMore(false); // 오류 발생 시 더 이상 로드하지 않음
    } finally {
      setLoadingMoreSold(false);
    }
  };

  const fetchSoldNFTs = async () => {
    try {
      console.log("판매 완료된 NFT 초기 로드 시작");
      const actor = await createActor();

      // 초기 상태에서는 첫 페이지부터 로드
      const startIndex = soldNextStart !== null ? [BigInt(soldNextStart)] : [];
      console.log(
        `판매 완료 NFT 로드 시작 인덱스: ${
          startIndex.length > 0 ? startIndex[0].toString() : "처음부터"
        }`
      );

      // @ts-ignore - 새로 추가된 메서드이므로 타입 정의가 아직 없음
      const result = await actor.getSoldNFTs(startIndex, BigInt(12));
      console.log("판매 완료된 NFT 로드 결과:", result);
      console.log("로드된 데이터 개수:", result.items.length);

      if (result.items.length === 0) {
        // 초기 로드일 경우(soldNextStart가 null)에만 배열 초기화
        if (soldNextStart === null) {
          setSoldNfts([]);
        }
        setSoldHasMore(false);
        return;
      }

      const soldNFTDataPromises = result.items.map(async (listing: Listing) => {
        const tokenId = listing.tokenId;
        console.log(`판매 완료 NFT 정보 로드 중: ${tokenId.toString()}`);

        // 초기 로드가 아닐 경우 중복 확인 (초기 로드일 때는 이미 상태가 비어있음)
        if (soldNextStart !== null) {
          const isDuplicate = soldNfts.some(
            (nft) => nft.id.toString() === tokenId.toString()
          );
          if (isDuplicate) {
            console.log(
              `중복 판매 완료 NFT 발견: ${tokenId.toString()}, 건너뜁니다.`
            );
            return null;
          }
        }

        const metadata = await actor.icrc7_token_metadata([tokenId]);

        let location = "위치 정보 없음";
        let chargerCount = 0;
        let price = listing.price;

        if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
          const metadataFields = metadata[0][0] as Array<
            [string, { Text?: string; Nat?: bigint }]
          >;
          metadataFields.forEach(([key, value]) => {
            if (key === "location" && value.Text) {
              location = value.Text;
            } else if (key === "chargerCount" && value.Nat) {
              chargerCount = Number(value.Nat);
            } else if (key === "price" && value.Nat) {
              price = value.Nat;
            }
            if (key === "piggycell:location" && value.Text) {
              location = value.Text;
            } else if (key === "piggycell:charger_count" && value.Nat) {
              chargerCount = Number(value.Nat);
            }
          });
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

      const soldNFTData = (await Promise.all(soldNFTDataPromises)).filter(
        Boolean
      ) as NFTData[];
      console.log(`새 판매 완료 NFT ${soldNFTData.length}개 로드됨, 중복 제외`);

      if (soldNFTData.length === 0) {
        console.log("추가할 새 판매 완료 NFT가 없습니다.");
        setSoldHasMore(false);
        return;
      }

      // 판매 완료된 NFT 데이터 설정
      setSoldNfts((prev) => {
        // 첫 페이지 로드인 경우 이전 데이터를 모두 지우고 새로 설정
        if (soldNextStart === null) {
          console.log("판매 완료 NFT 목록을 처음부터 새로 로드합니다.");
          return soldNFTData;
        }

        // 추가 로드의 경우 중복 제거 후 추가
        const uniqueNewNFTs = soldNFTData.filter(
          (newNFT) =>
            !prev.some(
              (existingNFT) =>
                existingNFT.id.toString() === newNFT.id.toString()
            )
        );

        return [...prev, ...uniqueNewNFTs];
      });

      // 다음 페이지 정보 업데이트
      setSoldNextStart(result.nextStart ? Number(result.nextStart) : null);
      setSoldHasMore(!!result.nextStart);
    } catch (error) {
      console.error("판매 완료된 NFT 데이터 로딩 실패:", error);
      message.error("판매 완료된 NFT 데이터를 불러오는데 실패했습니다.");
    }
  };

  const fetchInitialNFTs = async (showMessage = false) => {
    try {
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

      const stats = await getMarketStats();
      setMarketStats(stats);

      console.log("초기 NFT 데이터 로딩 시작");
      console.log("Actor 생성 완료");

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

      const totalSupply = await actor.icrc7_total_supply();
      console.log("전체 NFT 발행량:", Number(totalSupply));

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

      await fetchSoldNFTs();

      if (showMessage) {
        message.success({
          content: "새로고침 완료!",
          key: "refreshMessage",
          duration: 2,
        });
      }
    } catch (error) {
      console.error("NFT 데이터 로딩 실패:", error);

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

  const checkAuthentication = async () => {
    const authManager = AuthManager.getInstance();
    const authenticated = await authManager.isAuthenticated();
    setIsAuthenticated(authenticated);
    return authenticated;
  };

  useEffect(() => {
    checkAuthentication();
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
      console.log(`NFT 구매 시작 - NFT ID: ${nftId.toString()}`);
      setBuyingNFT(nftId);

      const authenticated = await checkAuthentication();
      if (!authenticated) {
        message.error({
          content: "NFT를 구매하려면 로그인이 필요합니다.",
          key: "loginRequired",
          duration: 5,
        });
        setBuyingNFT(null);
        return;
      }

      const actor = await createActor();
      console.log("백엔드 액터 생성 완료");

      const authManager = AuthManager.getInstance();
      const userPrincipal = await authManager.getPrincipal();
      if (!userPrincipal) {
        message.error({
          content: "NFT를 구매하려면 로그인이 필요합니다.",
          key: "loginRequired",
          duration: 5,
        });
        setBuyingNFT(null);
        return;
      }
      console.log(`구매자 Principal: ${userPrincipal.toString()}`);

      console.log("NFT 판매 상태 확인 중...");
      const listingsResult = await actor.getListings([], BigInt(999));
      const isStillListed = listingsResult.items.some(
        (listing) => listing.tokenId === nftId
      );

      if (!isStillListed) {
        console.log(`NFT ID ${nftId.toString()}는 더 이상 판매 중이 아닙니다.`);
        message.error({
          content:
            "이 NFT는 더 이상 판매 중이 아닙니다. 다른 사용자가 이미 구매했을 수 있습니다.",
          key: "nftNotAvailable",
        });
        setBuyingNFT(null);
        return;
      }
      console.log(
        `NFT ID ${nftId.toString()}는 여전히 판매 중입니다. 구매 계속 진행...`
      );

      const nftInfo = nfts.find((nft) => nft.id === nftId);
      if (!nftInfo) {
        message.error("NFT 정보를 찾을 수 없습니다.");
        setBuyingNFT(null);
        return;
      }
      console.log(
        `NFT 정보: ID=${nftId.toString()}, 가격=${nftInfo.price.toString()}, 위치=${
          nftInfo.location
        }`
      );

      let marketCanisterPrincipal: Principal;
      try {
        marketCanisterPrincipal = await actor.getMarketCanisterPrincipal();
        console.log(
          `마켓 캐니스터 Principal: ${marketCanisterPrincipal.toString()}`
        );
      } catch (error) {
        console.error("마켓 캐니스터 Principal 조회 실패:", error);
        message.error("마켓 정보를 가져오는데 실패했습니다.");
        setBuyingNFT(null);
        return;
      }

      const account = {
        owner: userPrincipal,
        subaccount: [] as [] | [Uint8Array],
      };
      console.log("잔액 확인 요청 중...");
      const balance = await actor.icrc1_balance_of(account);
      console.log(`잔액: ${balance.toString()}`);
      console.log(`구매 전 잔액: ${balance.toString()}`);

      // 잔액이 부족한 경우
      if (balance < nftInfo.price) {
        const formattedBalance = formatTokenDisplayForUI(balance);
        const formattedPrice = formatTokenDisplayForUI(nftInfo.price);
        console.log(
          `잔액 부족: 현재=${formattedBalance}, 필요=${formattedPrice}`
        );
        message.error(
          `잔액이 부족합니다. 현재 잔액: ${formattedBalance.toFixed(
            2
          )} PGC, 필요한 금액: ${formattedPrice.toFixed(2)} PGC`
        );
        setBuyingNFT(null);
        return;
      }

      // 한번 더 NFT가 여전히 판매 중인지 확인 (동시성 문제 대비)
      console.log("NFT 판매 상태 재확인 중...");
      const latestListingsResult = await actor.getListings([], BigInt(999));
      const isStillAvailable = latestListingsResult.items.some(
        (listing) => listing.tokenId === nftId
      );

      if (!isStillAvailable) {
        console.log(
          `재확인: NFT ID ${nftId.toString()}는 더 이상 판매 중이 아닙니다.`
        );
        message.error(
          "이 NFT는 더 이상 판매 중이 아닙니다. 다른 사용자가 이미 구매했을 수 있습니다."
        );
        setBuyingNFT(null);
        return;
      }

      // 현재 승인 금액 확인
      const allowanceArgs: AllowanceArgs = {
        account: account,
        spender: {
          owner: marketCanisterPrincipal,
          subaccount: [] as [] | [Uint8Array],
        },
      };

      console.log("현재 승인 금액 확인 중...");
      const currentAllowanceResponse = await actor.icrc2_allowance(
        allowanceArgs
      );
      const currentAllowance = currentAllowanceResponse.allowance;
      console.log(`현재 승인 금액: ${currentAllowance.toString()}`);

      // 승인 금액이 부족한 경우, 추가 승인 요청
      if (currentAllowance < nftInfo.price) {
        console.log(
          `승인 금액 부족: 현재=${currentAllowance}, 필요=${nftInfo.price}`
        );
        message.loading({
          content: "토큰 사용 승인 요청 중...",
          key: "approveMessage",
        });

        const approveArgs: ApproveArgs = {
          from_subaccount: [] as [] | [Uint8Array],
          spender: {
            owner: marketCanisterPrincipal,
            subaccount: [] as [] | [Uint8Array],
          },
          amount: nftInfo.price,
          expected_allowance: [currentAllowance],
          expires_at: [] as [] | [bigint],
          fee: [] as [] | [bigint],
          memo: [] as [] | [Uint8Array],
          created_at_time: [] as [] | [bigint],
        };

        console.log(`토큰 승인 요청: 승인 금액=${nftInfo.price.toString()}`);
        const approveResult = await actor.icrc2_approve(approveArgs);

        if ("Err" in approveResult) {
          console.error("토큰 승인 실패:", approveResult.Err);
          message.error({
            content: `토큰 승인 실패: ${JSON.stringify(approveResult.Err)}`,
            key: "approveMessage",
          });
          setBuyingNFT(null);
          return;
        }

        console.log("토큰 승인 성공:", approveResult.Ok);
        message.success({
          content: "토큰 사용이 승인되었습니다.",
          key: "approveMessage",
        });
      } else {
        console.log(
          `승인 금액 충분함: 현재=${currentAllowance}, 필요=${nftInfo.price}`
        );
      }

      // 마지막으로 NFT가 여전히 판매 중인지 최종 확인
      console.log("NFT 판매 상태 최종 확인 중...");
      const finalListingsResult = await actor.getListings([], BigInt(999));
      const isFinallyAvailable = finalListingsResult.items.some(
        (listing) => listing.tokenId === nftId
      );

      if (!isFinallyAvailable) {
        console.log(
          `최종 확인: NFT ID ${nftId.toString()}는 더 이상 판매 중이 아닙니다.`
        );
        message.error(
          "이 NFT는 더 이상 판매 중이 아닙니다. 다른 사용자가 이미 구매했을 수 있습니다."
        );
        setBuyingNFT(null);
        return;
      }

      // NFT 구매 시도
      message.loading({
        content: "NFT 구매 처리 중...",
        key: "buyMessage",
      });

      console.log(`NFT 구매 요청 시작 - 가격: ${nftInfo.price.toString()} PGC`);

      // NFT 구매 요청
      const result = await actor.buyNFT(nftId);
      console.log(
        "NFT 구매 응답 받음:",
        JSON.stringify(result, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      );

      if ("ok" in result) {
        console.log("NFT 구매 성공");

        // 구매 후 잔액 재확인
        const newBalance = await actor.icrc1_balance_of(account);
        console.log(`구매 후 잔액: ${newBalance.toString()}`);
        console.log(
          `잔액 차이: ${(Number(balance) - Number(newBalance)).toString()} PGC`
        );

        message.success({
          content: "NFT 구매가 완료되었습니다!",
          key: "buyMessage",
          duration: 3,
        });

        // 구매한 NFT 찾기
        const boughtNFT = nfts.find((nft) => nft.id === nftId);

        // 판매 중인 NFT 목록에서 제거
        setNfts((prevNfts) => prevNfts.filter((nft) => nft.id !== nftId));

        // 방법 2: 판매 완료된 NFT 목록 전체 새로고침 (백엔드에서 정렬된 최신 데이터 가져오기)
        // 판매 완료된 NFT 목록을 초기화하고 첫 페이지부터 다시 가져옵니다
        setSoldNfts([]); // 기존 데이터 초기화
        setSoldNextStart(null); // 첫 페이지부터 다시 가져오기
        setSoldHasMore(true); // 더 불러올 수 있도록 설정
        fetchSoldNFTs(); // 백엔드에서 최신 정렬된 데이터 가져오기

        // 구매 완료 후 '판매 완료' 탭으로 전환
        setActiveTab("sold");

        // 마켓 통계 업데이트 - 총 거래량도 함께 업데이트
        setMarketStats((prev) => ({
          ...prev,
          availableNFTs: (prev.availableNFTs || 0) - 1,
          soldNFTs: (prev.soldNFTs || 0) + 1,
          totalVolume: (prev.totalVolume || 0) + Number(nftInfo.price),
        }));
      } else {
        console.error("NFT 구매 실패:", result.err);

        // 특정 오류 타입 처리
        if (result.err && typeof result.err === "object") {
          if ("InsufficientBalance" in result.err) {
            message.error({
              content:
                "잔액이 부족합니다. 충분한 PGC 토큰을 보유하고 있는지 확인하세요.",
              key: "buyMessage",
            });
          } else if ("NotListed" in result.err) {
            message.error({
              content:
                "이 NFT는 더 이상 판매 중이 아닙니다. 다른 사용자가 이미 구매했을 수 있습니다.",
              key: "buyMessage",
            });
          } else {
            message.error({
              content: `구매 실패: ${getErrorMessage(result.err)}`,
              key: "buyMessage",
            });
          }
        } else {
          message.error({
            content: "알 수 없는 오류가 발생했습니다.",
            key: "buyMessage",
          });
        }
      }
    } catch (error) {
      console.error("NFT 구매 중 예외 발생:", error);
      message.error({
        content: "NFT 구매 중 오류가 발생했습니다.",
        key: "buyMessage",
      });
    } finally {
      console.log("NFT 구매 프로세스 종료");
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
            formatter={(value) => formatPGCBalance(value)}
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
        key="nft-market-tabs"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: "available",
            label: `판매 중인 NFT (${marketStats.availableNFTs})`,
            children: (
              <Row gutter={[24, 24]} className="nft-grid">
                {nfts.map((nft, index) => (
                  <Col
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    key={nft.id.toString()}
                    ref={getNFTRefCallback(index, nfts.length)}
                    data-index={index}
                  >
                    <NFTCard
                      name={nft.name}
                      location={nft.location}
                      chargerCount={nft.chargerCount}
                      price={nft.price}
                      status="available"
                      onBuy={() => handleBuyNFT(nft.id)}
                      loading={buyingNFT === nft.id}
                      primaryButtonText="구매하기"
                      isAuthenticated={isAuthenticated}
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
            label: `판매 완료된 NFT (${marketStats.soldNFTs})`,
            children: (
              <Row gutter={[24, 24]} className="nft-grid">
                {soldNfts.map((nft, index) => (
                  <Col
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                    key={nft.id.toString()}
                    ref={getSoldNFTRefCallback(index, soldNfts.length)}
                    data-sold-index={index}
                  >
                    <NFTCard
                      name={nft.name}
                      location={nft.location}
                      chargerCount={nft.chargerCount}
                      price={nft.price}
                      status="sold"
                      primaryButtonText="판매 완료"
                    />
                  </Col>
                ))}
                {(loading || loadingMoreSold) && (
                  <Col span={24} className="my-5 text-center">
                    <Spin size="large" />
                  </Col>
                )}
                {!loading && !loadingMoreSold && soldNfts.length === 0 && (
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
        {activeTab === "available" ? (
          hasMore ? (
            loadingMore ? (
              <p>추가 NFT 로딩 중...</p>
            ) : (
              nfts.length > 0 && (
                <p>계속 스크롤하면 더 많은 NFT를 볼 수 있습니다</p>
              )
            )
          ) : (
            nfts.length > 0 && <p>모든 NFT가 로드되었습니다</p>
          )
        ) : soldHasMore ? (
          loadingMoreSold ? (
            <p>추가 판매 완료 NFT 로딩 중...</p>
          ) : (
            soldNfts.length > 0 && (
              <p>계속 스크롤하면 더 많은 판매 완료 NFT를 볼 수 있습니다</p>
            )
          )
        ) : (
          soldNfts.length > 0 && <p>모든 판매 완료 NFT가 로드되었습니다</p>
        )}
      </div>
    </div>
  );
};

export default NFTMarket;
