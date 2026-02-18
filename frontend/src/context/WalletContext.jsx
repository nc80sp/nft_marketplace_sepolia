import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState(null);

  const fetchBalance = useCallback(async (browserProvider, address) => {
    try {
      const bal = await browserProvider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } catch {
      setBalance(null);
    }
  }, []);

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
    await fetchBalance(browserProvider, accounts[0]);
  }, [fetchBalance]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setBalance(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, provider, signer, balance, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
