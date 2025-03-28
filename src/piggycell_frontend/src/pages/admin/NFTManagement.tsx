import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Space, Select, Row, Col, message, Tooltip } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  DollarOutlined,
  SearchOutlined,
  CopyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../../declarations/piggycell_backend";
import type {
  _SERVICE,
  MintArgs,
  Listing,
  Account,
  Value,
  NFTMetadata,
} from "../../../../declarations/piggycell_backend/piggycell_backend.did";
import "./NFTManagement.css";
import { StatCard } from "../../components/StatCard";
import { StyledTable } from "../../components/common/StyledTable";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { AuthManager } from "../../utils/auth";
import {
  createActor,
  getNFTManagementStats,
  NFTManagementStats,
} from "../../utils/statsApi";
import { formatPGCBalance } from "../../utils/tokenUtils";

// NFT 데이터 타입 정의
interface NFTData {
  id: number | bigint | string;
  location: string;
  chargerCount: number | bigint | string;
  status: string;
  owner: string;
  price?: number | bigint | string;
  statusChangedAt: bigint | string | number;
}

// MetadataValue를 Value로 대체
type MetadataPair = [string, Value];

const NFTManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState<_SERVICE | null>(null);
  const [totalVolume, setTotalVolume] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filteredNfts, setFilteredNfts] = useState<NFTData[]>([]);

  // 전체 통계 데이터를 위한 상태 추가
  const [totalStats, setTotalStats] = useState<NFTManagementStats>({
    totalNFTs: 0,
    activeLocations: 0,
    totalChargers: 0,
    totalValue: 0,
    availableNFTs: 0,
  });

  // 페이지네이션 상태 추가
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 정렬 상태 추가
  const [sortField, setSortField] = useState<string>("statusChangedAt");
  const [sortDirection, setSortDirection] = useState<string>("descend");

  console.log("통계 데이터:", totalStats);

  const createActor = async () => {
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
      console.warn("NFTManagement - fetchRootKey 오류:", error);
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

  const fetchTotalVolume = async () => {
    try {
      if (!actor) return;
      const volume = await actor.getTotalVolume();
      setTotalVolume(Number(volume));
    } catch (error) {
      console.error("총 거래액 조회 실패:", error);
    }
  };

  // 전체 통계 데이터를 가져오는 함수 수정
  const fetchStats = async () => {
    try {
      // statsApi의 getNFTManagementStats 함수 사용
      const stats = await getNFTManagementStats();

      // 데이터가 준비된 후에 상태를 업데이트
      setTotalStats(stats);
      setTotalVolume(stats.totalValue);
      console.log("통계 데이터 조회 완료:", stats);

      return stats; // 데이터 반환
    } catch (error) {
      console.error("통계 데이터 조회 실패:", error);
      throw error; // 에러를 상위로 전파하여 loadData에서 처리하도록 함
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Actor 초기화 시작");
        const newActor = await createActor();
        console.log("Actor 생성 완료");
        setActor(newActor);
      } catch (error) {
        console.error("Actor 생성 실패:", error);
        message.error("초기화에 실패했습니다.");
      }
    };

    init();
  }, []);

  // actor가 준비되면 데이터 한 번만 로드
  useEffect(() => {
    if (!actor) return;

    const loadData = async () => {
      try {
        setLoading(true); // 데이터 로딩 시작 시 로딩 상태 설정

        // Promise.all을 사용하여 두 데이터 로딩 작업을 병렬로 처리
        const [nftData, statsData] = await Promise.all([
          fetchPaginatedNFTs(),
          fetchStats(),
        ]);

        // 모든 데이터가 로드된 후에 로딩 상태 해제
        console.log("모든 데이터 로딩 완료:", { nftData, statsData });
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
        message.error("데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false); // 성공/실패 여부와 관계없이 로딩 상태 해제
      }
    };

    loadData();
  }, [actor]);

  // nfts 상태가 변경될 때마다 통계 출력
  useEffect(() => {
    console.log("NFTs 상태 변경됨:", {
      nftsLength: nfts.length,
      nftsData: nfts,
      stats: totalStats,
    });
  }, [nfts]);

  // pagination.total 값이 변경될 때마다 로그 출력
  useEffect(() => {
    console.log("Pagination 상태 변경됨:", {
      현재페이지: pagination.current,
      페이지크기: pagination.pageSize,
      총항목수: pagination.total,
      계산된페이지수: Math.ceil(pagination.total / pagination.pageSize),
    });
  }, [pagination.total, pagination.current, pagination.pageSize]);

  // 페이지네이션된 NFT 데이터 가져오기
  const fetchPaginatedNFTs = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    sortBy = sortField,
    direction = sortDirection,
    searchValue = searchText
  ) => {
    try {
      // loadData에서 setLoading(true)가 호출되므로 여기서는 필요 없음
      if (!actor) {
        throw new Error("Actor not initialized");
      }

      console.log("서버 측 페이지네이션 호출:", {
        page,
        pageSize,
        sortBy,
        direction,
        searchQuery: searchValue || "",
      });

      // 서버 API 단일 호출로 모든 기능 처리 (검색, 정렬, 페이지네이션)
      const response = await (actor as any).getNFTsByPage({
        page,
        pageSize,
        sortBy: sortBy || "statusChangedAt",
        sortDirection: direction === "ascend" ? "asc" : "desc",
        searchQuery: searchValue || "", // 서버 측 검색 기능 활성화
      });

      // 서버에서 반환된 NFT 데이터 설정
      const nftsData = response.nfts.map((nft: any) => {
        // 각 필드의 타입에 따라 적절하게 변환
        const convertToNumber = (value: any): number => {
          if (value === undefined || value === null) return 0;

          if (typeof value === "bigint") {
            return Number(value);
          } else if (typeof value === "string") {
            return value.includes("n")
              ? Number(value.replace("n", ""))
              : parseFloat(value);
          } else {
            return Number(value);
          }
        };

        // statusChangedAt 변환 처리
        let timeValue = nft.statusChangedAt;

        return {
          key: nft.id.toString(),
          id: convertToNumber(nft.id),
          location: nft.location || "-",
          chargerCount: convertToNumber(nft.chargerCount),
          status: nft.status,
          price: nft.price ? convertToNumber(nft.price) : undefined,
          owner: nft.owner
            ? nft.owner.toString().substring(0, 10) + "..."
            : "-",
          statusChangedAt: timeValue,
        };
      });

      // 서버에서 이미 필터링된 결과를 사용
      setNfts(nftsData);
      setFilteredNfts(nftsData);

      // 총 항목 수 저장
      const totalCount = Number(response.totalCount);
      console.log(
        "fetchPaginatedNFTs - 서버에서 받은 총 NFT 개수:",
        totalCount
      );

      // 페이지네이션 정보 업데이트
      console.log("페이지네이션 업데이트 전:", {
        현재페이지: page,
        페이지크기: pageSize,
        총항목수: pagination.total,
        응답총개수: totalCount,
        데이터길이: nftsData.length,
      });

      // 콜백 패턴을 사용하여 업데이트
      setPagination((prevState) => {
        const updatedPagination = {
          ...prevState,
          current: page,
          total: totalCount,
        };

        console.log("페이지네이션 업데이트 중:", updatedPagination);
        return updatedPagination;
      });

      // 예상 결과 로깅
      console.log("페이지네이션 예상 업데이트 값:", {
        현재페이지: page,
        페이지크기: pageSize,
        총항목수: totalCount,
        예상페이지수: Math.ceil(totalCount / pageSize),
      });

      return nftsData; // 데이터 반환
    } catch (error) {
      console.error("NFT 데이터 조회 중 오류 발생:", error);
      message.error("NFT 데이터를 불러오는 중 오류가 발생했습니다.", 2);
      throw error; // 에러를 상위로 전파
    }
  };

  // 검색 핸들러 수정
  const handleSearch = (value: string) => {
    setSearchText(value);
    // 검색어가 변경되면 1페이지부터 다시 데이터를 로드
    setLoading(true);
    fetchPaginatedNFTs(1, pagination.pageSize, sortField, sortDirection, value)
      .catch((error) => {
        console.error("검색 중 오류 발생:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 페이지 변경 핸들러 추가
  const handleTableChange = (
    pagination: any,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<NFTData> | SorterResult<NFTData>[]
  ) => {
    const { current = 1, pageSize = 10 } = pagination;
    const sortInfo = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortBy = sortInfo.field ? String(sortInfo.field) : "statusChangedAt";
    const sortDirection = sortInfo.order || "descend";

    console.log(`페이지 변경: ${current}, 정렬: ${sortBy} ${sortDirection}`);

    // 정렬 상태 업데이트
    setSortField(sortBy);
    setSortDirection(sortDirection);

    // 페이지네이션 상태 업데이트
    setPagination({
      ...pagination,
      current: Number(current), // 명시적으로 Number 변환
      pageSize: Number(pageSize), // 명시적으로 Number 변환
    });

    // 데이터 로딩 시작
    setLoading(true);

    // 서버 측 페이지네이션 사용 시 데이터 가져오기
    fetchPaginatedNFTs(Number(current), Number(pageSize), sortBy, sortDirection)
      .catch((error) => {
        console.error("테이블 변경 중 오류 발생:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 새로고침 핸들러 수정
  const handleRefresh = async () => {
    try {
      // 로딩 메시지 키를 저장하여 나중에 이 메시지를 업데이트할 수 있도록 함
      const messageKey = "refreshMessage";
      message.loading({
        content: "데이터를 새로고침 중입니다...",
        key: messageKey,
        duration: 0,
      });

      setLoading(true); // 새로고침 시작 시 로딩 상태 설정

      // actor를 다시 초기화
      const refreshedActor = await createActor();
      setActor(refreshedActor);

      // 현재 페이지 및 페이지 크기 유지
      const currentPage = pagination.current;
      const currentPageSize = pagination.pageSize;

      // 통계 데이터 새로고침
      const statsData = await fetchStats();

      // 페이지네이션된 데이터 다시 로드 - 현재 페이지 유지
      const response = await (refreshedActor as any).getNFTsByPage({
        page: currentPage,
        pageSize: currentPageSize,
        sortBy: sortField || "statusChangedAt",
        sortDirection: sortDirection === "ascend" ? "asc" : "desc",
        searchQuery: searchText || "",
      });

      // 서버에서 반환된 NFT 데이터 설정
      const nftsData = response.nfts.map((nft: any) => {
        // 각 필드의 타입에 따라 적절하게 변환
        const convertToNumber = (value: any): number => {
          if (value === undefined || value === null) return 0;

          if (typeof value === "bigint") {
            return Number(value);
          } else if (typeof value === "string") {
            return value.includes("n")
              ? Number(value.replace("n", ""))
              : parseFloat(value);
          } else {
            return Number(value);
          }
        };

        // statusChangedAt 변환 처리
        let timeValue = nft.statusChangedAt;

        return {
          key: nft.id.toString(),
          id: convertToNumber(nft.id),
          location: nft.location || "-",
          chargerCount: convertToNumber(nft.chargerCount),
          status: nft.status,
          price: nft.price ? convertToNumber(nft.price) : undefined,
          owner: nft.owner
            ? nft.owner.toString().substring(0, 10) + "..."
            : "-",
          statusChangedAt: timeValue,
        };
      });

      // 서버에서 이미 필터링된 결과를 사용
      setNfts(nftsData);
      setFilteredNfts(nftsData);

      // 총 개수 확인
      const totalCount = Number(response.totalCount);
      console.log("새로고침 - 서버에서 받은 총 NFT 개수:", totalCount);

      // 페이지네이션 상태 업데이트 - 현재 페이지 유지하면서 total 값 업데이트
      console.log("새로고침 - 페이지네이션 업데이트 전:", {
        현재페이지: currentPage,
        페이지크기: currentPageSize,
        총항목수: pagination.total,
        응답총개수: totalCount,
        데이터길이: nftsData.length,
      });

      // 페이지네이션 업데이트를 콜백 함수로 처리하여 최신 값 보장
      setPagination((prevState) => {
        const updatedPagination = {
          ...prevState,
          current: currentPage,
          total: totalCount,
        };

        console.log("새로고침 - 페이지네이션 업데이트 중:", updatedPagination);
        return updatedPagination;
      });

      // 상태가 실제로 업데이트되기 전이므로 업데이트될 값 미리 로깅
      console.log("새로고침 - 페이지네이션 예상 업데이트 값:", {
        현재페이지: currentPage,
        페이지크기: pagination.pageSize,
        총항목수: totalCount,
        예상페이지수: Math.ceil(totalCount / pagination.pageSize),
      });

      console.log("새로고침 완료: 전체 NFT 개수 = ", totalCount);

      // 로딩 메시지를 성공 메시지로 교체
      message.success({
        content: "새로고침 완료!",
        key: messageKey,
        duration: 1,
      });
    } catch (error) {
      console.error("새로고침 실패:", error);
      // 오류 발생 시 로딩 메시지를 오류 메시지로 교체
      message.error({
        content: "새로고침 실패!",
        key: "refreshMessage",
        duration: 1,
      });
    } finally {
      setLoading(false); // 성공/실패 여부와 관계없이 로딩 상태 해제
    }
  };

  // 주소 축약 함수 추가
  const shortenAddress = (address: string) => {
    if (address === "-") return "-";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // 클립보드 복사 함수 추가
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success("주소가 복사되었습니다.");
      },
      (err) => {
        message.error("주소 복사에 실패했습니다.");
        console.error("복사 실패:", err);
      }
    );
  };

  const columns = [
    {
      title: "허브 ID",
      dataIndex: "id",
      key: "id",
      align: "center" as const,
      render: (id: number) => <span>{`충전 허브 #${id}`}</span>,
    },
    {
      title: "위치",
      dataIndex: "location",
      key: "location",
      align: "center" as const,
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: "충전기 수",
      dataIndex: "chargerCount",
      key: "chargerCount",
      align: "center" as const,
      render: (count: number) => <span>{`${count}대`}</span>,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string) => {
        let displayText = "";
        let color = "";
        switch (status) {
          case "listed":
            displayText = "마켓에 등록";
            color = "#1890ff";
            break;
          case "sold":
            displayText = "판매완료";
            color = "#52c41a";
            break;
          case "staked":
            displayText = "스테이킹";
            color = "#722ed1";
            break;
          case "created":
            displayText = "생성완료";
            color = "#faad14";
            break;
          default:
            displayText = status;
            color = "#d9d9d9";
        }
        return <span style={{ color }}>{displayText}</span>;
      },
    },
    {
      title: "가격",
      dataIndex: "price",
      key: "price",
      render: (
        price: bigint | string | number | undefined,
        record: NFTData
      ) => {
        try {
          // price가 undefined인 경우 처리
          if (price === undefined) {
            return <span>-</span>;
          }

          // 문자열, BigInt, 숫자 모두 처리
          let priceNum: number;

          if (typeof price === "bigint") {
            priceNum = Number(price);
          } else if (typeof price === "string") {
            // "n"이 포함된 BigInt 문자열 처리
            priceNum = price.includes("n")
              ? Number(price.replace("n", ""))
              : parseFloat(price);
          } else {
            priceNum = price;
          }

          if (isNaN(priceNum)) return <span>0 PGC</span>;

          // 상태에 따른 색상 결정
          let color = "#1890ff"; // 기본 색상
          switch (record.status) {
            case "listed":
              color = "#1890ff"; // 파란색
              break;
            case "sold":
              color = "#52c41a"; // 초록색
              break;
            case "staked":
              color = "#722ed1"; // 보라색
              break;
            case "created":
              color = "#faad14"; // 주황색
              break;
          }

          // PGC 단위로 표시 (formatPGCBalance 함수 사용)
          return (
            <span style={{ color }}>{`${formatPGCBalance(
              priceNum,
              8
            )} PGC`}</span>
          );
        } catch (error) {
          console.error("가격 변환 오류:", error, price);
          return <span>가격 오류</span>;
        }
      },
    },
    {
      title: "소유자",
      dataIndex: "owner",
      key: "owner",
      align: "center" as const,
      render: (text: string) => {
        if (text === "-") {
          return "-";
        }
        return (
          <div className="address-display">
            <Tooltip title={text}>
              <span>{shortenAddress(text)}</span>
            </Tooltip>
            <Tooltip title="주소 복사">
              <StyledButton
                customVariant="ghost"
                customSize="sm"
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(text)}
              />
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: "상태 변경 시간",
      dataIndex: "statusChangedAt",
      key: "statusChangedAt",
      render: (time: bigint | string) => {
        // 이미 문자열로 변환된 경우
        if (typeof time === "string" && !time.toString().includes("n")) {
          return <span>{time}</span>;
        }

        // BigInt인 경우 또는 "n"이 포함된 문자열인 경우 변환
        try {
          const timeNum =
            typeof time === "bigint"
              ? Number(time)
              : Number(time.toString().replace("n", ""));
          const date = new Date(timeNum / 1_000_000);
          const formattedDate = date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return <span>{formattedDate}</span>;
        } catch (error) {
          console.error("시간 변환 오류:", error, time);
          return <span>날짜 오류</span>;
        }
      },
    },
    {
      title: "작업",
      key: "action",
      align: "center" as const,
      render: (_: any, record: NFTData) => (
        <Space size="middle">
          <StyledButton
            customVariant="ghost"
            customSize="sm"
            onClick={() => handleEdit(record)}
            icon={<EditOutlined />}
          />
          {record.status === "created" && (
            <StyledButton
              customVariant="ghost"
              customSize="sm"
              onClick={() =>
                handleDelete(
                  typeof record.id === "string"
                    ? parseInt(record.id, 10)
                    : typeof record.id === "bigint"
                    ? Number(record.id)
                    : record.id
                )
              }
              icon={<DeleteOutlined />}
            />
          )}
        </Space>
      ),
    },
  ];

  const handleAddNFT = () => {
    form.resetFields();
    // 전송 유형의 기본값을 '마켓에 등록'으로 설정
    form.setFieldsValue({ transferType: "market" });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      if (!actor) {
        throw new Error("Actor가 초기화되지 않았습니다.");
      }

      // 현재 NFT 총 공급량 조회
      const supply = await actor.icrc7_total_supply();
      const nextTokenId = Number(supply);

      // NFT 메타데이터 생성
      const metadata: Array<[string, Value]> = [
        ["location", { Text: values.location }],
        ["chargerCount", { Nat: BigInt(values.chargerCount) }],
      ];

      console.log("민팅할 NFT 메타데이터:", metadata);

      // NFT 민팅 인자 생성
      const mintArgs: MintArgs = {
        to: {
          owner: Principal.fromText(
            values.transferType === "address"
              ? values.transferAddress
              : process.env.CANISTER_ID_PIGGYCELL_BACKEND || ""
          ),
          subaccount: [],
        },
        token_id: BigInt(nextTokenId),
        metadata: metadata,
      };

      // 사용자가 입력한 raw units 가격을 그대로 사용
      const price =
        values.transferType === "market" ? BigInt(values.price) : BigInt(0);

      console.log("민팅 인자:", {
        mintArgs,
        transferType: values.transferType === "market" ? "market" : "direct",
        price: values.transferType === "market" ? [price] : [],
        rawUnits: values.price,
      });

      // NFT 민팅 및 마켓 등록
      const result = await actor.mint(
        mintArgs,
        values.transferType === "market" ? "market" : "direct",
        values.transferType === "market" ? [price] : []
      );

      console.log("민팅 결과:", result);

      if ("ok" in result) {
        message.success("NFT가 성공적으로 생성되었습니다.", 2);
        // 생성 후 즉시 NFT 목록을 새로고침 - 첫 페이지로 돌아가고 최신순 정렬 유지
        await fetchPaginatedNFTs(
          1,
          pagination.pageSize,
          "statusChangedAt",
          "descend",
          searchText
        );
        // 전체 통계 데이터 다시 조회
        await fetchStats();
        // 페이지네이션 상태 업데이트
        setPagination({
          ...pagination,
          current: 1,
        });
      } else {
        message.error(`NFT 생성 실패: ${result.err}`, 2);
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("NFT 생성 실패:", error);
      message.error("NFT 생성 중 오류가 발생했습니다.", 2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  const handleEdit = async (record: NFTData) => {
    // TODO: NFT 메타데이터 수정 기능 구현
    message.info("메타데이터 수정 기능은 추후 구현 예정입니다.", 2);
  };

  const handleDelete = async (tokenId: number | bigint | string) => {
    // tokenId를 숫자로 변환
    const numericTokenId =
      typeof tokenId === "string"
        ? parseInt(tokenId, 10)
        : typeof tokenId === "bigint"
        ? Number(tokenId)
        : tokenId;

    // TODO: NFT 삭제 기능 구현
    message.info(`NFT #${numericTokenId} 삭제 기능은 추후 구현 예정입니다.`, 2);
  };

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1>NFT 관리</h1>
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={handleRefresh}
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 NFT"
            value={totalStats.totalNFTs}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="판매중인 NFT"
            value={totalStats.availableNFTs}
            prefix={<BarChartOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 충전기"
            value={totalStats.totalChargers}
            prefix={<BarChartOutlined />}
            suffix="대"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 거래량"
            value={totalStats.totalValue}
            prefix={<DollarOutlined />}
            suffix="PGC"
            formatter={(value) => formatPGCBalance(value)}
            loading={loading}
          />
        </Col>
      </Row>

      <div className="search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="NFT ID, 위치 또는 소유자로 검색..."
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
            onChange={(e) => handleSearch(e.target.value)}
            noRotate={true}
          />
        </div>
        <div className="flex gap-2">
          <StyledButton
            customVariant="primary"
            customSize="md"
            onClick={handleAddNFT}
            icon={<PlusOutlined />}
          >
            NFT 추가
          </StyledButton>
        </div>
      </div>

      <StyledTable
        columns={columns}
        dataSource={nfts}
        loading={loading}
        rowKey="id"
        customVariant="bordered"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: Math.max(totalStats.totalNFTs, nfts.length, pagination.total),
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `총 ${total}개 NFT`,
        }}
        onChange={handleTableChange}
      />

      {/* NFT 생성 모달 */}
      <Modal
        title="NFT 추가"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <StyledButton
            key="cancel"
            customVariant="ghost"
            customColor="primary"
            onClick={handleModalCancel}
          >
            취소
          </StyledButton>,
          <StyledButton
            key="submit"
            customVariant="primary"
            customColor="primary"
            loading={isSubmitting}
            onClick={handleModalOk}
          >
            추가
          </StyledButton>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="location"
            label="위치"
            rules={[{ required: true, message: "위치를 입력해주세요" }]}
          >
            <StyledInput
              placeholder="예: 서울시 강남구 역삼동"
              customSize="md"
              noRotate={true}
            />
          </Form.Item>

          <Form.Item
            name="chargerCount"
            label="충전기 수"
            rules={[{ required: true, message: "충전기 수를 입력해주세요" }]}
          >
            <StyledInput
              type="number"
              min={1}
              placeholder="예: 8"
              customSize="md"
              noRotate={true}
            />
          </Form.Item>

          <Form.Item
            name="transferType"
            label="전송 유형"
            rules={[{ required: true, message: "전송 유형을 선택해주세요" }]}
            initialValue="market"
          >
            <Select>
              <Select.Option value="market">마켓에 등록</Select.Option>
              <Select.Option value="address">특정 주소로 전송</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.transferType !== currentValues.transferType
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("transferType") === "market" ? (
                <Form.Item
                  name="price"
                  label="판매 가격 (raw units, 100,000,000 = 1 PGC)"
                  rules={[
                    { required: true, message: "판매 가격을 입력해주세요" },
                  ]}
                >
                  <StyledInput
                    type="number"
                    min={0}
                    placeholder="판매할 NFT 가격 (raw units)"
                    customSize="md"
                    noRotate={true}
                  />
                </Form.Item>
              ) : getFieldValue("transferType") === "address" ? (
                <Form.Item
                  name="transferAddress"
                  label="전송할 주소"
                  rules={[
                    { required: true, message: "전송할 주소를 입력해주세요" },
                  ]}
                >
                  <StyledInput
                    placeholder="Principal ID를 입력하세요"
                    customSize="md"
                    noRotate={true}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NFTManagement;
