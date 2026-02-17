# NFT Marketplace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ethereum Sepolia テストネット上で動作するNFTマーケットプレイスを構築する（ミント・出品・購入・キャンセル機能）

**Architecture:** モノリポ構成で `contracts/`（Hardhat + Solidity）と `frontend/`（Vite + React + ethers.js）を分離。コントラクトイベントベースでフロントエンドがデータを取得。NFTメタデータはPinata経由でIPFSに保存。

**Tech Stack:** Solidity 0.8.20+ / Hardhat / OpenZeppelin / Vite / React / ethers.js / Pinata / CSS Modules

---

### Task 1: Hardhat プロジェクトセットアップ

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.js`
- Create: `contracts/.env.example`
- Create: `contracts/.gitignore`

**Step 1: Initialize contracts project**

```bash
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv
```

**Step 2: Create hardhat.config.js**

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
```

**Step 3: Create .env.example**

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key_here
```

**Step 4: Create .gitignore**

```
node_modules/
cache/
artifacts/
.env
```

**Step 5: Verify setup**

Run: `npx hardhat compile`
Expected: "Nothing to compile" (no contracts yet)

**Step 6: Commit**

```bash
git add contracts/
git commit -m "chore: initialize Hardhat project with dependencies"
```

---

### Task 2: NFT Contract (ERC-721)

**Files:**
- Create: `contracts/contracts/NFT.sol`
- Create: `contracts/test/NFT.test.js`

**Step 1: Write the failing test**

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT", function () {
  let nft;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy();
  });

  describe("Minting", function () {
    it("should mint an NFT with correct tokenURI", async function () {
      const tokenURI = "ipfs://QmTest123";
      const tx = await nft.connect(addr1).mint(tokenURI);
      const receipt = await tx.wait();

      expect(await nft.ownerOf(0)).to.equal(addr1.address);
      expect(await nft.tokenURI(0)).to.equal(tokenURI);
    });

    it("should increment tokenId for each mint", async function () {
      await nft.mint("ipfs://QmFirst");
      await nft.mint("ipfs://QmSecond");

      expect(await nft.tokenURI(0)).to.equal("ipfs://QmFirst");
      expect(await nft.tokenURI(1)).to.equal("ipfs://QmSecond");
    });

    it("should return the correct token counter", async function () {
      expect(await nft.getTokenCounter()).to.equal(0);
      await nft.mint("ipfs://QmTest");
      expect(await nft.getTokenCounter()).to.equal(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd contracts && npx hardhat test test/NFT.test.js`
Expected: FAIL with compilation error (contract doesn't exist)

**Step 3: Write minimal implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    uint256 private _tokenCounter;

    constructor() ERC721("Marketplace NFT", "MNFT") {
        _tokenCounter = 0;
    }

    function mint(string memory tokenURI) external returns (uint256) {
        uint256 tokenId = _tokenCounter;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _tokenCounter++;
        return tokenId;
    }

    function getTokenCounter() external view returns (uint256) {
        return _tokenCounter;
    }
}
```

**Step 4: Run test to verify it passes**

Run: `cd contracts && npx hardhat test test/NFT.test.js`
Expected: 3 passing

**Step 5: Commit**

```bash
git add contracts/contracts/NFT.sol contracts/test/NFT.test.js
git commit -m "feat: add NFT contract with mint functionality"
```

---

### Task 3: Marketplace Contract - Listing

**Files:**
- Create: `contracts/contracts/Marketplace.sol`
- Create: `contracts/test/Marketplace.test.js`

**Step 1: Write the failing test for listing**

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let marketplace;
  let nft;
  let owner;
  let seller;
  let buyer;
  const TOKEN_URI = "ipfs://QmTest";
  const PRICE = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();

    // seller mints an NFT
    await nft.connect(seller).mint(TOKEN_URI);
    // seller approves marketplace
    await nft.connect(seller).approve(await marketplace.getAddress(), 0);
  });

  describe("listItem", function () {
    it("should list an NFT", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE)
      )
        .to.emit(marketplace, "ItemListed")
        .withArgs(seller.address, await nft.getAddress(), 0, PRICE);

      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(PRICE);
      expect(listing.seller).to.equal(seller.address);
    });

    it("should revert if price is zero", async function () {
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), 0, 0)
      ).to.be.revertedWith("Price must be greater than zero");
    });

    it("should revert if not owner of NFT", async function () {
      await expect(
        marketplace.connect(buyer).listItem(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Not the owner");
    });

    it("should revert if already listed", async function () {
      await marketplace
        .connect(seller)
        .listItem(await nft.getAddress(), 0, PRICE);
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Already listed");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd contracts && npx hardhat test test/Marketplace.test.js`
Expected: FAIL with compilation error

