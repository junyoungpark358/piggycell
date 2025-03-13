import { Row, Col, Spin, Empty, Skeleton } from "antd";
import {
  SearchOutlined,
  DollarOutlined,
  LineChartOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  CalendarOutlined,
  FireOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  PlusCircleFilled,
} from "@ant-design/icons";
import "./Revenue.css";
import { StatCard } from "../components/StatCard";
import { StyledCard } from "../components/common/StyledCard";
import { message } from "antd";
import { useEffect, useState, useRef, useCallback } from "react";
import PageHeader from "../components/common/PageHeader";
import { formatTokenDisplayForUI } from "../utils/tokenUtils";
import { createActor } from "../utils/statsApi";
import { AuthManager } from "../utils/auth";
import styled from "@emotion/styled";
import { useTheme } from "../contexts/ThemeContext";

// BigInt를 안전하게 Number로 변환하는 유틸리티 함수
const toSafeNumber = (
  value: bigint | number | string | undefined | null
): number => {
  if (value === undefined || value === null) return 0;
  const numValue = typeof value === "bigint" ? Number(value) : Number(value);
  return isNaN(numValue) ? 0 : numValue;
};

// 백엔드에서 가져온 사용자 수익 통계 타입 정의
interface UserRevenueStats {
  totalRevenue: number;
  totalDistributions: number;
  lastDistributionTime: number | null;
  nftBreakdown: Array<{
    tokenId: number;
    revenue: number;
    percentage: number;
  }>;
  revenueHistory: Array<{
    timestamp: number;
    amount: number;
  }>;
  comparisonToAverage: number;
}

// 스테이킹된 NFT 정보 타입 정의
interface NFTInfo {
  id: number;
  name: string;
  location: string;
  price: number;
  chargerCount: number;
  revenue: number;
  successRate: number;
}

// 수익 분배 기록 타입 정의
interface DistributionRecord {
  recordId: number;
  userId: string;
  tokenId: number;
  amount: number;
  distributedAt: number;
  nftInfo?: {
    name: string;
    location: string;
    chargerCount: number;
    price?: number;
  };
}

// 백엔드에서 반환하는 페이지네이션 결과 타입 정의
interface PaginatedResult<T> {
  items: T[];
  nextStart: bigint;
  hasMore: boolean;
}

// 백엔드의 UserDistributionRecord 인터페이스 정의
interface UserDistributionRecord {
  recordId: bigint;
  userId: any; // Principal 타입
  tokenId: bigint;
  amount: bigint;
  distributedAt: bigint;
  claimed: boolean;
  claimedAt: [bigint] | [];
}

// 스타일드 컴포넌트
const DistributionCardWrapper = styled.div`
  margin-bottom: 16px;
  height: 100%;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid
    ${(props) => props.theme?.colors?.border?.default || "#E2E8F0"};
`;

const CardTitle = styled.h3(
  ({ theme }) => `
  font-family: ${
    theme?.typography?.fontFamily?.display || "var(--font-display)"
  };
  font-size: ${theme?.typography?.fontSize?.lg || "1.25rem"};
  font-weight: ${theme?.typography?.fontWeight?.semibold || 600};
  color: ${theme?.colors?.text?.primary || "#202124"};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
);

const TokenIdBadge = styled.span`
  background-color: #ebf5ff;
  color: #0284c7;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const InfoSection = styled.div`
  margin-bottom: 16px;
`;

const CardSectionTitle = styled.h4(
  ({ theme }) => `
  font-size: 14px;
  font-weight: 600;
  color: ${theme?.colors?.text?.secondary || "#6b7280"};
  margin: 0 0 8px 0;
  font-family: ${
    theme?.typography?.fontFamily?.display || "var(--font-display)"
  };
`
);

const PageSectionTitle = styled.h2(
  ({ theme }) => `
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  font-family: ${
    theme?.typography?.fontFamily?.display || "var(--font-display)"
  };
`
);

const NFTInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
`;

const DistributionInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f0f9ff;
  border-radius: 0.5rem;
`;

const InfoItem = styled.div(
  ({ theme }) => `
  display: flex;
  align-items: center;
  margin-bottom: 0;
  padding: 0.5rem;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 0.375rem;
  }

  .icon {
    margin-right: 8px;
    font-size: 1.25rem;
  }

  .value {
    color: ${theme?.colors?.text?.primary || "#111827"};
    font-size: ${theme?.typography?.fontSize?.md || "14px"};
    font-family: ${
      theme?.typography?.fontFamily?.primary || "var(--font-primary)"
    };
  }
  
  .label {
    color: ${theme?.colors?.text?.secondary || "#6B7280"};
    font-size: ${theme?.typography?.fontSize?.sm || "12px"};
    margin-right: 4px;
  }
