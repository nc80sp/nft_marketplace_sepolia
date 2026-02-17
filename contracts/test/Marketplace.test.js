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
    await nft.connect(seller).mint(TOKEN_URI);
    await nft.connect(seller).approve(await marketplace.getAddress(), 0);
  });

  describe("listItem", function () {
    it("should list an NFT", async function () {
      await expect(marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE))
        .to.emit(marketplace, "ItemListed").withArgs(seller.address, await nft.getAddress(), 0, PRICE);
      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(PRICE);
      expect(listing.seller).to.equal(seller.address);
    });
    it("should revert if price is zero", async function () {
      await expect(marketplace.connect(seller).listItem(await nft.getAddress(), 0, 0)).to.be.revertedWith("Price must be greater than zero");
    });
    it("should revert if not owner of NFT", async function () {
      await expect(marketplace.connect(buyer).listItem(await nft.getAddress(), 0, PRICE)).to.be.revertedWith("Not the owner");
    });
    it("should revert if already listed", async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE);
      await expect(marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE)).to.be.revertedWith("Already listed");
    });
  });

  describe("buyItem", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE);
    });
    it("should transfer NFT and payment on purchase", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      await expect(marketplace.connect(buyer).buyItem(await nft.getAddress(), 0, { value: PRICE }))
        .to.emit(marketplace, "ItemBought").withArgs(buyer.address, await nft.getAddress(), 0, PRICE);
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(PRICE);
      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(0);
    });
    it("should revert if not enough ETH sent", async function () {
      await expect(marketplace.connect(buyer).buyItem(await nft.getAddress(), 0, { value: ethers.parseEther("0.5") })).to.be.revertedWith("Insufficient payment");
    });
    it("should revert if item not listed", async function () {
      await expect(marketplace.connect(buyer).buyItem(await nft.getAddress(), 1, { value: PRICE })).to.be.revertedWith("Not listed");
    });
  });

  describe("cancelListing", function () {
    beforeEach(async function () {
      await marketplace.connect(seller).listItem(await nft.getAddress(), 0, PRICE);
    });
    it("should cancel a listing", async function () {
      await expect(marketplace.connect(seller).cancelListing(await nft.getAddress(), 0))
        .to.emit(marketplace, "ItemCanceled").withArgs(seller.address, await nft.getAddress(), 0);
      const listing = await marketplace.getListing(await nft.getAddress(), 0);
      expect(listing.price).to.equal(0);
    });
    it("should revert if not the seller", async function () {
      await expect(marketplace.connect(buyer).cancelListing(await nft.getAddress(), 0)).to.be.revertedWith("Not the seller");
    });
    it("should revert if not listed", async function () {
      await expect(marketplace.connect(seller).cancelListing(await nft.getAddress(), 1)).to.be.revertedWith("Not listed");
    });
  });
});
