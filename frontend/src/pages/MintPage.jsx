import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/pinata";
import { getNFTContract } from "../utils/contracts";
import addresses from "../constants/addresses.json";
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
      const receipt = await tx.wait();

      const mintEvent = receipt.logs.find(
        (log) => log.address.toLowerCase() === addresses.nft.toLowerCase() && log.topics.length === 4
      );
      const mintedTokenId = mintEvent ? parseInt(mintEvent.topics[3], 16).toString() : null;

      if (mintedTokenId !== null && window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC721",
              options: {
                address: addresses.nft,
                tokenId: mintedTokenId,
              },
            },
          });
        } catch {}
      }

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