`
);

const NFTInfoItem = styled(InfoItem)`
  .icon {
    color: #059669;
  }
`;

const DistributionInfoItem = styled(InfoItem)`
  .icon {
    color: #0284c7;
  }
`;

const DistributionHighlight = styled.div(
  ({ theme }) => `
  display: flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  background-color: ${theme?.colors?.primary?.light || "#f0f9ff"};
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${
      theme?.colors?.primary?.light
        ? theme.colors.primary.light + "dd"
        : "#e0f2fe"
    };
  }

  .icon {
    margin-right: 8px;
    color: ${theme?.colors?.primary?.main || "#0284c7"};
    font-size: 1.25rem;
  }

  .amount {
    font-size: ${theme?.typography?.fontSize?.xl || "20px"};
    font-weight: ${theme?.typography?.fontWeight?.bold || 700};
    color: ${theme?.colors?.text?.primary || "#111827"};
    font-family: ${
      theme?.typography?.fontFamily?.primary || "var(--font-primary)"
    };
  }

  .currency {
    font-size: ${theme?.typography?.fontSize?.md || "14px"};
    color: ${theme?.colors?.text?.secondary || "#6b7280"};
    margin-left: 4px;
  }
`
);

const SectionDivider = styled.div(
  ({ theme }) => `
  border-top: 1px solid ${theme?.colors?.border?.default || "#e5e7eb"};
  margin: 1rem 0;
`
);

const LoaderWrapper = styled.div`
  text-align: center;
  padding: 20px;
`;

const DistributionsContainer = styled.div`
  margin-top: 24px;
`;

// 분배 수익 카드 컴포넌트
const DistributionCard = ({ record }: { record: DistributionRecord }) => {
  const { theme } = useTheme();

  // 날짜 포맷팅
  const formatDate = (timestamp: number) => {
    try {
      // 타임스탬프 검증
      if (!timestamp || timestamp <= 0) {
        return "날짜 정보 없음";
      }

      // 나노초를 밀리초로 변환 (백엔드의 Time.now()가 나노초 단위로 반환됨)
      // 1_000_000 나노초 = 1 밀리초
      const milliseconds = timestamp / 1_000_000;

      const date = new Date(milliseconds);

      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.log("유효하지 않은 날짜:", timestamp, milliseconds);
        return "날짜 정보 없음";
      }

      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("날짜 변환 오류:", error, "타임스탬프:", timestamp);
      return "날짜 정보 없음";
    }
  };

  const nftName = record.nftInfo?.name || `충전 허브 #${record.tokenId}`;
  const chargerCount = record.nftInfo?.chargerCount || 0;
  const location =
    record.nftInfo?.location === "정보 로딩 중..."
      ? "정보 로딩 중..."
      : record.nftInfo?.location || "정보 없음";

  // 수익 포맷팅
  const formattedAmount = formatTokenDisplayForUI(record.amount).toFixed(8);

  // 배분 ID를 명확하게 표시
  const formattedRecordId = `배분 #${record.recordId}`;

  // NFT 가격 정보 (없는 경우 "정보 없음" 표시)
  const priceInfo = record.nftInfo?.price
    ? `${formatTokenDisplayForUI(record.nftInfo.price)} PGC`
    : record.nftInfo?.location === "정보 로딩 중..."
    ? "정보 로딩 중..."
    : "정보 없음";

  return (
    <DistributionCardWrapper>
      <StyledCard
        customVariant="nft"
        customPadding="md"
        interactive={true}
        style={{ height: "100%" }}
      >
        <CardHeader theme={theme}>
          <CardTitle theme={theme}>{nftName}</CardTitle>
          <TokenIdBadge>{formattedRecordId}</TokenIdBadge>
        </CardHeader>

        {/* 분배 금액 하이라이트 */}
        <DistributionHighlight theme={theme}>
          <DollarOutlined className="icon" />
          <span className="amount">{formattedAmount}</span>
          <span className="currency">PGC</span>
        </DistributionHighlight>

        {/* NFT 정보 섹션 */}
        <InfoSection>
          <CardSectionTitle theme={theme}>NFT 정보</CardSectionTitle>
          <NFTInfoContainer>
            <NFTInfoItem theme={theme}>
              <EnvironmentOutlined className="icon" />
              <span className="value">{location}</span>
            </NFTInfoItem>

            <NFTInfoItem theme={theme}>
              <ThunderboltOutlined className="icon" />
              <span className="value">충전기 {chargerCount}개</span>
            </NFTInfoItem>

            <NFTInfoItem theme={theme}>
              <DollarOutlined className="icon" />
              <span className="value">NFT 가격: {priceInfo}</span>
            </NFTInfoItem>
          </NFTInfoContainer>
        </InfoSection>

        {/* 배분 정보 섹션 */}
        <InfoSection>
          <CardSectionTitle theme={theme}>배분 시간</CardSectionTitle>
          <DistributionInfoContainer>
            <DistributionInfoItem theme={theme}>
              <ClockCircleOutlined className="icon" />
              <span className="value">{formatDate(record.distributedAt)}</span>
            </DistributionInfoItem>
          </DistributionInfoContainer>
        </InfoSection>
      </StyledCard>
    </DistributionCardWrapper>
  );
};

