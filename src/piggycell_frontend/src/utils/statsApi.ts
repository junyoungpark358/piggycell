import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../declarations/piggycell_backend/piggycell_backend.did";
import { AuthManager } from "./auth";
import { SortOrder } from "antd/es/table/interface";

// 통계 데이터 타입 정의
export interface NFTStats {
  totalSupply: number;
  stakedCount: number;
  activeUsers: number;
  totalVolume: number;
  availableNFTs?: number;
  soldNFTs?: number;
  totalChargers?: number;
  totalEstimatedRewards?: bigint;
}

// 사용자 NFT 데이터 타입 정의
export interface UserNFTData {
  ownedNFTs: NFTData[];
  stakedNFTs: NFTData[];
  stats: {
    ownedCount: number;
    stakedCount: number;
    totalChargerCount: number;
    estimatedMonthlyRevenue: number;
  };
}

// NFT 데이터 타입 정의
export interface NFTData {
  id: bigint;
  name: string;
  location: string;
  price: bigint;
  chargerCount: number;
  isStaked: boolean;
}

// ICRC-3 트랜잭션 관련 타입 정의
export interface ICRC3Account {
  owner: Principal;
  subaccount: [] | [Uint8Array];
}

export interface ICRC3Transaction {
  kind: string;
  timestamp: bigint;
  from: [] | [ICRC3Account];
  to: [] | [ICRC3Account];
  token_ids: bigint[];
  memo: [] | [Uint8Array];
}

export interface TransactionFilter {
  date_range: [] | [{ start: bigint; end: bigint }];
  account: [] | [ICRC3Account];
  type: [] | [string[]];
}

// 확장된 GetTransactionsArgs 인터페이스
export interface GetTransactionsArgs {
  start: [] | [bigint];
  length: [] | [bigint];
  account: [] | [ICRC3Account];
  // 확장 필드
  search_query: [] | [string];
  sort_by: [] | [string];
  sort_direction: [] | [string];
  type_filter: [] | [string[]];
}

export interface TransactionResult {
  transactions: ICRC3Transaction[];
  total: bigint;
}

export interface TransactionDisplay {
  key: string;
  type: string;
  nftId: string;
  from: string;
  to: string;
  isFromMarket: boolean;
  date: string;
}

// NFT 관리 통계 데이터 타입 정의
export interface NFTManagementStats {
  totalNFTs: number;
  activeLocations: number;
  totalChargers: number;
  totalValue: number;
  availableNFTs: number;
}

/**
 * 백엔드 액터 생성 함수
 * @returns 백엔드 액터 인스턴스
 */
