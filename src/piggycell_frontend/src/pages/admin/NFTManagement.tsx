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
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { AuthManager } from "../../utils/auth";
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

// NFT 데이터 타입 정의
interface NFTData {
  id: number;
  location: string;
  chargerCount: number;
  status: string;
  owner: string;
  price?: number;
  statusChangedAt: bigint;
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

  // 전체 통계 계산
  const totalStats = {
    totalNFTs: nfts.length,
    availableNFTs: nfts.filter((nft) => nft.status === "listed").length,
    totalChargers: nfts.reduce((sum, nft) => sum + nft.chargerCount, 0),
    totalValue: totalVolume,
  };

  console.log("통계 데이터:", totalStats);

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

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      if (!actor) {
        throw new Error("Actor not initialized");
      }

      // getSortedNFTs 함수를 사용하여 이미 정렬된 NFT 목록을 가져옵니다
      try {
        const sortedNFTsResult = await actor.getSortedNFTs();
        console.log("정렬된 NFT 데이터 수신:", sortedNFTsResult.length);

        if (sortedNFTsResult.length > 0) {
          // 백엔드에서 정렬된 NFT 목록 처리
          const nftList: NFTData[] = sortedNFTsResult.map((nft) => {
            // 명시적으로 값이 항상 string 타입이 되도록 확인
            const location: string = nft.location?.length
              ? (nft.location[0] as string)
              : "";

            const chargerCount: number = nft.chargerCount?.length
              ? Number(nft.chargerCount[0])
              : 0;

            const owner: string = nft.owner?.length
              ? nft.owner[0].toString()
              : "-";

            const price: number | undefined = nft.price?.length
              ? Number(nft.price[0])
              : undefined;

            // 오류 없는 변환을 위해 명시적으로 NFTData 객체 생성
            const nftData: NFTData = {
              id: Number(nft.id),
              location,
              chargerCount,
              owner,
              status: nft.status,
              price,
              statusChangedAt: nft.createdAt,
            };

            return nftData;
          });

          setNfts(nftList);
          return;
        }
      } catch (error) {
        console.error("getSortedNFTs 호출 실패, 기존 방식으로 대체:", error);
      }

      // getSortedNFTs가 실패하면 기존 방식으로 폴백
      const supply = await actor.icrc7_total_supply();
      console.log("NFT 총 공급량:", Number(supply));

      // 배치 크기 설정
      const BATCH_SIZE = 10;
      const nftList: NFTData[] = [];
      const totalNFTs = Number(supply);

