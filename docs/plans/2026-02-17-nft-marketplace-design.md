# NFT Marketplace Design

## Overview

Ethereum Sepolia テストネット上で動作するNFTマーケットプレイス。NFTのミント・出品・購入・キャンセルの基本機能を提供する。

## Tech Stack

- **スマートコントラクト**: Solidity 0.8.20+ / Hardhat / OpenZeppelin
- **フロントエンド**: Vite + React + ethers.js
- **ストレージ**: IPFS (Pinata)
- **ネットワーク**: Ethereum Sepolia テストネット

## Smart Contracts

### NFT Contract (ERC-721)

- OpenZeppelin `ERC721URIStorage` を継承
- 誰でもNFTをミントできる（tokenURIを指定）
- tokenIdは自動インクリメント

### Marketplace Contract

- `listItem(nftAddress, tokenId, price)` — NFTを出品（ETH建て）
- `buyItem(nftAddress, tokenId)` — ETHを送ってNFTを購入
- `cancelListing(nftAddress, tokenId)` — 出品キャンセル
- 出品時にNFTの `approve` をマーケットプレイスコントラクトに付与する方式
- 出品手数料なし
- 売買成立時、ETHは直接セラーに送金
- イベント: `ItemListed`, `ItemBought`, `ItemCanceled`

## Frontend

### Pages

| Path | Description |
|------|-------------|
| `/` | 出品中のNFT一覧（カード形式） |
| `/nft/:address/:tokenId` | NFT詳細・購入 |
| `/mint` | 画像アップロード + メタデータ入力でNFTミント |
| `/my-nfts` | 自分のNFT一覧・出品・キャンセル操作 |

### Components

- `ConnectWallet` — MetaMask接続ボタン（ヘッダー）
- `NFTCard` — サムネイル・名前・価格表示カード
- `ListingForm` — 出品価格入力フォーム

### Tech Choices

- ルーティング: React Router v6
- スタイリング: CSS Modules
- 状態管理: useState / useContext（ウォレット接続状態をContextで管理）

## Data Flow

### NFT Mint Flow

1. ユーザーが画像 + 名前・説明を入力
2. 画像を Pinata API で IPFS にアップロード
3. メタデータ JSON (name, description, image) を Pinata で IPFS にアップロード
4. 返却された `ipfs://` URI で NFT コントラクトの `mint` を呼び出し

### Listing / Purchase Flow

1. **出品**: `approve` → `listItem` 呼び出し
2. **購入**: `buyItem` を ETH 付きで呼び出し → NFT転送 + ETH送金
3. **キャンセル**: `cancelListing` 呼び出し

### Event-based Querying

- コントラクトイベントを ethers.js でクエリして一覧取得

## Project Structure

```
superpowerstest/
├── contracts/
│   ├── contracts/
│   │   ├── NFT.sol
│   │   └── Marketplace.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── Marketplace.test.js
│   ├── hardhat.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── constants/       # ABI + contract addresses
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── docs/
│   └── plans/
└── README.md
```

## Environment Variables

- `contracts/.env` — `SEPOLIA_RPC_URL`, `PRIVATE_KEY`
- `frontend/.env` — `VITE_PINATA_API_KEY`, `VITE_PINATA_SECRET`, `VITE_SEPOLIA_RPC_URL`

## Testing

- Hardhat ローカルネットワークでユニットテスト
- Chai + ethers.js でアサーション

## Deployment

- Hardhat スクリプトで Sepolia にデプロイ
- デプロイ後、ABI とアドレスを `frontend/src/constants/` にコピー
