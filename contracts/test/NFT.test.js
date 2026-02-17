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