**Step 3: Write minimal implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace {
    struct Listing {
        uint256 price;
        address seller;
    }

    // nftAddress => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) private _listings;

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external {
        require(price > 0, "Price must be greater than zero");
        IERC721 nftContract = IERC721(nftAddress);
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(_listings[nftAddress][tokenId].price == 0, "Already listed");

        _listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return _listings[nftAddress][tokenId];
    }
}
```

**Step 4: Run test to verify it passes**

Run: `cd contracts && npx hardhat test test/Marketplace.test.js`
Expected: 4 passing

**Step 5: Commit**

```bash
git add contracts/contracts/Marketplace.sol contracts/test/Marketplace.test.js
git commit -m "feat: add Marketplace contract with listing functionality"
```

---

### Task 4: Marketplace Contract - Buy & Cancel

**Files:**
- Modify: `contracts/contracts/Marketplace.sol`
- Modify: `contracts/test/Marketplace.test.js`

**Step 1: Add failing tests for buyItem and cancelListing**

Append to `contracts/test/Marketplace.test.js` inside the main `describe`:

```javascript
  describe("buyItem", function () {
    beforeEach(async function () {
      await marketplace
        .connect(seller)
        .listItem(await nft.getAddress(), 0, PRICE);
    });

    it("should transfer NFT and payment on purchase", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );

      await expect(
        marketplace
          .connect(buyer)
          .buyItem(await nft.getAddress(), 0, { value: PRICE })
      )
        .to.emit(marketplace, "ItemBought")
        .withArgs(buyer.address, await nft.getAddress(), 0, PRICE);

      expect(await nft.ownerOf(0)).to.equal(buyer.address);

      const sellerBalanceAfter = await ethers.provider.getBalance(
        seller.address
      );
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(PRICE);

      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(0);
    });

    it("should revert if not enough ETH sent", async function () {
      const lowPrice = ethers.parseEther("0.5");
      await expect(
        marketplace
          .connect(buyer)
          .buyItem(await nft.getAddress(), 0, { value: lowPrice })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should revert if item not listed", async function () {
      await expect(
        marketplace
          .connect(buyer)
          .buyItem(await nft.getAddress(), 1, { value: PRICE })
      ).to.be.revertedWith("Not listed");
    });
  });

  describe("cancelListing", function () {
    beforeEach(async function () {
      await marketplace
        .connect(seller)
        .listItem(await nft.getAddress(), 0, PRICE);
    });

    it("should cancel a listing", async function () {
      await expect(
        marketplace.connect(seller).cancelListing(await nft.getAddress(), 0)
      )
        .to.emit(marketplace, "ItemCanceled")
        .withArgs(seller.address, await nft.getAddress(), 0);

      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(0);
    });

    it("should revert if not the seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(await nft.getAddress(), 0)
      ).to.be.revertedWith("Not the seller");
    });

    it("should revert if not listed", async function () {
      await expect(
        marketplace.connect(seller).cancelListing(await nft.getAddress(), 1)
      ).to.be.revertedWith("Not listed");
    });
  });