export const createActor = async (): Promise<_SERVICE> => {
  const authManager = AuthManager.getInstance();
  const identity = await authManager.getIdentity();

  if (!identity) {
    throw new Error("인증되지 않은 사용자입니다.");
  }

  const agent = new HttpAgent({ identity });

  // 로컬 환경에서 항상 fetchRootKey를 호출하도록 수정
  try {
    await agent.fetchRootKey();
  } catch (error) {
    console.warn("statsApi - fetchRootKey 오류:", error);
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

/**
 * 기본 NFT 통계 데이터 가져오기
 * @returns 기본 NFT 통계 정보 (총 발행량, 스테이킹된 수, 활성 사용자 수, 총 거래량)
 */
export const getBasicNFTStats = async (): Promise<NFTStats> => {
  try {
    const actor = await createActor();

    // NFT 총 발행량 조회
    const totalSupply = await actor.icrc7_total_supply();

    // 스테이킹된 NFT 수 조회
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }
    const stakedNFTs = await actor.getStakedNFTs(identity.getPrincipal());
    const stakedCount = stakedNFTs.length;

    // 활성 사용자 수 조회
    const activeUsers = await actor.getActiveUsersCount();

    // 총 거래액 조회
    const totalVolume = await actor.getTotalVolume();

    return {
      totalSupply: Number(totalSupply),
      stakedCount,
      activeUsers: Number(activeUsers),
      totalVolume: Number(totalVolume),
    };
  } catch (error) {
    console.error("기본 NFT 통계 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 마켓 관련 통계 정보 가져오기
 * @returns 마켓 관련 통계 정보 (총 NFT, 판매중인 NFT, 판매된 NFT, 총 거래량)
 */
export const getMarketStats = async (): Promise<NFTStats> => {
  try {
    const actor = await createActor();

    // 모든 API 호출을 병렬로 처리하여 성능 향상
    const [totalSupply, listings, totalVolume] = await Promise.all([
      actor.icrc7_total_supply(),
      actor.getListings([], BigInt(1)), // 1개만 조회하여 total 값만 확인
      actor.getTotalVolume(),
    ]);

    const availableNFTs = Number(listings.total);
    const soldNFTs = Number(totalSupply) - availableNFTs;

    return {
      totalSupply: Number(totalSupply),
      availableNFTs,
      soldNFTs,
      totalVolume: Number(totalVolume),
      stakedCount: 0, // 기본값
      activeUsers: 0, // 기본값
    };
  } catch (error) {
    console.error("마켓 통계 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 스테이킹 관련 통계 정보 가져오기
 * @returns 스테이킹 관련 통계 정보 (스테이킹된 NFT 수, 총 충전기 수, 예상 보상)
 */
export const getStakingStats = async (): Promise<NFTStats> => {
  try {
    const actor = await createActor();
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();

    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 스테이킹된 NFT 목록 조회
    const stakedTokens = await actor.getStakedNFTs(identity.getPrincipal());

    // 각 NFT별 메타데이터와 예상 보상 조회
    let totalChargers = 0;
    let totalEstimatedRewards = BigInt(0);

    for (const tokenId of stakedTokens) {
      // NFT 메타데이터 조회
      const metadata = await actor.icrc7_token_metadata([tokenId]);

      if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
        const metadataFields = metadata[0][0] as Array<
          [string, { Text?: string; Nat?: bigint }]
        >;

        metadataFields.forEach(([key, value]) => {
          if (key === "chargerCount" && value.Nat) {
            totalChargers += Number(value.Nat);
          }
        });
      }

      // 예상 보상 조회
      const estimatedReward = await actor.getEstimatedStakingReward(tokenId);
      if ("ok" in estimatedReward) {
        totalEstimatedRewards += estimatedReward.ok;
      }
    }

    return {
      stakedCount: stakedTokens.length,
      totalChargers,
      totalEstimatedRewards,
      totalSupply: 0, // 기본값
      activeUsers: 0, // 기본값
      totalVolume: 0, // 기본값
    };
  } catch (error) {
    console.error("스테이킹 통계 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 관리자 대시보드용 포괄적인 통계 정보 가져오기
 * @returns 관리자용 통계 정보 (모든 통계 데이터)
 */
export const getAdminDashboardStats = async (): Promise<NFTStats> => {
  try {
    const actor = await createActor();

    // 총 발행량 조회
    const totalSupply = await actor.icrc7_total_supply();
    const totalSupplyNum = Number(totalSupply);

    // 스테이킹된 NFT 수 계산 (전체 조회)
    let stakedCount = 0;
    for (let i = 0; i < totalSupplyNum; i++) {
      try {
        const tokenId = BigInt(i);
        const isStaked = await actor.isNFTStaked(tokenId);
        if (isStaked) {
          stakedCount++;
        }
      } catch (e) {
        console.warn(`NFT #${i} 스테이킹 상태 확인 실패:`, e);
      }
    }

    // 활성 사용자 수 조회
    const activeUsers = await actor.getActiveUsersCount();

    // 총 거래액 조회
    const totalVolume = await actor.getTotalVolume();

    // 마켓 통계 조회
    const marketStats = await getMarketStats();

    return {
      totalSupply: totalSupplyNum,
      stakedCount: stakedCount,
      activeUsers: Number(activeUsers),
      totalVolume: Number(totalVolume),
      availableNFTs: marketStats.availableNFTs,
      soldNFTs: marketStats.soldNFTs,
    };
  } catch (error) {
    console.error("관리자 대시보드 통계 데이터 조회 실패:", error);
    // 에러 발생 시 기본 통계 데이터 조회 시도
    try {
      const basicStats = await getBasicNFTStats();
      const marketStats = await getMarketStats();
      console.warn("기본 통계 대체 데이터 사용:", basicStats);
      return {
        ...basicStats,
        availableNFTs: marketStats.availableNFTs,
        soldNFTs: marketStats.soldNFTs,
      };
    } catch (fallbackError) {
      console.error("기본 통계 대체 데이터 조회 실패:", fallbackError);
      throw error; // 원래 에러 전달
    }
  }
};

/**
 * 사용자별 커스텀 통계 정보 가져오기 (필요한 통계만 선택적으로 조회)
 * @param options 필요한 통계 항목을 지정하는 옵션 객체
 * @returns 선택된 통계 정보
 */
export const getCustomStats = async (options: {
  includeTotalSupply?: boolean;
  includeStakedCount?: boolean;
  includeActiveUsers?: boolean;
  includeTotalVolume?: boolean;
  includeMarketStats?: boolean;
  includeStakingStats?: boolean;
}): Promise<Partial<NFTStats>> => {
  try {
    const actor = await createActor();
    const result: Partial<NFTStats> = {};
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();

    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 필요한 통계만 선택적으로 조회
    if (options.includeTotalSupply) {
      const totalSupply = await actor.icrc7_total_supply();
      result.totalSupply = Number(totalSupply);
    }

    if (options.includeStakedCount) {
      const stakedNFTs = await actor.getStakedNFTs(identity.getPrincipal());
      result.stakedCount = stakedNFTs.length;
    }

    if (options.includeActiveUsers) {
      const activeUsers = await actor.getActiveUsersCount();
      result.activeUsers = Number(activeUsers);
    }

    if (options.includeTotalVolume) {
      const totalVolume = await actor.getTotalVolume();
      result.totalVolume = Number(totalVolume);
    }

    if (options.includeMarketStats) {
      const listings = await actor.getListings([], BigInt(1));
      result.availableNFTs = Number(listings.total);

      if (result.totalSupply !== undefined) {
        result.soldNFTs = result.totalSupply - result.availableNFTs;
      }
    }

    if (options.includeStakingStats && options.includeStakedCount) {
      const stakingStats = await getStakingStats();
      result.totalChargers = stakingStats.totalChargers;
      result.totalEstimatedRewards = stakingStats.totalEstimatedRewards;
    }

    return result;
  } catch (error) {
    console.error("커스텀 통계 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 사용자의 NFT 및 스테이킹 정보를 가져오는 함수 (Home.tsx에서 사용)
 * @returns 사용자의 NFT 데이터 (보유 NFT, 스테이킹된 NFT, 통계 정보)
 */
export const getUserNFTs = async (): Promise<UserNFTData> => {
  try {
    const actor = await createActor();
    const authManager = AuthManager.getInstance();
    const identity = await authManager.getIdentity();

    if (!identity) {
      throw new Error("인증되지 않은 사용자입니다.");
    }

    // 소유한 NFT 목록 조회
    const ownedTokens = await actor.icrc7_tokens_of(
      { owner: identity.getPrincipal(), subaccount: [] },
      [],
      []
    );

    // 스테이킹된 NFT 목록 조회
    const stakedTokens = await actor.getStakedNFTs(identity.getPrincipal());
    const stakedTokenSet = new Set(stakedTokens.map((id) => id.toString()));

    // NFT 데이터 가져오기
    const nftDataPromises = ownedTokens.map(async (tokenId) => {
      const metadata = await actor.icrc7_token_metadata([tokenId]);
      let location = "위치 정보 없음";
      let chargerCount = 0;
      let price = BigInt(0);

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
        });
      }

      // 스테이킹 상태 확인
      const isStaked = stakedTokenSet.has(tokenId.toString());

      return {
        id: tokenId,
        name: `충전 허브 #${tokenId.toString()}`,
        location,
        price,
        chargerCount,
        isStaked,
      };
    });

    const nftData = await Promise.all(nftDataPromises);

    // 스테이킹 상태에 따라 분류
    const ownedNFTs = nftData.filter((nft) => !nft.isStaked);
    const stakedNFTs = nftData.filter((nft) => nft.isStaked);

    // 통계 정보 계산
    const totalChargerCount = nftData.reduce(
      (sum, nft) => sum + nft.chargerCount,
      0
    );

    // 예상 월 수익 계산 (충전기당 평균 수익 * 충전기 수)
    // 실제 프로젝트에서는 백엔드 API를 통해 정확한 예상 수익을 계산할 수 있습니다.
    const estimatedMonthlyRevenue = totalChargerCount * 10; // 충전기 1개당 10 PGC 예상 수익으로 가정

    return {
      ownedNFTs,
      stakedNFTs,
      stats: {
        ownedCount: ownedNFTs.length,
        stakedCount: stakedNFTs.length,
        totalChargerCount,
        estimatedMonthlyRevenue,
      },
    };
  } catch (error) {
    console.error("사용자 NFT 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 트랜잭션 데이터 가져오기 (페이지네이션, 필터링, 검색, 정렬 지원)
 * @param page 페이지 번호 (1부터 시작)
 * @param pageSize 페이지당 항목 수
 * @param filter 필터 옵션
 * @param searchText 검색어
 * @param sortField 정렬 필드
 * @param sortDirection 정렬 방향
 * @returns 거래 내역 및 전체 항목 수
 */
export const getTransactions = async (
  page: number,
  pageSize: number,
  filter?: TransactionFilter,
  searchText?: string,
  sortField?: string,
  sortDirection?: SortOrder
): Promise<{ transactions: TransactionDisplay[]; total: number }> => {
  try {
    // 검색어에 따옴표가 있는 경우 제거 (예: '"검색어"' -> '검색어')
    let cleanSearchText = searchText;
    if (searchText && searchText.startsWith('"') && searchText.endsWith('"')) {
      cleanSearchText = searchText.slice(1, -1);
    }

    console.log("[STATS_API] 거래 내역 조회 요청:", {
      page,
      pageSize,
      filter,
      searchText: cleanSearchText ? `"${cleanSearchText}"` : "undefined",
      sortField,
      sortDirection,
    });

    const actor = await createActor();
    const start = (page - 1) * pageSize;

    // ICRC3 트랜잭션 요청 준비
    const request: GetTransactionsArgs = {
      start: [BigInt(start)],
      length: [BigInt(pageSize)],
      account: filter?.account || [],
      // 항상 필수 필드 포함
      sort_by: sortField
        ? [sortField === "date" ? "timestamp" : sortField]
        : ["timestamp"],
      sort_direction: sortDirection
        ? [sortDirection === "ascend" ? "asc" : "desc"]
        : ["desc"],
      type_filter: filter?.type && filter.type.length > 0 ? filter.type : [],
      // 검색어 설정: 검색어를 사용하지만 '거래 유형'에는 적용되지 않는다는 백엔드 메모
      search_query:
        cleanSearchText && cleanSearchText.trim() !== ""
          ? [cleanSearchText.trim() + "|exclude_type"]
          : [],
    };

    // 검색어 로깅
    if (cleanSearchText && cleanSearchText.trim() !== "") {
      console.log(
        `[STATS_API] 검색어 설정 (유형 검색 제외): "${cleanSearchText.trim()}"`
      );
    } else {
      console.log(`[STATS_API] 검색어 없음`);
    }

    // 백엔드 API 요청 정보 출력
    console.log(
      "[STATS_API] 백엔드 요청 객체:",
      JSON.stringify(
        request,
        (key, value) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        },
        2
      )
    );

    // 백엔드 호출
    console.log("[STATS_API] get_transaction_history 호출 시작");
    const response = await actor.get_transaction_history(request);
    console.log(
      `[STATS_API] 백엔드 응답: 총 ${response.total} 건, 트랜잭션 ${response.transactions.length}개 반환`
    );

    // 응답 변환
    const transactions: TransactionDisplay[] = response.transactions.map(
      (tx, index) => {
        // 트랜잭션 유형 매핑
        let type = "";
        switch (tx.kind) {
          case "mint":
            type = "NFT 발행";
            break;
          case "transfer":
            type = "NFT 전송";
            break;
          case "stake":
            type = "NFT 스테이킹";
            break;
          case "unstake":
            type = "NFT 언스테이킹";
            break;
          case "reward":
            type = "스테이킹 보상";
            break;
          default:
            type = tx.kind;
        }

        // NFT ID 획득 (첫 번째 ID 사용)
        const nftId =
          tx.token_ids && tx.token_ids.length > 0
            ? tx.token_ids[0].toString()
            : "-";

        // 주소 변환
        const from =
          tx.from && tx.from.length > 0
            ? tx.from[0]?.owner?.toString() || "-"
            : "-";

        const to =
          tx.to && tx.to.length > 0 ? tx.to[0]?.owner?.toString() || "-" : "-";

        // 마켓에서의 거래 여부 확인
        const isFromMarket = from === process.env.BACKEND_CANISTER_ID;

        // 타임스탬프를 가독성 있는 날짜로 변환
        const formattedDate = formatTimestamp(tx.timestamp);

        return {
          key: `${tx.timestamp.toString()}-${index}`,
          type,
          nftId,
          from,
          to,
          isFromMarket,
          date: formattedDate,
        };
      }
    );

    console.log(`[STATS_API] 변환 완료: ${transactions.length}개 트랜잭션`);
    if (transactions.length > 0) {
      console.log(`[STATS_API] 첫 번째 트랜잭션 샘플:`, transactions[0]);
    }

    return {
      transactions,
      total: Number(response.total),
    };
  } catch (error) {
    console.error("[STATS_API] 거래 내역 조회 중 오류 발생:", error);
    throw error;
  }
};

/**
 * NFT 관리 화면(NFTManagement.tsx)에서 사용하는 통계 정보를 가져오는 함수
 * @returns NFT 관리 통계 정보
 */
export const getNFTManagementStats = async (): Promise<NFTManagementStats> => {
  try {
    const actor = await createActor();

    // 전체 NFT 수 조회
    const totalSupply = await actor.icrc7_total_supply();

    // 판매중인 NFT 개수 조회
    const listings = await actor.getListings([], BigInt(1)); // 1개만 조회하여 total 값만 확인
    const availableNFTs = Number(listings.total);

    // 활성 위치 수 조회
    const activeLocationsSet = new Set<string>();
    const totalChargers = { value: 0 };

    // 총 거래량 직접 조회
    const totalValue = await actor.getTotalVolume();

    // 각 NFT의 메타데이터를 조회하여 통계 계산
    for (let i = 0; i < Number(totalSupply); i++) {
      const tokenId = BigInt(i);
      const metadata = await actor.icrc7_token_metadata([tokenId]);

      if (metadata && metadata.length > 0 && metadata[0] && metadata[0][0]) {
        const metadataFields = metadata[0][0] as Array<
          [string, { Text?: string; Nat?: bigint }]
        >;

        metadataFields.forEach(([key, value]) => {
          if (key === "location" && value.Text) {
            activeLocationsSet.add(value.Text);
          } else if (key === "chargerCount" && value.Nat) {
            totalChargers.value += Number(value.Nat);
          }
        });
      }
    }

    return {
      totalNFTs: Number(totalSupply),
      activeLocations: activeLocationsSet.size,
      availableNFTs: availableNFTs,
      totalChargers: totalChargers.value,
      totalValue: Number(totalValue),
    };
  } catch (error) {
    console.error("NFT 관리 통계 데이터 조회 실패:", error);
    throw error;
  }
};

/**
 * 타임스탬프를 한국 시간 문자열로 변환하는 유틸리티 함수
 * @param timestamp 나노초 단위의 타임스탬프
 * @returns 한국 시간 형식의 문자열
 */
const formatTimestamp = (timestamp: bigint): string => {
  // 나노초를 밀리초로 변환 (1 밀리초 = 1,000,000 나노초)
  const milliseconds = Number(timestamp) / 1_000_000;
  const date = new Date(milliseconds);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
};

/**
 * 현재 로그인한 사용자의 PGC 토큰 잔액을 조회하는 함수
 * @returns Promise<number> - 사용자의 PGC 토큰 잔액 (raw 단위)
 */
export const getUserBalance = async (): Promise<number> => {
  try {
    const actor = await createActor();
    const authManager = AuthManager.getInstance();
    const principal = await authManager.getPrincipal();

    if (!principal) {
      throw new Error("로그인이 필요합니다.");
    }

    const account = {
      owner: principal,
      subaccount: [] as [] | [Uint8Array],
    };

    const balance = await actor.icrc1_balance_of(account);
    // raw 단위 그대로 반환 (변환하지 않음)
    return Number(balance);
  } catch (error) {
    console.error("토큰 잔액 조회 오류:", error);
    return 0;
  }
};

// 관리자 추가 함수
export const addAdmin = async (
  principalId: string
): Promise<{ ok: string | null; err: string | null }> => {
  try {
    const actor = await createActor();
    // 문자열을 Principal 타입으로 변환
    const principal = Principal.fromText(principalId);
    const result = await actor.addAdmin(principal);

    if ("ok" in result) {
      return { ok: "성공", err: null };
    } else if ("err" in result) {
      return { ok: null, err: result.err };
    }

    return { ok: null, err: "알 수 없는 오류가 발생했습니다." };
  } catch (error) {
    console.error("관리자 추가 중 오류 발생:", error);
    return {
      ok: null,
      err:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    };
  }
};

// 관리자 삭제 함수
export const removeAdmin = async (
  principalId: string
): Promise<{ ok: string | null; err: string | null }> => {
  try {
    const actor = await createActor();
    // 문자열을 Principal 타입으로 변환
    const principal = Principal.fromText(principalId);
    const result = await actor.removeAdmin(principal);

    if ("ok" in result) {
      return { ok: "성공", err: null };
    } else if ("err" in result) {
      return { ok: null, err: result.err };
    }

    return { ok: null, err: "알 수 없는 오류가 발생했습니다." };
  } catch (error) {
    console.error("관리자 삭제 중 오류 발생:", error);
    return {
      ok: null,
      err:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    };
  }
};
