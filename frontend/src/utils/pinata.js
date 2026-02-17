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