```

**Step 2: Run test to verify new tests fail**

Run: `cd contracts && npx hardhat test test/Marketplace.test.js`
Expected: 4 passing, 6 failing

**Step 3: Add buyItem and cancelListing to Marketplace.sol**

Add these functions to `contracts/contracts/Marketplace.sol`:

```solidity
    function buyItem(address nftAddress, uint256 tokenId) external payable {
        Listing memory listing = _listings[nftAddress][tokenId];
        require(listing.price > 0, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        delete _listings[nftAddress][tokenId];

        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);

        (bool success, ) = payable(listing.seller).call{value: listing.price}("");
        require(success, "Payment failed");

        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId) external {
        Listing memory listing = _listings[nftAddress][tokenId];
        require(listing.price > 0, "Not listed");
        require(listing.seller == msg.sender, "Not the seller");

        delete _listings[nftAddress][tokenId];

        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }
```

**Step 4: Run test to verify all pass**

Run: `cd contracts && npx hardhat test`
Expected: 13 passing (NFT: 3, Marketplace: 10)

**Step 5: Commit**

```bash
git add contracts/
git commit -m "feat: add buy and cancel functionality to Marketplace"
```

---

### Task 5: Deploy Script

**Files:**
- Create: `contracts/scripts/deploy.js`

**Step 1: Write deploy script**

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("NFT deployed to:", nftAddress);

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // Save addresses and ABIs for frontend
  const frontendDir = path.join(__dirname, "../../frontend/src/constants");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const addresses = { nft: nftAddress, marketplace: marketplaceAddress };
  fs.writeFileSync(
    path.join(frontendDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  const nftArtifact = await hre.artifacts.readArtifact("NFT");
  fs.writeFileSync(
    path.join(frontendDir, "NFT.json"),
    JSON.stringify({ abi: nftArtifact.abi }, null, 2)
  );

  const marketplaceArtifact = await hre.artifacts.readArtifact("Marketplace");
  fs.writeFileSync(
    path.join(frontendDir, "Marketplace.json"),
    JSON.stringify({ abi: marketplaceArtifact.abi }, null, 2)
  );

  console.log("ABIs and addresses saved to frontend/src/constants/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Step 2: Test deploy on local Hardhat network**

Run: `cd contracts && npx hardhat run scripts/deploy.js`
Expected: Addresses printed, files created in `frontend/src/constants/`

**Step 3: Commit**

```bash
git add contracts/scripts/deploy.js
git commit -m "feat: add deploy script with ABI export"
```

---

### Task 6: Frontend プロジェクトセットアップ

**Files:**
- Create: `frontend/` (via Vite scaffold)
- Modify: `frontend/package.json` (add ethers, react-router-dom)
- Create: `frontend/.env.example`

**Step 1: Scaffold Vite + React project**

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install ethers react-router-dom
```

**Step 2: Create .env.example**

```
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET=your_pinata_secret
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

**Step 3: Verify dev server starts**

Run: `cd frontend && npm run dev`
Expected: Vite dev server starts on localhost

**Step 4: Commit**

```bash
git add frontend/
git commit -m "chore: initialize Vite + React frontend"
```

---

### Task 7: Wallet Context & ConnectWallet Component

**Files:**
- Create: `frontend/src/context/WalletContext.jsx`
- Create: `frontend/src/components/ConnectWallet.jsx`
- Create: `frontend/src/components/ConnectWallet.module.css`

**Step 1: Create WalletContext**

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask をインストールしてください");
      return;
    }
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    const walletSigner = await browserProvider.getSigner();

    setProvider(browserProvider);
    setSigner(walletSigner);
    setAccount(accounts[0]);
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, provider, signer, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
```

**Step 2: Create ConnectWallet component**

```jsx
import { useWallet } from "../context/WalletContext";
import styles from "./ConnectWallet.module.css";

export default function ConnectWallet() {
  const { account, connectWallet, disconnectWallet } = useWallet();

  if (account) {
    return (
      <div className={styles.wallet}>
        <span className={styles.address}>
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <button onClick={disconnectWallet} className={styles.button}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={connectWallet} className={styles.button}>
      Connect Wallet
    </button>
  );
}
```

