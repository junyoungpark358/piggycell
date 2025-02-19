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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  DollarOutlined,
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

  // 전체 통계 계산
  const totalStats = {
    totalNFTs: nfts.length,
    availableNFTs: nfts.filter((nft) => nft.status === "available").length,
    totalChargers: nfts.reduce((sum, nft) => {
      console.log(`NFT #${nft.id} 충전기 수:`, nft.chargerCount);
      return sum + nft.chargerCount;
    }, 0),
    totalValue: nfts.reduce((sum, nft) => {
      if (nft.status === "available" && nft.price) {
        console.log(`NFT #${nft.id} 가격:`, nft.price);
        return sum + nft.price;
      }
      return sum;
    }, 0),
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
          console.log(`메타데이터 조회 시작 (tokenId: ${tokenId})`);
          const metadataResult = await actor.icrc7_metadata(tokenId);
          console.log("메타데이터 응답 타입:", typeof metadataResult);
          console.log(
            "메타데이터 응답 값:",
            JSON.stringify(metadataResult, (_, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );
          const metadata = metadataResult || [];

          // 소유자 조회
          console.log(`\n소유자 조회 시작 (tokenId: ${tokenId})`);
          const ownerResult = await actor.icrc7_owner_of(tokenId);
          console.log("소유자 응답 타입:", typeof ownerResult);
          console.log(
            "소유자 응답 값:",
            JSON.stringify(ownerResult, (_, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );
          const owner = ownerResult || [];

          // 리스팅 조회
          console.log(`\n리스팅 조회 시작 (tokenId: ${tokenId})`);
          const listingResult = await actor.getListing(tokenId);
          console.log("리스팅 응답 타입:", typeof listingResult);
          console.log(
            "리스팅 응답 값:",
            JSON.stringify(listingResult, (_, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );
          const listing = listingResult || [];

          let location = "";
          let chargerCount = 0;

          // 메타데이터 처리
          if (
            Array.isArray(metadata) &&
            metadata.length > 0 &&
            Array.isArray(metadata[0])
          ) {
            console.log("\n메타데이터 처리:");
            const metadataEntries = metadata[0];
            for (const [key, value] of metadataEntries) {
              console.log("키:", key);
              console.log(
                "값:",
                JSON.stringify(value, (_, v) =>
                  typeof v === "bigint" ? v.toString() : v
                )
              );
              if (typeof key === "string") {
                const metadataValue = value as MetadataValue;
                if (key === "location" && metadataValue.Text) {
                  location = metadataValue.Text;
                  console.log("위치 설정:", location);
                }
                if (key === "chargerCount" && metadataValue.Nat) {
                  chargerCount = Number(metadataValue.Nat);
                  console.log("충전기 수 설정:", chargerCount);
                }
              }
            }
          }

          // 소유자 처리
          let ownerPrincipal = "-";
          if (owner && Array.isArray(owner) && owner.length > 0) {
            console.log("\n소유자 처리:");
            const ownerAccount = owner[0] as Account;
            if (ownerAccount && ownerAccount.owner) {
              ownerPrincipal = Principal.fromUint8Array(
                ownerAccount.owner.toUint8Array()
              ).toString();
              console.log("소유자 Principal:", ownerPrincipal);
            }
          }

          // 리스팅 처리
          let nftPrice: number | undefined = undefined;
          let statusChangedAt = BigInt(0);
          if (listing && Array.isArray(listing) && listing.length > 0) {
            console.log("\n리스팅 처리:");
            const listingData = listing[0] as Listing;
            if (listingData && typeof listingData.price !== "undefined") {
              nftPrice = Number(listingData.price);
              statusChangedAt = BigInt(listingData.listedAt);
              console.log("NFT 가격:", nftPrice);
              console.log("상태 변경 시간:", statusChangedAt.toString());
            }
          }

          // 상태 처리
          let status = "created";
          if (listing && listing.length > 0) {
            status = "available";
          } else if (owner && owner.length > 0) {
            status = "sold";
            // 판매완료 상태일 때는 실제 판매 시점의 시간과 가격을 사용
            if (statusChangedAt === BigInt(0) || nftPrice === undefined) {
              // 판매 시점의 시간과 가격을 가져오기 위해 거래 내역을 조회
              const transactionHistory = await actor.getTransactions(
                BigInt(0),
                BigInt(100)
              );
              const nftSaleTransaction = transactionHistory.items.find(
                (tx) =>
                  tx.txType === "NFT 판매" &&
                  tx.nftId &&
                  Array.isArray(tx.nftId) &&
                  tx.nftId.length > 0 &&
                  tx.nftId[0] === `충전 허브 #${i}`
              );

              if (nftSaleTransaction) {
                // 거래 내역에서 찾은 시간과 가격을 사용
                const saleDate = new Date(nftSaleTransaction.date);
                statusChangedAt =
                  BigInt(saleDate.getTime()) * BigInt(1_000_000);
                nftPrice = Number(nftSaleTransaction.amount);
              } else {
                // 거래 내역을 찾지 못한 경우에만 현재 시간 사용
                statusChangedAt = BigInt(Date.now()) * BigInt(1_000_000);
              }
            }
          } else {
            // 생성완료 상태일 때도 현재 시간을 사용
            statusChangedAt = BigInt(Date.now()) * BigInt(1_000_000); // 밀리초를 나노초로 변환
          }
          console.log("\n상태:", status);

          const nftData = {
            id: i,
            location,
            chargerCount,
            status,
            owner: ownerPrincipal,
            price: nftPrice,
            statusChangedAt,
          };

          console.log(
            "\n최종 NFT 데이터:",
            JSON.stringify(nftData, (_, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );
          nftList.push(nftData);
        } catch (error) {
          console.error(`NFT #${i} 데이터 조회 중 오류:`, error);
        }
      }

      console.log(
        "\n최종 NFT 목록:",
        JSON.stringify(nftList, (_, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );
      setNfts(nftList);
    } catch (error) {
      console.error("NFT 목록 조회 실패:", error);
      message.error("NFT 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
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
    }
  }, [actor]);

  const columns = [
    {
      title: "허브 ID",
      dataIndex: "id",
      key: "id",
      render: (id: number) => `충전 허브 #${id}`,
    },
    {
      title: "위치",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "충전기 수",
      dataIndex: "chargerCount",
      key: "chargerCount",
      render: (count: number) => `${count}대`,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        switch (status) {
          case "available":
            return "판매중";
          case "sold":
            return "판매완료";
          case "created":
            return "생성완료";
          default:
            return status;
        }
      },
    },
    {
      title: "가격",
      dataIndex: "price",
      key: "price",
      render: (price?: number) => (price ? `${price} PGC` : "-"),
    },
    {
      title: "소유자",
      dataIndex: "owner",
      key: "owner",
      render: (owner: string, record: NFTData) =>
        record.status === "available" || owner === "-"
          ? "-"
          : `${owner.slice(0, 8)}...${owner.slice(-8)}`,
    },
    {
      title: "상태 변경 시간",
      dataIndex: "statusChangedAt",
      key: "statusChangedAt",
      render: (time: bigint) => {
        const date = new Date(Number(time) / 1_000_000);
        return date.toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      title: "작업",
      key: "action",
      render: (_: any, record: NFTData) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status === "created" && (
            <Button
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

      console.log("민팅 인자:", mintArgs);

      // NFT 민팅 및 마켓 등록
      const result = await actor.mint(
        mintArgs,
        values.transferType === "market" ? "market" : "direct",
        values.transferType === "market" ? [BigInt(values.price)] : []
      );

      console.log("민팅 결과:", result);

      if ("ok" in result) {
        message.success("NFT가 성공적으로 생성되었습니다.");
        fetchNFTs(); // NFT 목록 새로고침
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

      {/* NFT 목록 테이블 */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={nfts}
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
