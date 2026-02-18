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
