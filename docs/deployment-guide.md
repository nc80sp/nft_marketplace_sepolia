# デプロイ手順書

GitHubからcloneして、スマートコントラクトのデプロイおよびフロントエンドの公開を行う手順です。

## 前提条件

- Node.js 20 以上
- MetaMask ウォレット（Sepolia ETH を保有）
- [Alchemy](https://www.alchemy.com/) アカウント（Sepolia RPC URL 取得用）
- [Pinata](https://www.pinata.cloud/) アカウント（IPFS アップロード用）

## 1. リポジトリのクローン

```bash
git clone https://github.com/nc80sp/nft_marketplace_sepolia.git
cd nft_marketplace_sepolia
```

## 2. スマートコントラクトのデプロイ

### 2.1 依存パッケージのインストール

```bash
cd contracts
npm install
```

### 2.2 環境変数の設定

`contracts/.env` を作成し、以下を設定します。

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>
PRIVATE_KEY=<YOUR_WALLET_PRIVATE_KEY>
```

| 変数 | 説明 |
|------|------|
| `SEPOLIA_RPC_URL` | Alchemy ダッシュボードから取得した Sepolia 用 RPC URL |
| `PRIVATE_KEY` | MetaMask の秘密鍵（64文字の16進数、`0x` プレフィックスなし） |

> **注意**: 秘密鍵は絶対に公開しないでください。テスト用ウォレットの使用を推奨します。

### 2.3 コントラクトのテスト

```bash
npx hardhat test
```

13件のテストがすべてパスすることを確認してください。

### 2.4 Sepolia へデプロイ

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

デプロイが成功すると、以下のファイルが `frontend/src/constants/` に自動生成されます。

- `addresses.json` — デプロイされたコントラクトアドレス
- `NFT.json` — NFT コントラクトの ABI
- `Marketplace.json` — Marketplace コントラクトの ABI

## 3. フロントエンドのローカル起動

### 3.1 依存パッケージのインストール

```bash
cd ../frontend
npm install
```

### 3.2 環境変数の設定

`frontend/.env` を作成し、以下を設定します。

```env
VITE_PINATA_API_KEY=<YOUR_PINATA_API_KEY>
VITE_PINATA_SECRET=<YOUR_PINATA_SECRET>
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>
```

| 変数 | 説明 |
|------|------|
| `VITE_PINATA_API_KEY` | Pinata ダッシュボードの API Keys から取得 |
| `VITE_PINATA_SECRET` | Pinata ダッシュボードの API Keys から取得 |
| `VITE_SEPOLIA_RPC_URL` | Alchemy の Sepolia RPC URL（コントラクトデプロイ時と同じもの） |

### 3.3 開発サーバーの起動

```bash
npm run dev
```

ブラウザで表示された URL（通常 `http://localhost:5173`）にアクセスします。

## 4. GitHub Pages へのデプロイ

GitHub Pages を使ってフロントエンドを公開する手順です。

### 4.1 GitHub リポジトリの設定

1. リポジトリを自分の GitHub アカウントに fork、または新規リポジトリとして push する
2. `vite.config.js` の `base` をリポジトリ名に合わせて変更する

```js
// frontend/vite.config.js
export default defineConfig({
  plugins: [react()],
  base: '/<YOUR_REPOSITORY_NAME>/',
})
```

### 4.2 GitHub Secrets の設定

リポジトリの **Settings > Secrets and variables > Actions** で以下の Repository secrets を追加します。

| Secret 名 | 値 |
|------------|-----|
| `VITE_PINATA_API_KEY` | Pinata API Key |
| `VITE_PINATA_SECRET` | Pinata Secret |
| `VITE_SEPOLIA_RPC_URL` | Alchemy Sepolia RPC URL |

### 4.3 GitHub Pages の有効化

リポジトリの **Settings > Pages** で以下を設定します。

- **Source**: `GitHub Actions` を選択

### 4.4 デプロイの実行

`main` ブランチに push すると、GitHub Actions が自動でビルド・デプロイを実行します。

```bash
git push origin main
```

手動でデプロイする場合は、リポジトリの **Actions** タブから「Deploy Frontend to GitHub Pages」ワークフローを選択し、「Run workflow」をクリックします。

### 4.5 公開 URL

デプロイ成功後、以下の URL でアクセスできます。

```
https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/
```

## プロジェクト構成

```
nft_marketplace_sepolia/
├── contracts/                 # スマートコントラクト (Hardhat)
│   ├── contracts/
│   │   ├── NFT.sol            # ERC-721 NFT コントラクト
│   │   └── Marketplace.sol    # マーケットプレイス コントラクト
│   ├── test/                  # コントラクトテスト
│   ├── scripts/deploy.js      # デプロイスクリプト
│   └── hardhat.config.js
├── frontend/                  # フロントエンド (Vite + React)
│   ├── src/
│   │   ├── components/        # 共通コンポーネント
│   │   ├── context/           # WalletContext
│   │   ├── pages/             # 各ページ
│   │   ├── utils/             # ユーティリティ (contracts, pinata)
│   │   └── constants/         # ABI・アドレス (デプロイ時に自動生成)
│   └── vite.config.js
├── .github/workflows/         # GitHub Actions
│   └── deploy.yml
└── docs/                      # ドキュメント
```
