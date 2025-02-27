import React, { useState, useEffect } from "react";
import {
  Form,
  message,
  Row,
  Col,
  Modal,
  Typography,
  Spin,
  Pagination,
  Input,
  Space,
} from "antd";
import { useTheme } from "../../contexts/ThemeContext";
import { Principal } from "@dfinity/principal";
import {
  ReloadOutlined,
  SendOutlined,
  SearchOutlined,
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  DollarOutlined,
  UserOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { StyledTable } from "../../components/common/StyledTable";
import { StatCard } from "../../components/StatCard";
// 백엔드 액터 가져오기 - 이 방식으로 불러온 액터는 사용자 인증을 유지하는지 확인 필요
import { piggycell_backend } from "../../../../declarations/piggycell_backend";
import { idlFactory } from "../../../../declarations/piggycell_backend";
import type { _SERVICE } from "../../../../declarations/piggycell_backend/piggycell_backend.did";
import { AuthManager } from "../../utils/auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import "./NFTManagement.css"; // NFT 관리 페이지의 CSS를 재사용
import { FilterValue, SorterResult } from "antd/es/table/interface";
import { createActor } from "../../utils/statsApi"; // 기존 createActor 함수 가져오기

const { Title } = Typography;
const { Search } = Input;

// 토큰 잔액 변환 함수 추가 (8자리 소수점 고려)
const formatTokenBalance = (rawBalance: number | bigint): number => {
  const balance = Number(rawBalance);
  return balance / Math.pow(10, 8);
};

interface TokenOwner {
  key: string;
  address: string;
  balance: number;
}

const TokenManagement: React.FC = () => {
  const theme = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tokenOwners, setTokenOwners] = useState<TokenOwner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tokenStats, setTokenStats] = useState({
    totalSupply: 0,
    totalHolders: 0,
    transactionCount: 0,
  });
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [currentPrincipal, setCurrentPrincipal] = useState<string | null>(null);

  // 페이지네이션 상태 추가
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 현재 사용자의 Principal ID와 관리자 상태 확인
  const checkAdminStatus = async () => {
    try {
      const authManager = AuthManager.getInstance();
      const principal = await authManager.getPrincipal();

      if (principal) {
        const principalStr = principal.toString();
        setCurrentPrincipal(principalStr);
        console.log("현재 로그인한 사용자의 Principal ID:", principalStr);

        const isAdmin = await authManager.isAdmin();
        console.log("프론트엔드에서의 관리자 권한 여부:", isAdmin);

        // 백엔드에서 관리자 여부 확인 (이 함수가 존재하는 경우)
        try {
          // 백엔드에 관리자 여부를 확인하는 API가 있다면 호출
          // 예시: const backendIsAdmin = await piggycell_backend.check_is_admin(principal);
          // console.log("백엔드에서의 관리자 권한 여부:", backendIsAdmin);
          // 현재 백엔드에 이러한 API가 없으므로 주석 처리
        } catch (error) {
          console.error("백엔드 관리자 확인 중 오류:", error);
        }

        if (!isAdmin) {
          message.warning(
            `현재 계정(${principalStr})은 프론트엔드에서 관리자로 인식되지 않습니다.`
          );
        }
      } else {
        console.log("로그인되지 않았거나 Principal을 가져올 수 없습니다.");
      }
    } catch (error) {
      console.error("관리자 상태 확인 중 오류:", error);
    }
  };

  // 가상의 데이터 생성 함수
  const generateMockData = () => {
    // 가상의 토큰 소유자 데이터
    const mockOwners: TokenOwner[] = [
      {
        key: "7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe",
        address:
          "7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe",
        balance: 1, // 1 PGC로 수정
      },
      {
        key: "cd5wa-o3kaa-caaaa-qaaka-cai",
        address: "cd5wa-o3kaa-caaaa-qaaka-cai",
        balance: 2.5, // 2.5 PGC로 수정
      },
      {
        key: "example-principal-3",
        address: "example-principal-3",
        balance: 0.75, // 0.75 PGC로 수정
      },
    ];

    setTokenOwners(mockOwners);
    setTokenStats({
      totalSupply: 4.25, // 4.25 PGC로 수정
      totalHolders: mockOwners.length,
      transactionCount: 25,
    });

    // 페이지네이션 총 개수 설정
    setPagination((prev) => ({
      ...prev,
      total: mockOwners.length,
    }));
  };

  const fetchTokenStats = async () => {
    try {
      setLoading(true);

      // 실제 환경에서 백엔드에서 데이터를 가져오기
      const actor = await createActor();

      // 1. 총 토큰 공급량 가져오기
      const totalSupply = formatTokenBalance(await actor.icrc1_total_supply());

      // 2. 토큰 보유자 수 가져오기
      const holdersCount = Number(await actor.get_token_holders_count());

      // 3. 거래 건수 가져오기
      const txCount = Number(await actor.get_transaction_count());

      // 4. 토큰 보유자 목록 가져오기
      const holders = await actor.get_token_holders();
      const ownersData: TokenOwner[] = holders.map(([principal, balance]) => ({
        key: principal.toString(),
        address: principal.toString(),
        balance: formatTokenBalance(balance), // 소수점 8자리 적용
      }));

      setTokenOwners(ownersData);
      setTokenStats({
        totalSupply,
        totalHolders: holdersCount,
        transactionCount: txCount,
      });

      // 페이지네이션 총 개수 설정
      setPagination((prev) => ({
        ...prev,
        total: ownersData.length,
      }));
    } catch (error) {
      console.error("토큰 통계 데이터를 가져오는 중 오류 발생:", error);
      message.error("토큰 통계 데이터를 가져오는 중 오류가 발생했습니다.");

      // 오류 발생 시 백업으로 가상 데이터 생성
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStats();

    // 백엔드 액터 정보 로깅
    console.log("[TokenManagement] 페이지 로드 시 백엔드 액터 참조:", {
      type: typeof piggycell_backend,
      hasMintTokens: "mint_tokens" in piggycell_backend,
    });
  }, []);

  // piggycell_backend 액터의 속성 확인 함수
  const checkActorProperties = () => {
    try {
      // Actor 객체 속성 확인 (개발용)
      const actorProps = Object.getOwnPropertyNames(piggycell_backend);
      console.log("[Actor 디버깅] piggycell_backend 속성:", actorProps);

      // Agent 직접 접근 시도
      // 참고: 이 부분은 내부 구현이 변경될 수 있어 동작하지 않을 수 있음
      const agent = (piggycell_backend as any)._agent || null;
      console.log(
        "[Actor 디버깅] agent 접근 결과:",
        agent ? "agent 존재" : "agent 없음"
      );

      return "Actor 속성 확인 완료";
    } catch (error) {
      console.error("[Actor 디버깅] 에러:", error);
      return "Actor 속성 확인 실패";
    }
  };

  const handleTransferToken = async (values: any) => {
    try {
      setTransferLoading(true);
      const { recipient, amount } = values;

      // Principal ID 유효성 검사
      let recipientPrincipal;
      try {
        recipientPrincipal = Principal.fromText(recipient);
      } catch (error) {
        message.error("유효하지 않은 Principal ID 형식입니다.");
        setTransferLoading(false);
        return;
      }

      // 금액 유효성 검사
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        message.error("유효한 토큰 수량을 입력해주세요.");
        setTransferLoading(false);
        return;
      }

      const authManager = AuthManager.getInstance();
      const principal = await authManager.getPrincipal();

      // 관리자 권한 검사
      const isAdmin = await authManager.isAdmin();
      if (!isAdmin) {
        message.error(
          "관리자 권한이 없습니다. 토큰 추가 기능은 관리자만 사용할 수 있습니다."
        );
        setTransferLoading(false);
        return;
      }

      if (!principal) {
        message.error("관리자 인증에 실패했습니다.");
        setTransferLoading(false);
        return;
      }

      // 디버그 로그 추가: 호출 직전 상태
      console.log(
        "[토큰 전송 디버그] 현재 로그인 Principal:",
        principal.toString()
      );

      // 진행 중임을 알리는 메시지
      const messageKey = "transferMessage";
      message.loading({
        content: "토큰 전송 중입니다...",
        key: messageKey,
        duration: 0,
      });

      // 인증된 액터 생성 (기존 프로젝트의 createActor 함수 사용)
      console.log("[토큰 전송 디버그] 인증된 액터 생성 시작");
      const authenticatedActor = await createActor();
      console.log("[토큰 전송 디버그] 인증된 액터 생성 완료");

      // 토큰 전송 실행 (인증된 액터 사용)
      try {
        console.log("[토큰 전송 디버그] mint_tokens 호출 직전");
        // raw units 그대로 사용 (변환하지 않음)
        const tokenAmount = BigInt(amount);
        const result = await authenticatedActor.mint_tokens(
          {
            owner: recipientPrincipal,
            subaccount: [],
          },
          tokenAmount
        );
        console.log("[토큰 전송 디버그] mint_tokens 호출 결과:", result);

        if ("ok" in result) {
          // 성공 메시지 표시 - PGC 단위로 변환하여 표시
          const pgcAmount = formatTokenBalance(tokenAmount);
          message.success({
            content: `${pgcAmount} PGC 토큰이 성공적으로 전송되었습니다.`,
            key: messageKey,
            duration: 2,
          });

          setIsTransferModalVisible(false);
          form.resetFields();

          // 데이터 새로고침
          await fetchTokenStats();
        } else {
          // 실패 메시지 표시
          let errorMsg = "알 수 없는 오류";

          if (result.err) {
            if (typeof result.err === "string") {
              errorMsg = result.err;
            } else if (typeof result.err === "object") {
              // 객체 형태의 오류 메시지 형식에 따라 처리
              errorMsg = JSON.stringify(result.err);

              // 특정 오류 메시지에 대한 사용자 친화적 메시지 정의
              if (errorMsg.includes("관리자")) {
                errorMsg =
                  "관리자 권한이 없습니다. 백엔드 관리자 설정을 확인해주세요.";
              } else if (
                errorMsg.includes("balance") ||
                errorMsg.includes("잔액")
              ) {
                errorMsg = "잔액이 부족합니다.";
              }
            }
          }

          message.error({
            content: `토큰 전송 실패: ${errorMsg}`,
            key: messageKey,
            duration: 3,
          });
        }
      } catch (error) {
        console.error("토큰 전송 API 호출 중 오류:", error);
        message.error({
          content: "토큰 전송 중 오류가 발생했습니다.",
          key: messageKey,
          duration: 3,
        });
      }
    } catch (error) {
      console.error("토큰 전송 중 오류 발생:", error);
      message.error("토큰 전송 중 오류가 발생했습니다.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({
      ...prev,
      current: 1,
    }));
  };

  const handleRefresh = () => {
    // 로딩 메시지 키를 저장하여 나중에 이 메시지를 업데이트할 수 있도록 함
    const messageKey = "refreshMessage";
    message.loading({
      content: "데이터를 새로고침 중입니다...",
      key: messageKey,
      duration: 0,
    });

    setLoading(true);

    fetchTokenStats()
      .catch((error) => {
        console.error("새로고침 실패:", error);
        message.error({
          content: "새로고침 실패!",
          key: messageKey,
          duration: 2,
        });
      })
      .finally(() => {
        setLoading(false);
        // 로딩 메시지를 성공 메시지로 교체
        message.success({
          content: "새로고침 완료!",
          key: messageKey,
          duration: 2,
        });
      });
  };

  // 테이블 변경 핸들러 추가
  const handleTableChange = (
    newPagination: any,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<TokenOwner> | SorterResult<TokenOwner>[]
  ) => {
    const { current = 1, pageSize = 10 } = newPagination;

    // 페이지네이션 상태 업데이트
    setPagination({
      current: Number(current),
      pageSize: Number(pageSize),
      total: tokenOwners.length,
    });
  };

  const filteredOwners = tokenOwners.filter((owner) =>
    owner.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentPageData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredOwners.slice(startIndex, endIndex);
  };

  // 테이블 컬럼 정의
  const ownerColumns = [
    {
      title: "지갑 ID",
      dataIndex: "address",
      key: "address",
      width: "70%",
      render: (address: string) => (
        <div className="address-display">
          <span>{address}</span>
          <StyledButton
            customVariant="ghost"
            customSize="sm"
            onClick={() => {
              navigator.clipboard.writeText(address);
              message.success("주소가 클립보드에 복사되었습니다.");
            }}
            icon={<CopyOutlined />}
          />
        </div>
      ),
    },
    {
      title: "잔액",
      dataIndex: "balance",
      key: "balance",
      width: "30%",
      render: (balance: number) => {
        const balanceStr = balance.toFixed(8);
        const parts = balanceStr.split(".");
        return (
          <div style={{ fontWeight: "medium" }}>
            <span style={{ color: "#1890ff" }}>{parts[0]}</span>
            <span
              style={{
                color: "#1e40af",
                fontSize: "1.2em",
                margin: "0 2px",
                fontWeight: "bold",
              }}
            >
              .
            </span>
            <span style={{ color: "#6b7280" }}>{parts[1]}</span>
            <span style={{ color: "#4b5563", marginLeft: "4px" }}>PGC</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1>토큰 관리</h1>
        <div className="flex gap-2">
          <StyledButton
            customVariant="primary"
            customSize="md"
            onClick={handleRefresh}
            icon={<ReloadOutlined />}
          >
            새로 고침
          </StyledButton>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="토큰 발행량"
            value={tokenStats.totalSupply}
            prefix={<DollarOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="토큰 보유자"
            value={tokenStats.totalHolders}
            prefix={<UserOutlined />}
            suffix="명"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8} md={8}>
          <StatCard
            title="거래 건수"
            value={tokenStats.transactionCount}
            prefix={<BarChartOutlined />}
            suffix="건"
            loading={loading}
          />
        </Col>
      </Row>

      {/* 검색창 및 버튼 */}
      <div className="search-box">
        <div className="search-input-wrapper">
          <StyledInput
            placeholder="지갑 ID 또는 소유자로 검색..."
            prefix={<SearchOutlined style={{ color: "#0284c7" }} />}
            customSize="md"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <StyledButton
            customVariant="primary"
            customSize="md"
            onClick={() => setIsTransferModalVisible(true)}
            icon={<PlusOutlined />}
          >
            토큰 추가
          </StyledButton>
        </div>
      </div>

      {/* 토큰 소유자 테이블 */}
      <StyledTable
        columns={ownerColumns}
        dataSource={getCurrentPageData()}
        loading={loading}
        rowKey="key"
        customVariant="bordered"
        customSize="md"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredOwners.length,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `총 ${total}개 지갑`,
        }}
        onChange={handleTableChange}
      />

      {/* 토큰 전송 모달 */}
      <Modal
        title="PGC 토큰 전송"
        open={isTransferModalVisible}
        onCancel={() => setIsTransferModalVisible(false)}
        footer={null}
        className="admin-modal"
      >
        {currentPrincipal && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.5rem",
              background: "#f0f9ff",
              borderRadius: "4px",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              <strong>현재 계정:</strong> {currentPrincipal}
            </p>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
              <strong>알림:</strong> 백엔드에서 이 계정이 관리자로 등록되어
              있어야 토큰 발행이 가능합니다.
            </p>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleTransferToken}>
          <Form.Item
            name="recipient"
            label="수신자 주소 (Principal ID)"
            rules={[
              { required: true, message: "수신자 주소를 입력해주세요" },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    Principal.fromText(value);
                    return Promise.resolve();
                  } catch (error) {
                    return Promise.reject(
                      "유효하지 않은 Principal ID 형식입니다"
                    );
                  }
                },
              },
            ]}
          >
            <StyledInput
              customSize="md"
              placeholder="Principal ID를 입력하세요"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="전송 금액 (raw units, 100,000,000 = 1 PGC)"
            rules={[
              { required: true, message: "전송 금액을 입력해주세요" },
              {
                type: "number",
                min: 1,
                transform: (value) => Number(value),
                message: "1 이상의 숫자를 입력해주세요",
              },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  const numValue = Number(value);
                  if (isNaN(numValue)) {
                    return Promise.reject("유효한 숫자를 입력해주세요");
                  }
                  if (numValue > 100000000000000) {
                    return Promise.reject(
                      "최대 1,000,000 PGC까지 전송 가능합니다"
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <StyledInput
              type="number"
              min={1}
              max={100000000000000}
              customSize="md"
              placeholder="전송할 토큰 수량 (raw units)"
            />
          </Form.Item>

          <div className="ant-modal-footer">
            <StyledButton
              customVariant="outline"
              customSize="md"
              customColor="secondary"
              onClick={() => setIsTransferModalVisible(false)}
            >
              취소
            </StyledButton>
            <StyledButton
              customVariant="primary"
              customSize="md"
              customColor="primary"
              htmlType="submit"
              loading={transferLoading}
            >
              전송
            </StyledButton>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TokenManagement;
