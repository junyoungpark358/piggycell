import { useState, useEffect } from "react";
import { piggycell_backend } from "../../declarations/piggycell_backend";
import "./App.css";

function App(): JSX.Element {
  const [nftId, setNftId] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<bigint>(BigInt(0));
  const [nftOwner, setNftOwner] = useState<string>("");

  useEffect(() => {
    // NFT 총 발행량 조회
    piggycell_backend.icrc7_supply().then((supply) => {
      setTotalSupply(supply);
    });
  }, []);

  const handleSearch = async () => {
    if (!nftId) return;

    try {
      const owner = await piggycell_backend.icrc7_owner_of(BigInt(nftId));
      setNftOwner(owner ? JSON.stringify(owner) : "소유자 없음");
    } catch (error) {
      setNftOwner("조회 실패");
    }
  };

  return (
    <main>
      <h1>PiggyCell NFT</h1>
      <div className="card">
        <p>총 발행량: {totalSupply.toString()}</p>
        <div>
          <input
            type="text"
            value={nftId}
            onChange={(e) => setNftId(e.target.value)}
            placeholder="NFT ID를 입력하세요"
          />
          <button onClick={handleSearch}>조회</button>
        </div>
        {nftOwner && <p>소유자: {nftOwner}</p>}
      </div>
    </main>
  );
}

export default App;
