import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import MintPage from "./pages/MintPage";
import MyNFTs from "./pages/MyNFTs";
import NFTDetail from "./pages/NFTDetail";

export default function App() {
  return (
    <div>
      <Header />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mint" element={<MintPage />} />
          <Route path="/my-nfts" element={<MyNFTs />} />
          <Route path="/nft/:address/:tokenId" element={<NFTDetail />} />
        </Routes>
      </main>
    </div>
  );
}
