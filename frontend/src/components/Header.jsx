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
