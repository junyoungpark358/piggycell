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
  WalletOutlined,
} from "@ant-design/icons";
import { StyledButton } from "../../components/common/StyledButton";
import { StyledInput } from "../../components/common/StyledInput";
import { StyledTable } from "../../components/common/StyledTable";
import { StatCard } from "../../components/StatCard";
import { piggycell_backend } from "../../../../declarations/piggycell_backend";
import { AuthManager } from "../../utils/auth";
import "./NFTManagement.css"; // NFT 관리 페이지의 CSS를 재사용
import { FilterValue, SorterResult } from "antd/es/table/interface";

const { Title } = Typography;
const { Search } = Input;

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
    averageBalance: 0,
    totalTransactions: 0,
  });
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  // 페이지네이션 상태 추가
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 가상의 데이터 생성 함수
  const generateMockData = () => {
    // 가상의 토큰 소유자 데이터
    const mockOwners: TokenOwner[] = [
      {
        key: "7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe",
        address:
          "7w7wy-vsfhb-af2eo-h7in2-rtrji-k4lpn-day6t-jnjdc-oimk2-4fnhy-xqe",
        balance: 100,
      },
      {
        key: "cd5wa-o3kaa-caaaa-qaaka-cai",
        address: "cd5wa-o3kaa-caaaa-qaaka-cai",
        balance: 250,
      },
      {
        key: "example-principal-3",
        address: "example-principal-3",
        balance: 75,
      },
    ];

    setTokenOwners(mockOwners);
    setTokenStats({
      totalSupply: 425,
      totalHolders: mockOwners.length,
      averageBalance: 425 / mockOwners.length,
      totalTransactions: 12,
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

      // 실제 환경에서는 백엔드에서 데이터를 가져오는 코드로 대체
      // 현재는 mock 데이터로 대체
      generateMockData();

      // 백엔드 API를 활용한 실제 구현 예시
      /*
      const totalSupply = Number(await piggycell_backend.icrc1_total_supply());
      
      // 관리자 계정 포함
      const authManager = AuthManager.getInstance();
      const principal = await authManager.getPrincipal();
      const ownersData: TokenOwner[] = [];
      
      if (principal) {
        const adminBalance = Number(
          await piggycell_backend.icrc1_balance_of({
            owner: principal,
            subaccount: [],
          })
        );
        ownersData.push({
          key: principal.toString(),
          address: principal.toString(),
          balance: adminBalance,
        });
      }
      
      // 토큰 소유자 목록과 잔액 가져오기 (실제 구현 필요)
      
      setTokenOwners(ownersData);
      setTokenStats({
        totalSupply,
        totalHolders: ownersData.length,
        averageBalance: ownersData.length > 0 ? totalSupply / ownersData.length : 0,
        totalTransactions: 0, // 이 값은 백엔드에서 가져와야 함
      });
      
      // 페이지네이션 총 개수 설정
      setPagination(prev => ({
        ...prev,
        total: ownersData.length
      }));
      */
    } catch (error) {
      console.error("토큰 통계 데이터를 가져오는 중 오류 발생:", error);
      message.error("토큰 통계 데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStats();
  }, []);

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

      const authManager = AuthManager.getInstance();
      const principal = await authManager.getPrincipal();

      if (!principal) {
        message.error("관리자 인증에 실패했습니다.");
        setTransferLoading(false);
        return;
      }

      // 토큰 전송 실행 (실제 환경에서 사용)
      /*
      const result = await piggycell_backend.mint_tokens(
        {
          owner: recipientPrincipal,
          subaccount: [],
        },
        BigInt(amount)
      );
      
      if ('ok' in result) {
        message.success(`${amount} PGC 토큰이 성공적으로 전송되었습니다.`);
        setIsTransferModalVisible(false);
        form.resetFields();
        fetchTokenStats(); // 데이터 새로고침
      } else {
        message.error(`토큰 전송 실패: ${result.err}`);
      }
      */

      // 테스트용 임시 처리
      setTimeout(() => {
        message.success(`${amount} PGC 토큰이 성공적으로 전송되었습니다.`);
        setIsTransferModalVisible(false);
        form.resetFields();

        // 목데이터 업데이트
        const newOwners = [...tokenOwners];
        const existingOwnerIndex = newOwners.findIndex(
          (owner) => owner.address === recipient
        );

        if (existingOwnerIndex >= 0) {
          newOwners[existingOwnerIndex].balance += Number(amount);
        } else {
          newOwners.push({
            key: recipient,
            address: recipient,
            balance: Number(amount),
          });
        }

        setTokenOwners(newOwners);
        setTokenStats({
          ...tokenStats,
          totalSupply: tokenStats.totalSupply + Number(amount),
          totalHolders: newOwners.length,
          averageBalance:
            (tokenStats.totalSupply + Number(amount)) / newOwners.length,
        });

        // 페이지네이션 총 개수 업데이트
        setPagination((prev) => ({
          ...prev,
          total: newOwners.length,
        }));
      }, 1000);
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
      width: "60%",
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
      width: "25%",
      render: (balance: number) => (
        <span style={{ color: "#1890ff" }}>{`${balance} PGC`}</span>
      ),
      sorter: (a: TokenOwner, b: TokenOwner) => a.balance - b.balance,
    },
    {
      title: "작업",
      key: "action",
      width: "15%",
      align: "center" as const,
      render: () => (
        <Space size="middle">
          <StyledButton
            customVariant="ghost"
            customSize="sm"
            onClick={() => message.info("편집 기능은 추후 구현 예정입니다.")}
            icon={<EditOutlined />}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="nft-management">
      <div className="page-header">
        <h1>토큰 관리</h1>
        <StyledButton
          customVariant="primary"
          customSize="md"
          onClick={handleRefresh}
          icon={<ReloadOutlined />}
        >
          새로 고침
        </StyledButton>
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 PGC"
            value={tokenStats.totalSupply}
            prefix={<DollarOutlined />}
            suffix="개"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 보유자"
            value={tokenStats.totalHolders}
            prefix={<UserOutlined />}
            suffix="명"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="평균 보유량"
            value={parseFloat(tokenStats.averageBalance.toFixed(1))}
            prefix={<WalletOutlined />}
            suffix="PGC"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6} md={6}>
          <StatCard
            title="총 거래량"
            value={tokenStats.totalTransactions}
            prefix={<DollarOutlined />}
            suffix="PGC"
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
        scroll={{ x: true }}
      />

      {/* 토큰 전송 모달 */}
      <Modal
        title="PGC 토큰 전송"
        open={isTransferModalVisible}
        onCancel={() => setIsTransferModalVisible(false)}
        footer={null}
        className="admin-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleTransferToken}>
          <Form.Item
            name="recipient"
            label="수신자 주소 (Principal ID)"
            rules={[{ required: true, message: "수신자 주소를 입력해주세요" }]}
          >
            <StyledInput
              customSize="md"
              placeholder="Principal ID를 입력하세요"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="전송 금액 (PGC)"
            rules={[
              { required: true, message: "전송 금액을 입력해주세요" },
              {
                type: "number",
                min: 1,
                transform: (value) => Number(value),
                message: "1 이상의 숫자를 입력해주세요",
              },
            ]}
          >
            <StyledInput
              type="number"
              min={1}
              customSize="md"
              placeholder="전송할 토큰 수량"
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