const Revenue = () => {
  // 테마 관련
  const { theme } = useTheme();

  // 로딩 상태 관리
  const [loading, setLoading] = useState(true);
  // 사용자 수익 통계 상태 관리
  const [revenueStats, setRevenueStats] = useState<UserRevenueStats | null>(
    null
  );
  // 지난 30일 수익 상태 관리
  const [last30DaysRevenue, setLast30DaysRevenue] = useState<number>(0);
  // 총 수익 상태 관리
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  // 최근 분배 금액 상태 관리
  const [lastDistributionAmount, setLastDistributionAmount] =
    useState<number>(0);
  // 활성 스테이킹 NFT 수 상태 관리
  const [activeStakedNFTCount, setActiveStakedNFTCount] = useState<number>(0);

  // 무한 스크롤을 위한 상태 관리
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextStart, setNextStart] = useState<bigint>(BigInt(0));
  const [distributionsLoading, setDistributionsLoading] = useState(false);
  const [nftMetadataCache, setNftMetadataCache] = useState<Record<number, any>>(
    {}
  );
  // 메타데이터 로딩 완료 상태 추가
  const [metadataLoaded, setMetadataLoaded] = useState<boolean>(false);

  // Intersection Observer를 위한 ref
  const observer = useRef<IntersectionObserver | null>(null);
  const lastDistributionElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (distributionsLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreDistributions();
        }
      });
      if (node) observer.current.observe(node);
    },
    [distributionsLoading, hasMore]
  );

  // NFT 메타데이터 캐시가 변경될 때 분배 내역 로드
  useEffect(() => {
    // 메타데이터가 로드되면 분배 내역 로드 (모든 NFT를 언스테이킹해도 과거 내역은 보이도록)
    if (metadataLoaded) {
      console.log("[Revenue] 메타데이터 로드 완료. 분배 내역 로드 시작...");
      loadMoreDistributions(true);
    }
  }, [metadataLoaded]);

  // 백엔드에서 사용자 수익 통계를 가져오는 함수
  const fetchUserRevenueStats = async () => {
    try {
      // 로그인 상태 확인
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();
      if (!identity) {
        message.error("로그인이 필요합니다.");
        return;
      }

      // 백엔드 액터 생성
      const actor = await createActor();

      // 사용자 자신의 수익 통계 가져오기
      const userStats = await actor.getMyRevenueStats();

      // 상태 업데이트
      setRevenueStats({
        totalRevenue: toSafeNumber(userStats.totalRevenue),
        totalDistributions: toSafeNumber(userStats.totalDistributions),
        lastDistributionTime: userStats.lastDistributionTime
          ? toSafeNumber(userStats.lastDistributionTime[0])
          : null,
        nftBreakdown: userStats.nftBreakdown.map((item) => ({
          tokenId: toSafeNumber(item.tokenId),
          revenue: toSafeNumber(item.revenue),
          percentage: toSafeNumber(item.percentage),
        })),
        revenueHistory: userStats.revenueHistory.map((item) => ({
          timestamp: toSafeNumber(item.timestamp),
          amount: toSafeNumber(item.amount),
        })),
        comparisonToAverage: toSafeNumber(userStats.comparisonToAverage),
      });

      // 지난 30일 수익 계산
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      console.log(
        `[Revenue] 30일 전 시간(밀리초): ${thirtyDaysAgo}, 현재 시간: ${Date.now()}`
      );

      // 수익 내역 로깅
      console.log(
        `[Revenue] 총 수익 내역 갯수: ${userStats.revenueHistory.length}`
      );
      console.log(`[Revenue] 백엔드 원본 데이터:`, userStats);
      userStats.revenueHistory.forEach((item, index) => {
        const timestamp = toSafeNumber(item.timestamp);
        const millisTimestamp = timestamp / 1_000_000;
        const isRecent = millisTimestamp > thirtyDaysAgo;
        console.log(
          `[Revenue] 내역 #${index}: 타임스탬프=${timestamp}(나노초) → ${millisTimestamp}(밀리초), ` +
            `금액=${toSafeNumber(item.amount)}, 최근 30일=${
              isRecent ? "예" : "아니오"
            }`
        );
      });

      // 실제 계산
      const backendTotalRevenue = toSafeNumber(userStats.totalRevenue);

      // 히스토리에서 계산된 값
      const calculatedTotalRevenue = userStats.revenueHistory.reduce(
        (acc, curr) => acc + toSafeNumber(curr.amount),
        0
      );

      // 히스토리에서 30일 수익 계산
      const calculatedLast30DaysRevenue = userStats.revenueHistory
        .filter(
          (item) => toSafeNumber(item.timestamp) / 1_000_000 > thirtyDaysAgo
        )
        .reduce((acc, curr) => acc + toSafeNumber(curr.amount), 0);

      // 백엔드 총액과 계산된 총액 간의 비율 계산
      const revenueFactor =
        calculatedTotalRevenue > 0
          ? backendTotalRevenue / calculatedTotalRevenue
          : 1;

      // 30일 수익을 비율에 맞게 조정
      const adjustedLast30DaysRevenue =
        calculatedLast30DaysRevenue * revenueFactor;

      console.log(
        `[Revenue] 히스토리에서 계산된 총 수익: ${calculatedTotalRevenue}, 백엔드 총 수익: ${backendTotalRevenue}, 비율: ${revenueFactor}`
      );
      console.log(
        `[Revenue] 히스토리에서 계산된 30일 수익: ${calculatedLast30DaysRevenue}, 조정된 30일 수익: ${adjustedLast30DaysRevenue}`
      );

      // 조정된 30일 수익 설정
      setLast30DaysRevenue(adjustedLast30DaysRevenue);

      // 총 수익 설정
      setTotalRevenue(backendTotalRevenue);

      // 최근 분배 금액 설정 (가장 최근의 거래)
      if (userStats.revenueHistory.length > 0) {
        // 시간 기준으로 정렬
        const sortedHistory = [...userStats.revenueHistory].sort(
          (a, b) => toSafeNumber(b.timestamp) - toSafeNumber(a.timestamp)
        );
        setLastDistributionAmount(toSafeNumber(sortedHistory[0].amount));
      }

      // 스테이킹된 NFT 목록 가져오기
      const stakedNFTs = await actor.getStakedNFTs(identity.getPrincipal());
      setActiveStakedNFTCount(stakedNFTs.length);

      // NFT 메타데이터 캐시 생성
      const metadataCache: Record<number, any> = {};

      // 스테이킹된 NFT가 있는 경우에만 메타데이터 가져오기
      if (stakedNFTs.length > 0) {
        for (const nftId of stakedNFTs) {
          try {
            // NFT 메타데이터 가져오기
            const nftMetadata = await actor.icrc7_token_metadata([nftId]);

            const metadata: Record<string, any> = {
              name: `NFT #${nftId}`,
              location: "",
              chargerCount: 0,
              price: 0,
            };

            // 메타데이터에서 필요한 정보 추출
            if (
              nftMetadata &&
              nftMetadata.length > 0 &&
              nftMetadata[0] &&
              nftMetadata[0][0]
            ) {
              const metadataFields = nftMetadata[0][0] as Array<
                [string, { Text?: string; Nat?: bigint }]
              >;

              for (const [key, value] of metadataFields) {
                if (key === "name" && value.Text) {
                  metadata.name = value.Text;
                }
                if (key === "location" && value.Text) {
                  metadata.location = value.Text;
                }
                if (key === "chargerCount" && value.Nat) {
                  metadata.chargerCount = Number(value.Nat);
                }
                if (key === "price" && value.Nat) {
                  metadata.price = Number(value.Nat);
                }
              }
            }

            // 메타데이터 캐시에 저장
            metadataCache[Number(nftId)] = metadata;
          } catch (error) {
            console.error(`NFT #${nftId} 정보 가져오기 실패:`, error);
          }
        }
      }

      // 메타데이터 캐시 상태 업데이트
      setNftMetadataCache(metadataCache);

      // 메타데이터 로딩 완료 표시 (스테이킹된 NFT가 없어도 완료로 표시)
      setMetadataLoaded(true);
    } catch (error) {
      console.error("사용자 수익 통계 가져오기 실패:", error);
      message.error("수익 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 수익 분배 내역 더 불러오기
  const loadMoreDistributions = async (reset = false) => {
    try {
      console.log(`[Revenue] 수익 분배 내역 로딩 시작: reset=${reset}`);
      setDistributionsLoading(true);

      // 로그인 상태 확인
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();
      if (!identity) {
        console.error("[Revenue] 로그인 없음: 사용자 인증 실패");
        message.error("로그인이 필요합니다.");
        return;
      }

      // 페이지 리셋 시 상태 초기화
      if (reset) {
        setNextStart(BigInt(0));
        setDistributions([]);
        setHasMore(true);
        console.log(
          "[Revenue] 상태 초기화: nextStart=0, 배분=[], 더 불러오기=true"
        );
      }

      const currentNextStart = reset ? BigInt(0) : nextStart;
      const PAGE_SIZE = 10; // 한 번에 가져올 아이템 수

      // 실제 블록 인덱스 계산 - 현재 페이지 번호에 기반
      const startBlockIndex = currentNextStart;

      console.log(
        `[Revenue] 요청 파라미터: startBlockIndex=${startBlockIndex}, pageSize=${PAGE_SIZE}`
      );

      // 백엔드 액터 생성
      const actor = await createActor();

      // 사용자의 수익 분배 내역 가져오기
      const userPrincipal = identity.getPrincipal();
      console.log(`[Revenue] 사용자 Principal: ${userPrincipal.toString()}`);
      console.log(
        `[Revenue] 백엔드 요청 시작: start=${startBlockIndex}, limit=${BigInt(
          PAGE_SIZE
        )}`
      );

      const startTime = Date.now();
      const result = (await actor.getUserRevenueTransactions(
        userPrincipal,
        startBlockIndex,
        BigInt(PAGE_SIZE)
      )) as PaginatedResult<UserDistributionRecord>;
      const endTime = Date.now();

      console.log(
        `[Revenue] 백엔드 응답 수신: ${endTime - startTime}ms 소요, ${
          result.items.length
        }개 레코드 수신`
      );
      console.log("[Revenue] 받은 레코드:", result);

      // 결과 변환 및 상태 업데이트
      const formattedRecords: DistributionRecord[] = result.items.map(
        (record: UserDistributionRecord) => {
          // 날짜 문자열을 직접 확인하기 위한 임시 변수 생성
          const rawTimestamp = toSafeNumber(record.distributedAt);
          const dateObj = new Date(rawTimestamp / 1_000_000); // 나노초를 밀리초로 변환
          const dateString = dateObj.toString();
          const isValidDate = !isNaN(dateObj.getTime());

          console.log(
            `[Revenue] 레코드 처리: recordId=${record.recordId}, tokenId=${record.tokenId}, timestamp=${rawTimestamp}`
          );
          console.log(
            `[Revenue] 날짜 변환: ${rawTimestamp} (나노초) → ${
              rawTimestamp / 1_000_000
            } (밀리초) → ${dateString} (유효함: ${isValidDate})`
          );

          const nftInfo = nftMetadataCache[toSafeNumber(record.tokenId)];
          console.log(
            `[Revenue] NFT 메타데이터: ${nftInfo ? "있음" : "없음"} (tokenId=${
              record.tokenId
            })`
          );

          return {
            recordId: toSafeNumber(record.recordId),
            userId: record.userId.toString(),
            tokenId: toSafeNumber(record.tokenId),
            amount: toSafeNumber(record.amount),
            distributedAt: rawTimestamp,
            nftInfo: nftInfo
              ? {
                  name: nftInfo.name || `NFT #${record.tokenId}`,
                  location: nftInfo.location || "",
                  chargerCount: nftInfo.chargerCount || 0,
                  price: nftInfo.price || 0,
                }
              : {
                  name: `NFT #${record.tokenId}`,
                  location: "정보 로딩 중...",
                  chargerCount: 0,
                  price: 0,
                },
          };
        }
      );

      // 결과가 없으면 더 이상 데이터가 없는 것
      if (formattedRecords.length === 0) {
        console.log("[Revenue] 더 이상 데이터가 없음: 무한 스크롤 중지");
        setHasMore(false);
      } else {
        // 기존 배분 목록에 새로 가져온 배분 추가
        const newDistributions = reset
          ? formattedRecords
          : [...distributions, ...formattedRecords];

        console.log(
          `[Revenue] 추가된 레코드 수: ${formattedRecords.length}, 총 레코드 수: ${newDistributions.length}`
        );

        // 페이지 번호와 배분 목록 업데이트
        setDistributions(newDistributions);

        // 백엔드에서 반환한 다음 시작 인덱스 사용
        setNextStart(result.nextStart);

        // 백엔드에서 반환한 hasMore 값 사용
        setHasMore(result.hasMore);

        // NFT 메타데이터 업데이트 필요한 경우 로그 출력
        for (const record of formattedRecords) {
          if (!nftMetadataCache[record.tokenId]) {
            console.log(
              `[Revenue] NFT 메타데이터 캐시 없음: tokenId=${record.tokenId}`
            );
            // 누락된 NFT 메타데이터 가져오기 시도
            fetchMissingNFTMetadata(record.tokenId);
          }
        }
      }
    } catch (error) {
      console.error("[Revenue] 수익 분배 내역 로딩 실패:", error);
      message.error("수익 분배 내역을 불러오는데 실패했습니다.");
    } finally {
      setDistributionsLoading(false);
      console.log("[Revenue] 수익 분배 내역 로딩 완료");
    }
  };

  const handleRefresh = (showMessage = false) => {
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

      // 로딩 상태 및 메타데이터 로딩 상태 초기화
      setLoading(true);
      setMetadataLoaded(false);

      // 데이터 가져오기
      fetchUserRevenueStats()
        .then(() => {
          // 성공 메시지도 showMessage가 true일 때만 표시
          if (showMessage) {
            message.success({
              content: "새로고침 완료!",
              key: "refreshMessage",
              duration: 2,
            });
          }
        })
        .catch((error) => {
          console.error("새로고침 실패:", error);
          // 실패 메시지도 showMessage가 true일 때만 표시
          if (showMessage) {
            message.error({
              content: "데이터를 불러오는데 실패했습니다.",
              key: "refreshMessage",
              duration: 2,
            });
          }
        });
    } catch (error) {
      console.error("새로고침 실패:", error);

      // 실패 메시지도 showMessage가 true일 때만 표시
      if (showMessage) {
        message.error({
          content: "데이터를 불러오는데 실패했습니다.",
          key: "refreshMessage",
          duration: 2,
        });
      }
      setLoading(false);
    }
  };

  // 초기 로딩 시 메시지 없이 데이터 가져오기
  useEffect(() => {
    // 초기 로드시 메타데이터 로딩 상태 초기화
    setMetadataLoaded(false);
    // 초기 로딩 시에는 메시지를 표시하지 않음 (showMessage = false)
    handleRefresh(false);
  }, []);

  // 누락된 NFT 메타데이터를 가져오는 함수
  const fetchMissingNFTMetadata = async (tokenId: number) => {
    try {
      console.log(`[Revenue] 누락된 NFT #${tokenId} 메타데이터 가져오기 시작`);

      // 로그인 상태 확인
      const authManager = AuthManager.getInstance();
      const identity = await authManager.getIdentity();
      if (!identity) {
        console.error("[Revenue] 로그인 없음: NFT 메타데이터 가져오기 실패");
        return;
      }

      // 백엔드 액터 생성
      const actor = await createActor();

      // NFT 메타데이터 가져오기
      const nftMetadata = await actor.icrc7_token_metadata([BigInt(tokenId)]);

      const metadata: Record<string, any> = {
        name: `NFT #${tokenId}`,
        location: "",
        chargerCount: 0,
        price: 0,
      };

      // 메타데이터에서 필요한 정보 추출
      if (
        nftMetadata &&
        nftMetadata.length > 0 &&
        nftMetadata[0] &&
        nftMetadata[0][0]
      ) {
        const metadataFields = nftMetadata[0][0] as Array<
          [string, { Text?: string; Nat?: bigint }]
        >;

        for (const [key, value] of metadataFields) {
          if (key === "name" && value.Text) {
            metadata.name = value.Text;
          }
          if (key === "location" && value.Text) {
            metadata.location = value.Text;
          }
          if (key === "chargerCount" && value.Nat) {
            metadata.chargerCount = Number(value.Nat);
          }
          if (key === "price" && value.Nat) {
            metadata.price = Number(value.Nat);
          }
        }
      }

      // 메타데이터 캐시 업데이트
      setNftMetadataCache((prevCache) => ({
        ...prevCache,
        [tokenId]: metadata,
      }));

      console.log(
        `[Revenue] NFT #${tokenId} 메타데이터 가져오기 성공:`,
        metadata
      );
    } catch (error) {
      console.error(
        `[Revenue] NFT #${tokenId} 메타데이터 가져오기 실패:`,
        error
      );
    }
  };

  return (
    <div className="revenue-page">
      <PageHeader title="수익 관리" onRefresh={() => handleRefresh(true)} />

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 누적 수익"
            value={formatTokenDisplayForUI(totalRevenue)}
            prefix={<WalletOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="최근 30일 수익"
            value={formatTokenDisplayForUI(last30DaysRevenue)}
            prefix={<CalendarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="최근 분배 금액"
            value={formatTokenDisplayForUI(lastDistributionAmount)}
            prefix={<FireOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="활성 스테이킹 NFT"
            value={activeStakedNFTCount}
            prefix={<CheckCircleOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
      </Row>

      <DistributionsContainer>
        <PageSectionTitle theme={theme}>수익 분배 내역</PageSectionTitle>

        {distributions.length === 0 && !distributionsLoading && !loading ? (
          <Empty
            description="수익 분배 내역이 없습니다."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="distribution-list">
            <Row gutter={[16, 16]}>
              {distributions.map((record, index) => {
                const isLastElement = distributions.length === index + 1;
                return (
                  <Col
                    key={`${record.recordId}-${record.tokenId}`}
                    xs={24}
                    sm={12}
                    md={8}
                    lg={6}
                  >
                    <div
                      ref={isLastElement ? lastDistributionElementRef : null}
                    >
                      <DistributionCard record={record} />
                    </div>
                  </Col>
                );
              })}
            </Row>

            {(distributionsLoading || loading) && (
              <LoaderWrapper>
                <Spin tip="불러오는 중..." />
              </LoaderWrapper>
            )}

            {!hasMore && distributions.length > 0 && (
              <div className="text-center p-4 text-gray-500">
                더 이상 분배 내역이 없습니다.
              </div>
            )}
          </div>
        )}
      </DistributionsContainer>
    </div>
  );
};

export default Revenue;
