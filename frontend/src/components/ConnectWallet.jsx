import { useWallet } from "../context/WalletContext";
import styles from "./ConnectWallet.module.css";

export default function ConnectWallet() {
  const { account, balance, connectWallet, disconnectWallet } = useWallet();

  if (account) {
    return (
      <div className={styles.wallet}>
        <div className={styles.info}>
          <span className={styles.address}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          {balance !== null && (
            <span className={styles.balance}>
              {parseFloat(balance).toFixed(4)} ETH
            </span>
          )}
        </div>
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