**Step 3: Create basic CSS Module**

```css
.wallet {
  display: flex;
  align-items: center;
  gap: 8px;
}

.address {
  font-family: monospace;
  font-size: 14px;
}

.button {
  padding: 8px 16px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a2e;
  color: #fff;
  cursor: pointer;
}

.button:hover {
  background: #16213e;
}
```

**Step 4: Commit**

```bash
git add frontend/src/context/ frontend/src/components/
git commit -m "feat: add wallet connection context and component"
```

---

### Task 8: App Layout & Routing

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/components/Header.jsx`
- Create: `frontend/src/components/Header.module.css`
- Create: `frontend/src/pages/Home.jsx`
- Create: `frontend/src/pages/MintPage.jsx`
- Create: `frontend/src/pages/MyNFTs.jsx`
- Create: `frontend/src/pages/NFTDetail.jsx`

**Step 1: Create Header component**

```jsx
import { Link } from "react-router-dom";
import ConnectWallet from "./ConnectWallet";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        NFT Marketplace
      </Link>
      <nav className={styles.nav}>
        <Link to="/">Home</Link>
        <Link to="/mint">Mint</Link>
        <Link to="/my-nfts">My NFTs</Link>
      </nav>
      <ConnectWallet />
    </header>
  );
}
```

**Step 2: Create placeholder pages**

`Home.jsx`:
```jsx
export default function Home() {
  return <h1>Marketplace</h1>;
}
```

`MintPage.jsx`:
```jsx
export default function MintPage() {
  return <h1>Mint NFT</h1>;
}
```

`MyNFTs.jsx`:
```jsx
export default function MyNFTs() {
  return <h1>My NFTs</h1>;
}
```

`NFTDetail.jsx`:
```jsx
import { useParams } from "react-router-dom";

export default function NFTDetail() {
  const { address, tokenId } = useParams();
  return <h1>NFT Detail: {address} #{tokenId}</h1>;
}
```

**Step 3: Update App.jsx with routing**

```jsx
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
```

**Step 4: Update main.jsx**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 5: Verify dev server works with routing**

Run: `cd frontend && npm run dev`
Expected: Pages render, navigation works

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add app layout, routing, and placeholder pages"
```

---

### Task 9: Pinata IPFS Upload Utility

**Files:**
- Create: `frontend/src/utils/pinata.js`

**Step 1: Create Pinata upload utility**

```javascript
const PINATA_API_URL = "https://api.pinata.cloud";

export async function uploadFileToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
      pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to IPFS");
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

export async function uploadJSONToIPFS(json) {
  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: import.meta.env.VITE_PINATA_API_KEY,
      pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET,
    },
    body: JSON.stringify(json),
  });

  if (!response.ok) {
    throw new Error("Failed to upload JSON to IPFS");
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

export function ipfsToHttp(ipfsUri) {
  if (!ipfsUri) return "";
  return ipfsUri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
}
```

**Step 2: Commit**

```bash
git add frontend/src/utils/pinata.js
git commit -m "feat: add Pinata IPFS upload utility"
```

---

### Task 10: Contract Helper Utilities

**Files:**
- Create: `frontend/src/utils/contracts.js`

**Step 1: Create contract helper**

```javascript
import { ethers } from "ethers";
import NFTArtifact from "../constants/NFT.json";
import MarketplaceArtifact from "../constants/Marketplace.json";
import addresses from "../constants/addresses.json";

export function getNFTContract(signerOrProvider) {
  return new ethers.Contract(addresses.nft, NFTArtifact.abi, signerOrProvider);
}

export function getMarketplaceContract(signerOrProvider) {
  return new ethers.Contract(
    addresses.marketplace,
    MarketplaceArtifact.abi,
    signerOrProvider
  );
}

export function getReadOnlyProvider() {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
  if (rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
  }
  return ethers.getDefaultProvider("sepolia");
}
```

**Step 2: Commit**