      // 배치 처리를 위한 반복 - 내림차순(최신순)으로 요청
      for (
        let batchStart = 0;
        batchStart < totalNFTs;
        batchStart += BATCH_SIZE
      ) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalNFTs);
        // ID를 내림차순으로 요청하도록 수정 (최신 NFT부터 요청)
        const tokenIds = Array.from({ length: batchEnd - batchStart }, (_, i) =>
          BigInt(totalNFTs - 1 - (i + batchStart))
        );

        try {
          // 병렬로 데이터 조회
          const [metadataResults, ownerResults, stakedResults, listingResults] =
            await Promise.all([
              actor.icrc7_token_metadata(tokenIds),
              actor.icrc7_owner_of(tokenIds),
              Promise.all(tokenIds.map((id) => actor.isNFTStaked(id))),
              Promise.all(tokenIds.map((id) => actor.getListing(id))),
            ]);

          // 배치 결과 처리
          for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const metadata = metadataResults[i] || [];
            const ownerAccount = ownerResults[i] as unknown as Account;
            const isStaked = stakedResults[i];
            const listing = listingResults[i];

            // 메타데이터 파싱 함수 수정
            const parseMetadata = (
              metadata: any
            ): { location: string; chargerCount: number; price?: number } => {
              let location = "";
              let chargerCount = 0;
              let price: number | undefined = undefined;

              console.log("메타데이터 파싱 시작 - 원본 데이터:", metadata);

              try {
                if (Array.isArray(metadata) && metadata.length > 0) {
                  metadata.forEach((item) => {
                    console.log("메타데이터 항목:", item);

                    if (Array.isArray(item)) {
                      item.forEach((pair) => {
                        if (Array.isArray(pair) && pair.length === 2) {
                          const [key, value] = pair;
                          console.log("처리중인 키-값 쌍:", { key, value });

                          if (
                            key === "location" &&
                            value &&
                            typeof value === "object" &&
                            "Text" in value
                          ) {
                            location = value.Text;
                            console.log("위치 설정됨:", location);
                          }

                          if (
                            key === "chargerCount" &&
                            value &&
                            typeof value === "object" &&
                            "Nat" in value
                          ) {
                            chargerCount = Number(value.Nat);
                            console.log("충전기 수 설정됨:", chargerCount);
                          }

                          if (
                            key === "price" &&
                            value &&
                            typeof value === "object" &&
                            "Nat" in value
                          ) {
                            price = Number(value.Nat);
                            console.log("가격 설정됨:", price);
                          }
                        }
                      });
                    }
                  });
                }

                console.log("메타데이터 파싱 완료:", {
                  location,
                  chargerCount,
                  price,
                });
              } catch (error) {
                console.error("메타데이터 파싱 중 오류:", error);
              }

              return { location, chargerCount, price };
            };

            const {
              location,
              chargerCount,
              price: metadataPrice,
            } = parseMetadata(metadata);
            console.log("파싱된 최종 결과:", {
              location,
              chargerCount,
              price: metadataPrice,
            });

            const ownerPrincipal = ownerAccount?.owner?.toString() || "-";
            console.log("소유자 정보:", ownerPrincipal);

            // Listing 타입 체크 함수 추가
            const getListingPrice = (
              listing: [] | [Listing]
            ): number | undefined => {
              if (
                Array.isArray(listing) &&
                listing.length > 0 &&
                listing[0] &&
                "price" in listing[0] &&
                listing[0].price !== undefined
              ) {
                return Number(listing[0].price);
              }
              return undefined;
            };

            // NFT 상태 및 가격 설정
            let status = "created";
            let nftPrice = metadataPrice; // 메타데이터의 가격을 기본값으로 사용
            let statusChangedAt = BigInt(Date.now()) * BigInt(1_000_000);
            let currentOwner = ownerPrincipal;

            if (isStaked) {
              status = "staked";
              // 스테이킹 정보 조회
              const stakingInfo = await actor.getStakingInfo(tokenId);
              if (stakingInfo && stakingInfo.length > 0 && stakingInfo[0]) {
                statusChangedAt = stakingInfo[0].stakedAt;
                currentOwner = stakingInfo[0].owner.toString();
              }
            } else if (
              listing &&
              Array.isArray(listing) &&
              listing.length > 0 &&
              listing[0]
            ) {
              status = "listed";
              const firstListing = listing[0];
              if (firstListing && "listedAt" in firstListing) {
                statusChangedAt = BigInt(firstListing.listedAt);
              }
            } else if (
              ownerPrincipal !== "-" &&
              ownerPrincipal !== process.env.CANISTER_ID_PIGGYCELL_BACKEND
            ) {
              status = "sold";
            }

            console.log("NFT 상태 설정:", {
              id: Number(tokenId),
              status,
              owner: currentOwner,
              price: nftPrice,
              statusChangedAt: statusChangedAt.toString(),
              backendCanisterId: process.env.CANISTER_ID_PIGGYCELL_BACKEND,
            });

            nftList.push({
              id: Number(tokenId),
              location,
              chargerCount,
              owner: currentOwner,
              status,
              price: nftPrice,
              statusChangedAt,
            });
          }
        } catch (batchError) {
          console.error(
            `배치 처리 중 오류 발생 (${batchStart}-${batchEnd}):`,
            batchError
          );
          message.error(
            `NFT 데이터 조회 중 오류가 발생했습니다 (${batchStart}-${batchEnd})`
          );
        }
      }

      // 최종적으로 ID 기준으로 내림차순 정렬하여 최신 NFT가 맨 위에 표시되도록 함
      setNfts(nftList.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("NFT 데이터 조회 중 오류 발생:", error);
      message.error("NFT 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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
        await fetchNFTs();
        await fetchTotalVolume();
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
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

  // 검색 핸들러 추가
  const handleSearch = (value: string) => {
    setSearchText(value);
    const searchLower = value.toLowerCase();
    const filtered = nfts.filter(
      (nft) =>
        `충전 허브 #${nft.id}`.toLowerCase().includes(searchLower) ||
        nft.location.toLowerCase().includes(searchLower) ||
        nft.owner.toLowerCase().includes(searchLower)
    );
    setFilteredNfts(filtered);
  };

  useEffect(() => {
    setFilteredNfts(nfts);
  }, [nfts]);

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
      align: "center" as const,
      render: (price: number | undefined, record: NFTData) => {
        if (price) {
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
          return <span style={{ color }}>{`${price} PGC`}</span>;
        }
        return <span>-</span>;
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
      align: "center" as const,
      render: (time: bigint) => {
        const date = new Date(Number(time) / 1_000_000);
        const formattedDate = date.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        return <span>{formattedDate}</span>;
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
              onClick={() => handleDelete(record.id)}
              icon={<DeleteOutlined />}
            />
          )}
        </Space>
      ),
    },
  ];

  const handleAddNFT = () => {
    form.resetFields();
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

      console.log("민팅 인자:", {
        mintArgs,
        transferType: values.transferType === "market" ? "market" : "direct",
        price: values.transferType === "market" ? [BigInt(values.price)] : [],
      });

      // NFT 민팅 및 마켓 등록
      const result = await actor.mint(
        mintArgs,
        values.transferType === "market" ? "market" : "direct",
        values.transferType === "market" ? [BigInt(values.price)] : []
      );

      console.log("민팅 결과:", result);

      if ("ok" in result) {
        message.success("NFT가 성공적으로 생성되었습니다.");
        // 생성 후 즉시 NFT 목록을 새로고침
        await fetchNFTs();
      } else {
        message.error(`NFT 생성 실패: ${result.err}`);
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("NFT 생성 실패:", error);
      message.error("NFT 생성 중 오류가 발생했습니다.");
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
    message.info("메타데이터 수정 기능은 추후 구현 예정입니다.");
  };

  const handleDelete = async (tokenId: number) => {
    // TODO: NFT 삭제 기능 구현
    message.info("NFT 삭제 기능은 추후 구현 예정입니다.");
  };

  const handleRefresh = async () => {
    await fetchNFTs();
    await fetchTotalVolume();
  };

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">NFT 관리</h1>
        <div className="flex justify-end mb-4">
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

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 NFT"
            value={totalStats.totalNFTs}
            prefix={<ShoppingCartOutlined />}
            suffix="개"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="판매중인 NFT"
            value={totalStats.availableNFTs}
            prefix={<BarChartOutlined />}
            suffix="개"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 충전기"
            value={totalStats.totalChargers}
            prefix={<BarChartOutlined />}
            suffix="대"
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 거래량"
            value={totalStats.totalValue}
            prefix={<DollarOutlined />}
            suffix="PGC"
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
          />
        </div>
        <StyledButton
          customVariant="primary"
          customColor="primary"
          onClick={handleRefresh}
          icon={<SearchOutlined />}
        >
          새로고침
        </StyledButton>
      </div>

      <StyledTable
        columns={columns}
        dataSource={searchText ? filteredNfts : nfts}
        loading={loading}
        rowKey="id"
        customVariant="bordered"
        pagination={{ pageSize: 10 }}
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
            />
          </Form.Item>

          <Form.Item
            name="transferType"
            label="전송 유형"
            rules={[{ required: true, message: "전송 유형을 선택해주세요" }]}
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
                  label="판매 가격 (PGC)"
                  rules={[
                    { required: true, message: "판매 가격을 입력해주세요" },
                  ]}
                >
                  <StyledInput
                    type="number"
                    min={0}
                    placeholder="예: 100"
                    customSize="md"
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
