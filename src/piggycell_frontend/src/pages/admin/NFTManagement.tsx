import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tooltip,
} from "antd";
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
  Metadata,
  MintArgs,
  Listing,
  Account,
} from "../../../../declarations/piggycell_backend/piggycell_backend.did";
import "./NFTManagement.css";

interface NFTData {
  id: number;
  location: string;
  chargerCount: number;
  status: string;
  owner: string;
  price?: number;
  statusChangedAt: bigint;
}

type MetadataValue = {
  Text?: string;
  Nat?: bigint;
  Int?: bigint;
  Bool?: boolean;
  Blob?: Uint8Array;
  Principal?: Principal;
};

type MetadataPair = [string, MetadataValue];

const NFTManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
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
    availableNFTs: nfts.filter((nft) => nft.status === "market").length,
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
      if (!actor) return;

      const supply = await actor.icrc7_supply();
      console.log("NFT 총 공급량:", Number(supply));
      const nftList: NFTData[] = [];

      for (let i = 0; i < Number(supply); i++) {
        try {
          const tokenId = BigInt(i);
          console.log(`\n========== NFT #${i} 데이터 조회 시작 ==========`);

          // 메타데이터 조회
          const metadataResult = await actor.icrc7_metadata(tokenId);
          const metadata = metadataResult || [];

          // 소유자 조회
          const ownerResult = await actor.icrc7_owner_of(tokenId);
          const owner = ownerResult || [];

          // 스테이킹 상태 조회
          const isStaked = await actor.isNFTStaked(tokenId);

          // 리스팅 조회
          const listingResult = await actor.getListing(tokenId);
          const listing = listingResult || [];

          console.log(`NFT #${i} 리스팅 정보:`, listing);

          let location = "";
          let chargerCount = 0;

          // 메타데이터 처리
          if (
            Array.isArray(metadata) &&
            metadata.length > 0 &&
            Array.isArray(metadata[0])
          ) {
            const metadataEntries = metadata[0];
            for (const [key, value] of metadataEntries) {
              if (typeof key === "string") {
                const metadataValue = value as MetadataValue;
                if (key === "location" && metadataValue.Text) {
                  location = metadataValue.Text;
                }
                if (key === "chargerCount" && metadataValue.Nat) {
                  chargerCount = Number(metadataValue.Nat);
                }
              }
            }
          }

          // 소유자 처리
          let ownerPrincipal = "-";
          if (owner && Array.isArray(owner) && owner.length > 0) {
            const ownerAccount = owner[0] as Account;
            if (ownerAccount && ownerAccount.owner) {
              ownerPrincipal = Principal.fromUint8Array(
                ownerAccount.owner.toUint8Array()
              ).toString();
            }
          }

          // NFT 상태 설정
          let status = "created";
          let nftPrice: number | undefined = undefined;
          let statusChangedAt = BigInt(0);

          // 스테이킹 상태 확인
          if (isStaked) {
            status = "staked";
            // 스테이킹된 경우에도 마지막 거래 내역에서 가격 정보를 가져옴
            const transactions = await actor.icrc3_get_transactions({
              start: [BigInt(0)],
              length: [BigInt(10)],
              account: [],
            });

            const nftTransactions = transactions.transactions.filter(
              (tx) =>
                tx.token_ids.length > 0 &&
                tx.token_ids[0] === BigInt(i) &&
                tx.kind === "transfer"
            );

            if (nftTransactions.length > 0) {
              const lastTransaction = nftTransactions[0];
              if (lastTransaction.amount && lastTransaction.amount.length > 0) {
                nftPrice = Number(lastTransaction.amount[0]);
                statusChangedAt = lastTransaction.timestamp;
              }
            }
          }
          // 리스팅 정보 확인
          else if (listing && Array.isArray(listing) && listing.length > 0) {
            const listingData = listing[0] as Listing;
            if (listingData && typeof listingData.price !== "undefined") {
              nftPrice = Number(listingData.price);
              statusChangedAt = BigInt(listingData.listedAt);
              status = "market";
            }
          }
          // 소유자가 백엔드가 아닌 경우 sold 상태로 설정
          else if (
            ownerPrincipal.toString() !==
            process.env.CANISTER_ID_PIGGYCELL_BACKEND
          ) {
            status = "sold";
            // 판매된 NFT의 가격 정보 유지
            if (!nftPrice) {
              console.log(`NFT #${i} 판매 가격 조회 시작`);
              const transactions = await actor.icrc3_get_transactions({
                start: [],
                length: [BigInt(10)], // 더 많은 거래 내역 조회
                account: [],
              });

              console.log(`NFT #${i} 거래 내역:`, transactions);

              // 해당 NFT의 거래 내역 중 transfer 타입만 필터링
              const nftTransactions = transactions.transactions.filter(
                (tx) =>
                  tx.token_ids.some((id) => Number(id) === i) &&
                  tx.kind === "transfer"
              );

              console.log(
                `NFT #${i} 필터링된 거래 내역 (transfer만):`,
                nftTransactions
              );

              if (nftTransactions.length > 0) {
                // 가장 최근 transfer 거래의 금액 사용
                const lastTransaction = nftTransactions[0];
                console.log(`NFT #${i} 마지막 transfer 거래:`, lastTransaction);

                if (
                  lastTransaction.amount &&
                  lastTransaction.amount.length > 0
                ) {
                  nftPrice = Number(lastTransaction.amount[0]);
                  console.log(`NFT #${i} 가격 설정:`, nftPrice);
                  statusChangedAt = lastTransaction.timestamp;
                }
              }
            }
          }

          // created 상태일 때만 현재 시간 사용
          if (status === "created" && statusChangedAt === BigInt(0)) {
            statusChangedAt = BigInt(Date.now()) * BigInt(1_000_000);
          }

          const nftData = {
            id: i,
            location,
            chargerCount,
            status,
            owner: ownerPrincipal.toString(),
            price: nftPrice,
            statusChangedAt,
          };

          console.log("NFT 데이터:", nftData); // 디버깅을 위한 로그 추가

          nftList.push(nftData);
        } catch (error) {
          console.error(`NFT #${i} 데이터 조회 중 오류:`, error);
        }
      }

      setNfts(nftList);
    } catch (error) {
      console.error("NFT 목록 조회 실패:", error);
      message.error("NFT 목록을 불러오는데 실패했습니다.");
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
        const newActor = await createActor();
        setActor(newActor);
      } catch (error) {
        console.error("Actor 생성 실패:", error);
        message.error("초기화에 실패했습니다.");
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (actor) {
      fetchNFTs();
      fetchTotalVolume();
    }
  }, [actor]);

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
          case "market":
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
            case "market":
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
              <Button
                type="link"
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          {record.status === "created" && (
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record.id)}
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
      const values = await form.validateFields();
      if (!actor) {
        throw new Error("Actor가 초기화되지 않았습니다.");
      }

      // 현재 NFT 총 공급량 조회
      const supply = await actor.icrc7_supply();
      const nextTokenId = Number(supply);

      // NFT 메타데이터 생성
      const metadata: Array<[string, Metadata]> = [
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

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1 className="mb-6 text-5xl font-extrabold text-sky-600">NFT 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNFT}>
          새 NFT 생성
        </Button>
      </div>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="전체 충전 허브"
              value={totalStats.totalNFTs}
              suffix="개"
              prefix={<ShoppingCartOutlined />}
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
              prefix={<BarChartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="전체 충전기"
              value={totalStats.totalChargers}
              suffix="대"
              prefix={<DollarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card>
            <Statistic
              title="총 거래액"
              value={totalStats.totalValue}
              suffix="PGC"
              prefix={<DollarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <div className="search-box">
        <Input
          placeholder="NFT ID, 위치 또는 소유자로 검색..."
          prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {/* NFT 목록 테이블 */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={searchText ? filteredNfts : nfts}
          loading={loading}
          rowKey="id"
        />
      </Card>

      {/* NFT 생성 모달 */}
      <Modal
        title="새 NFT 생성"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="location"
            label="위치"
            rules={[{ required: true, message: "위치를 입력해주세요" }]}
          >
            <Input placeholder="예: 서울시 강남구 역삼동" />
          </Form.Item>

          <Form.Item
            name="chargerCount"
            label="충전기 수"
            rules={[{ required: true, message: "충전기 수를 입력해주세요" }]}
          >
            <Input type="number" min={1} placeholder="예: 8" />
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
                  <Input type="number" min={0} placeholder="예: 100" />
                </Form.Item>
              ) : getFieldValue("transferType") === "address" ? (
                <Form.Item
                  name="transferAddress"
                  label="전송할 주소"
                  rules={[
                    { required: true, message: "전송할 주소를 입력해주세요" },
                  ]}
                >
                  <Input placeholder="Principal ID를 입력하세요" />
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