```bash
git add frontend/src/utils/contracts.js
git commit -m "feat: add contract helper utilities"
```

---

### Task 11: Mint Page Implementation

**Files:**
- Modify: `frontend/src/pages/MintPage.jsx`
- Create: `frontend/src/pages/MintPage.module.css`

**Step 1: Implement MintPage**

```jsx
import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/pinata";
import { getNFTContract } from "../utils/contracts";
import styles from "./MintPage.module.css";

export default function MintPage() {
  const { signer, account } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleMint(e) {
    e.preventDefault();
    if (!signer) {
      setStatus("ウォレットを接続してください");
      return;
    }
    if (!image || !name) {
      setStatus("画像と名前は必須です");
      return;
    }

    try {
      setLoading(true);
      setStatus("画像をIPFSにアップロード中...");
      const imageURI = await uploadFileToIPFS(image);

      setStatus("メタデータをIPFSにアップロード中...");
      const metadata = { name, description, image: imageURI };
      const tokenURI = await uploadJSONToIPFS(metadata);

      setStatus("NFTをミント中...");
      const nftContract = getNFTContract(signer);
      const tx = await nftContract.mint(tokenURI);
      await tx.wait();

      setStatus("ミント成功！");
      setName("");
      setDescription("");
      setImage(null);
    } catch (error) {
      console.error(error);
      setStatus("エラーが発生しました: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h1>Mint NFT</h1>
      <form onSubmit={handleMint} className={styles.form}>
        <label>
          名前 *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          説明
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          画像 *
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            required
          />
        </label>
        <button type="submit" disabled={loading || !account}>
          {loading ? "処理中..." : "Mint"}
        </button>
        {status && <p className={styles.status}>{status}</p>}
      </form>
    </div>
  );
}
```

**Step 2: Create CSS Module**

```css
.container {
  max-width: 500px;
  margin: 0 auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: bold;
}

.form input,
.form textarea {
  padding: 8px;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a2e;
  color: #fff;
}

.form textarea {
  min-height: 80px;
  resize: vertical;
}

.form button {
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: #4a90d9;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  text-align: center;
  color: #ccc;
}
```

**Step 3: Verify mint page renders**

Run: `cd frontend && npm run dev`
Expected: `/mint` page shows form

**Step 4: Commit**

```bash
git add frontend/src/pages/MintPage.jsx frontend/src/pages/MintPage.module.css
git commit -m "feat: implement NFT mint page with IPFS upload"
```

---

### Task 12: NFTCard Component

**Files:**
- Create: `frontend/src/components/NFTCard.jsx`
- Create: `frontend/src/components/NFTCard.module.css`

**Step 1: Create NFTCard component**

```jsx
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { ipfsToHttp } from "../utils/pinata";
import styles from "./NFTCard.module.css";

export default function NFTCard({ nftAddress, tokenId, price, image, name }) {
  return (
    <Link
      to={`/nft/${nftAddress}/${tokenId}`}
      className={styles.card}
    >
      <img
        src={ipfsToHttp(image)}
        alt={name || `NFT #${tokenId}`}
        className={styles.image}
      />
      <div className={styles.info}>
        <h3>{name || `NFT #${tokenId}`}</h3>
        {price && (
          <p className={styles.price}>
            {ethers.formatEther(price)} ETH
          </p>
        )}
      </div>
    </Link>
  );
}
```

**Step 2: Create CSS Module**

```css
.card {
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-4px);
}

.image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.info {
  padding: 12px;
}

.info h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.price {
  margin: 0;
  font-weight: bold;
  color: #4a90d9;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/NFTCard.jsx frontend/src/components/NFTCard.module.css
git commit -m "feat: add NFTCard component"
```

---

### Task 13: Home Page - Listed NFTs

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Create: `frontend/src/pages/Home.module.css`

**Step 1: Implement Home page with event querying**

```jsx
import { useState, useEffect } from "react";
import { getMarketplaceContract, getNFTContract, getReadOnlyProvider } from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import NFTCard from "../components/NFTCard";
import styles from "./Home.module.css";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const provider = getReadOnlyProvider();
        const marketplace = getMarketplaceContract(provider);

        const listedFilter = marketplace.filters.ItemListed();
        const boughtFilter = marketplace.filters.ItemBought();
        const canceledFilter = marketplace.filters.ItemCanceled();

        const [listedEvents, boughtEvents, canceledEvents] = await Promise.all([
          marketplace.queryFilter(listedFilter),
          marketplace.queryFilter(boughtFilter),
          marketplace.queryFilter(canceledFilter),
        ]);

        // Track active listings
        const activeListings = new Map();

        for (const event of listedEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.set(key, {
            nftAddress: event.args.nftAddress,
            tokenId: event.args.tokenId,
            price: event.args.price,
            seller: event.args.seller,
          });
        }

        for (const event of boughtEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.delete(key);
        }

        for (const event of canceledEvents) {
          const key = `${event.args.nftAddress}-${event.args.tokenId}`;
          activeListings.delete(key);
        }

        // Fetch metadata for active listings
        const listingsWithMetadata = await Promise.all(
          Array.from(activeListings.values()).map(async (listing) => {
            try {
              const nft = getNFTContract(provider);
              const tokenURI = await nft.tokenURI(listing.tokenId);
              const metadataUrl = ipfsToHttp(tokenURI);
              const res = await fetch(metadataUrl);
              const metadata = await res.json();
              return { ...listing, name: metadata.name, image: metadata.image };
            } catch {
              return { ...listing, name: null, image: null };
            }
          })
        );

        setListings(listingsWithMetadata);
      } catch (error) {
        console.error("Failed to fetch listings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Marketplace</h1>
      {listings.length === 0 ? (
        <p>出品中のNFTはありません</p>
      ) : (
        <div className={styles.grid}>
          {listings.map((item) => (
            <NFTCard
              key={`${item.nftAddress}-${item.tokenId}`}
              nftAddress={item.nftAddress}
              tokenId={item.tokenId.toString()}
              price={item.price}
              image={item.image}
              name={item.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create CSS Module**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 20px;
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx frontend/src/pages/Home.module.css
git commit -m "feat: implement home page with listed NFTs"
```

---

### Task 14: NFT Detail Page

**Files:**
- Modify: `frontend/src/pages/NFTDetail.jsx`
- Create: `frontend/src/pages/NFTDetail.module.css`

**Step 1: Implement NFTDetail page**

```jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  getMarketplaceContract,
  getNFTContract,
  getReadOnlyProvider,
} from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import styles from "./NFTDetail.module.css";

export default function NFTDetail() {
  const { address, tokenId } = useParams();
  const { signer, account } = useWallet();
  const [metadata, setMetadata] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const provider = getReadOnlyProvider();
        const nft = getNFTContract(provider);
        const marketplace = getMarketplaceContract(provider);

        const tokenURI = await nft.tokenURI(tokenId);
        const res = await fetch(ipfsToHttp(tokenURI));
        const meta = await res.json();
        setMetadata(meta);

        const listingData = await marketplace.getListing(address, tokenId);
        if (listingData.price > 0n) {
          setListing({
            price: listingData.price,
            seller: listingData.seller,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [address, tokenId]);

  async function handleBuy() {
    if (!signer) {
      setTxStatus("ウォレットを接続してください");
      return;
    }
    try {
      setTxStatus("購入処理中...");
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.buyItem(address, tokenId, {
        value: listing.price,
      });
      await tx.wait();
      setTxStatus("購入成功！");
      setListing(null);
    } catch (error) {
      console.error(error);
      setTxStatus("エラー: " + error.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!metadata) return <p>NFTが見つかりません</p>;

  return (
    <div className={styles.container}>
      <img
        src={ipfsToHttp(metadata.image)}
        alt={metadata.name}
        className={styles.image}
      />
      <div className={styles.details}>
        <h1>{metadata.name}</h1>
        <p>{metadata.description}</p>
        {listing ? (
          <div>
            <p className={styles.price}>
              {ethers.formatEther(listing.price)} ETH
            </p>
            <p className={styles.seller}>
              Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </p>
            {account &&
            account.toLowerCase() !== listing.seller.toLowerCase() ? (
              <button onClick={handleBuy} className={styles.buyButton}>
                購入する
              </button>
            ) : null}
          </div>
        ) : (
          <p>現在出品されていません</p>
        )}
        {txStatus && <p>{txStatus}</p>}
      </div>
    </div>
  );
}
```

**Step 2: Create CSS Module**

```css
.container {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
}

.image {
  max-width: 400px;
  width: 100%;
  border-radius: 8px;
}

.details {
  flex: 1;
  min-width: 280px;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #4a90d9;
}

.seller {
  font-family: monospace;
  color: #999;
}

.buyButton {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  background: #4a90d9;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

.buyButton:hover {
  background: #357abd;
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/NFTDetail.jsx frontend/src/pages/NFTDetail.module.css
git commit -m "feat: implement NFT detail page with buy functionality"
```

---

### Task 15: My NFTs Page

**Files:**
- Modify: `frontend/src/pages/MyNFTs.jsx`
- Create: `frontend/src/pages/MyNFTs.module.css`
- Create: `frontend/src/components/ListingForm.jsx`
- Create: `frontend/src/components/ListingForm.module.css`

**Step 1: Create ListingForm component**

```jsx
import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getNFTContract, getMarketplaceContract } from "../utils/contracts";
import addresses from "../constants/addresses.json";
import styles from "./ListingForm.module.css";

export default function ListingForm({ tokenId, onListed }) {
  const { signer } = useWallet();
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) return;

    try {
      setLoading(true);
      const nft = getNFTContract(signer);
      const marketplace = getMarketplaceContract(signer);

      // Approve marketplace
      const approveTx = await nft.approve(addresses.marketplace, tokenId);
      await approveTx.wait();

      // List item
      const priceWei = ethers.parseEther(price);
      const listTx = await marketplace.listItem(addresses.nft, tokenId, priceWei);
      await listTx.wait();

      setPrice("");
      if (onListed) onListed();
    } catch (error) {
      console.error(error);
      alert("出品に失敗しました: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="number"
        step="0.001"
        min="0"
        placeholder="Price (ETH)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "処理中..." : "出品"}
      </button>
    </form>
  );
}
```

**Step 2: Create ListingForm CSS Module**

```css
.form {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.form input {
  padding: 6px 8px;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a2e;
  color: #fff;
  width: 120px;
}

.form button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #4a90d9;
  color: #fff;
  cursor: pointer;
}

.form button:disabled {
  opacity: 0.5;
}
```

**Step 3: Implement MyNFTs page**

```jsx
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import {
  getNFTContract,
  getMarketplaceContract,
  getReadOnlyProvider,
} from "../utils/contracts";
import { ipfsToHttp } from "../utils/pinata";
import addresses from "../constants/addresses.json";
import ListingForm from "../components/ListingForm";
import styles from "./MyNFTs.module.css";

export default function MyNFTs() {
  const { account, signer } = useWallet();
  const [myNFTs, setMyNFTs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyNFTs = useCallback(async () => {
    if (!account) {
      setMyNFTs([]);
      setLoading(false);
      return;
    }

    try {
      const provider = getReadOnlyProvider();
      const nft = getNFTContract(provider);
      const marketplace = getMarketplaceContract(provider);
      const tokenCount = await nft.getTokenCounter();

      const nfts = [];
      for (let i = 0; i < tokenCount; i++) {
        try {
          const owner = await nft.ownerOf(i);
          if (owner.toLowerCase() !== account.toLowerCase()) continue;

          const tokenURI = await nft.tokenURI(i);
          let metadata = { name: `NFT #${i}`, image: null };
          try {
            const res = await fetch(ipfsToHttp(tokenURI));
            metadata = await res.json();
          } catch {}

          const listing = await marketplace.getListing(addresses.nft, i);
          const isListed = listing.price > 0n;

          nfts.push({
            tokenId: i,
            name: metadata.name,
            image: metadata.image,
            isListed,
            price: isListed ? listing.price : null,
          });
        } catch {}
      }

      setMyNFTs(nfts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchMyNFTs();
  }, [fetchMyNFTs]);

  async function handleCancel(tokenId) {
    if (!signer) return;
    try {
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.cancelListing(addresses.nft, tokenId);
      await tx.wait();
      fetchMyNFTs();
    } catch (error) {
      console.error(error);
      alert("キャンセルに失敗しました: " + error.message);
    }
  }

  if (!account) return <p>ウォレットを接続してください</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>My NFTs</h1>
      {myNFTs.length === 0 ? (
        <p>NFTを所有していません</p>
      ) : (
        <div className={styles.grid}>
          {myNFTs.map((nft) => (
            <div key={nft.tokenId} className={styles.card}>
              {nft.image && (
                <img
                  src={ipfsToHttp(nft.image)}
                  alt={nft.name}
                  className={styles.image}
                />
              )}
              <div className={styles.info}>
                <h3>{nft.name}</h3>
                {nft.isListed ? (
                  <div>
                    <p>出品中</p>
                    <button onClick={() => handleCancel(nft.tokenId)}>
                      出品キャンセル
                    </button>
                  </div>
                ) : (
                  <ListingForm
                    tokenId={nft.tokenId}
                    onListed={fetchMyNFTs}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Create MyNFTs CSS Module**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.card {
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}

.image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.info {
  padding: 12px;
}

.info h3 {
  margin: 0 0 8px;
}

.info button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #e74c3c;
  color: #fff;
  cursor: pointer;
}
```

**Step 5: Commit**

```bash
git add frontend/src/pages/MyNFTs.jsx frontend/src/pages/MyNFTs.module.css frontend/src/components/ListingForm.jsx frontend/src/components/ListingForm.module.css
git commit -m "feat: implement My NFTs page with listing and cancel"
```

---

### Task 16: Header CSS & Global Styles

**Files:**
- Create: `frontend/src/components/Header.module.css`
- Modify: `frontend/src/index.css`

**Step 1: Create Header CSS Module**

```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #333;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  text-decoration: none;
  color: #fff;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a {
  text-decoration: none;
  color: #ccc;
}

.nav a:hover {
  color: #fff;
}
```

**Step 2: Update global styles (index.css)**

```css
:root {
  font-family: Inter, system-ui, sans-serif;
  color: #e0e0e0;
  background-color: #0f0f23;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
}

a {
  color: #4a90d9;
}
```

**Step 3: Verify full app renders correctly**

Run: `cd frontend && npm run dev`
Expected: All pages render with consistent dark theme styling

**Step 4: Commit**

```bash
git add frontend/src/components/Header.module.css frontend/src/index.css
git commit -m "feat: add header styles and global dark theme"
```

---

### Task 17: Deploy to Sepolia & Integration Test

**Step 1: Deploy contracts to Sepolia**

Set up `contracts/.env` with real `SEPOLIA_RPC_URL` and `PRIVATE_KEY`, then:

```bash
cd contracts && npx hardhat run scripts/deploy.js --network sepolia
```

Expected: Contract addresses printed, ABIs saved to `frontend/src/constants/`

**Step 2: Set up frontend .env**

Create `frontend/.env` with real Pinata API keys and Sepolia RPC URL.

**Step 3: Manual integration test**

1. Start dev server: `cd frontend && npm run dev`
2. Connect MetaMask (Sepolia network)
3. Mint an NFT on `/mint`
4. View it on `/my-nfts`
5. List it for sale
6. View it on home page `/`
7. View detail page
8. (Optional) Purchase with different account

**Step 4: Final commit**

```bash
git add frontend/src/constants/
git commit -m "feat: deploy contracts to Sepolia and add ABIs"
```
