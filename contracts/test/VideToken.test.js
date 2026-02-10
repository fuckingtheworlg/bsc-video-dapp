const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VideToken", function () {
  let token;
  let owner, rewardPool, marketingPool, user1, user2, user3;
  const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 10亿
  const BURN_AMOUNT = ethers.parseEther("50000");
  const HOLDING_THRESHOLD = ethers.parseEther("10000");
  const LIKE_COST = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, rewardPool, marketingPool, user1, user2, user3] = await ethers.getSigners();

    const VideToken = await ethers.getContractFactory("VideToken");
    token = await VideToken.deploy(
      "VideToken",
      "VIDE",
      rewardPool.address,
      marketingPool.address,
      owner.address
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await token.name()).to.equal("VideToken");
      expect(await token.symbol()).to.equal("VIDE");
    });

    it("should mint total supply to initial holder", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });

    it("should set correct pool addresses", async function () {
      expect(await token.rewardPool()).to.equal(rewardPool.address);
      expect(await token.marketingPool()).to.equal(marketingPool.address);
    });

    it("should whitelist owner and pools", async function () {
      expect(await token.feeWhitelist(owner.address)).to.be.true;
      expect(await token.feeWhitelist(rewardPool.address)).to.be.true;
      expect(await token.feeWhitelist(marketingPool.address)).to.be.true;
    });

    it("should record holdingSince for initial holder", async function () {
      expect(await token.holdingSince(owner.address)).to.be.gt(0);
    });
  });

  describe("Transfer Fee", function () {
    beforeEach(async function () {
      // Send tokens to user1 (owner is whitelisted, so no fee)
      await token.transfer(user1.address, ethers.parseEther("1000000"));
    });

    it("should deduct 3% fee on non-whitelisted transfers", async function () {
      const amount = ethers.parseEther("100000");
      const fee = amount * 300n / 10000n; // 3%
      const expectedTransfer = amount - fee;

      await token.connect(user1).transfer(user2.address, amount);

      expect(await token.balanceOf(user2.address)).to.equal(expectedTransfer);
    });

    it("should split fee 80/20 between reward and marketing pools", async function () {
      const amount = ethers.parseEther("100000");
      const fee = amount * 300n / 10000n;
      const rewardFee = fee * 8000n / 10000n;
      const marketingFee = fee - rewardFee;

      const rewardBefore = await token.balanceOf(rewardPool.address);
      const marketingBefore = await token.balanceOf(marketingPool.address);

      await token.connect(user1).transfer(user2.address, amount);

      expect(await token.balanceOf(rewardPool.address)).to.equal(rewardBefore + rewardFee);
      expect(await token.balanceOf(marketingPool.address)).to.equal(marketingBefore + marketingFee);
    });

    it("should not charge fee for whitelisted addresses", async function () {
      const amount = ethers.parseEther("100000");
      // owner is whitelisted
      await token.transfer(user2.address, amount);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });
  });

  describe("Burn For Upload", function () {
    beforeEach(async function () {
      await token.transfer(user1.address, ethers.parseEther("200000"));
    });

    it("should burn tokens and grant upload permit", async function () {
      const balBefore = await token.balanceOf(user1.address);
      await token.connect(user1).burnForUpload();

      expect(await token.balanceOf(user1.address)).to.be.lt(balBefore);
      expect(await token.burnPermitCount(user1.address)).to.equal(1);
      expect(await token.totalBurned(user1.address)).to.equal(BURN_AMOUNT);
    });

    it("should revert if balance insufficient", async function () {
      // Give user3 enough to pass threshold but not enough for burn
      await token.transfer(user3.address, ethers.parseEther("20000")); // >= 10000 threshold, < 50000 burn
      await expect(token.connect(user3).burnForUpload())
        .to.be.revertedWith("VideToken: insufficient balance for burn");
    });

    it("should revert if below holding threshold", async function () {
      // Give user3 less than threshold
      await token.transfer(user3.address, ethers.parseEther("5000"));
      await expect(token.connect(user3).burnForUpload())
        .to.be.revertedWith("VideToken: below holding threshold");
    });

    it("should allow multiple burn permits", async function () {
      await token.connect(user1).burnForUpload();
      await token.connect(user1).burnForUpload();
      expect(await token.burnPermitCount(user1.address)).to.equal(2);
    });
  });

  describe("Holding Tracking & Diamond Mechanism", function () {
    beforeEach(async function () {
      await token.transfer(user1.address, ethers.parseEther("100000"));
    });

    it("should track holdingSince on first receive", async function () {
      expect(await token.holdingSince(user1.address)).to.be.gt(0);
    });

    it("should mark hasSold when user transfers out", async function () {
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.hasSold(user1.address)).to.be.true;
    });

    it("should set cooldown on sell", async function () {
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.isInCooldown(user1.address)).to.be.true;
    });

    it("should return 0 tier ratio during cooldown", async function () {
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.getTierRatio(user1.address)).to.equal(0);
    });

    it("should return 80% max tier ratio after cooldown for sellers", async function () {
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      // Advance past cooldown (30 minutes)
      await time.increase(31 * 60);
      expect(await token.getTierRatio(user1.address)).to.equal(80);
    });

    it("should return 100% tier ratio for diamond user (never sold, held 4h+)", async function () {
      // Advance 4 hours
      await time.increase(4 * 3600 + 1);
      expect(await token.isDiamond(user1.address)).to.be.true;
      expect(await token.getTierRatio(user1.address)).to.equal(100);
    });

    it("should not be diamond if has sold", async function () {
      await time.increase(4 * 3600 + 1);
      // Now sell some
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.isDiamond(user1.address)).to.be.false;
    });

    it("should identify long holders (2h+)", async function () {
      expect(await token.isLongHolder(user1.address)).to.be.false;
      await time.increase(2 * 3600 + 1);
      expect(await token.isLongHolder(user1.address)).to.be.true;
    });
  });

  describe("Holding Bonus", function () {
    beforeEach(async function () {
      // Set timestamp to just after a UTC 16:00 reset to avoid reset interference
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const dayStart = Math.floor(now / 86400) * 86400;
      const nextReset = dayStart + 16 * 3600;
      // Move to 1 second after next reset
      const targetTime = now < nextReset ? nextReset + 1 : nextReset + 86400 + 1;
      await time.increaseTo(targetTime);

      await token.transfer(user1.address, ethers.parseEther("100000"));
    });

    it("should return 0 bonus before 5 minutes", async function () {
      expect(await token.getHoldingBonus(user1.address)).to.equal(0);
    });

    it("should return 10% bonus after 5 minutes", async function () {
      await time.increase(5 * 60 + 1);
      expect(await token.getHoldingBonus(user1.address)).to.equal(10);
    });

    it("should return 15% bonus after 1h5m", async function () {
      await time.increase(65 * 60 + 1);
      expect(await token.getHoldingBonus(user1.address)).to.equal(15);
    });

    it("should cap at 40% (10% initial + 30% max hourly)", async function () {
      await time.increase(7 * 3600); // 7 hours
      expect(await token.getHoldingBonus(user1.address)).to.equal(40);
    });

    it("should return 0 during cooldown", async function () {
      await time.increase(2 * 3600);
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.getHoldingBonus(user1.address)).to.equal(0);
    });
  });

  describe("Blacklist", function () {
    it("should allow owner to blacklist", async function () {
      await token.setBlacklist(user1.address, true);
      expect(await token.blacklisted(user1.address)).to.be.true;
    });

    it("should block transfers from blacklisted", async function () {
      await token.transfer(user1.address, ethers.parseEther("100000"));
      await token.setBlacklist(user1.address, true);
      await expect(token.connect(user1).transfer(user2.address, ethers.parseEther("1000")))
        .to.be.revertedWith("VideToken: sender blacklisted");
    });

    it("should block transfers to blacklisted", async function () {
      await token.setBlacklist(user2.address, true);
      await expect(token.transfer(user2.address, ethers.parseEther("1000")))
        .to.be.revertedWith("VideToken: recipient blacklisted");
    });

    it("should allow owner to remove from blacklist", async function () {
      await token.setBlacklist(user1.address, true);
      await token.setBlacklist(user1.address, false);
      expect(await token.blacklisted(user1.address)).to.be.false;
    });

    it("should block burnForUpload for blacklisted", async function () {
      await token.transfer(user1.address, ethers.parseEther("200000"));
      await token.setBlacklist(user1.address, true);
      await expect(token.connect(user1).burnForUpload())
        .to.be.revertedWith("VideToken: account is blacklisted");
    });
  });

  describe("Pause", function () {
    it("should block transfers when paused", async function () {
      await token.pause();
      await expect(token.transfer(user1.address, ethers.parseEther("1000")))
        .to.be.reverted;
    });

    it("should allow transfers after unpause", async function () {
      await token.pause();
      await token.unpause();
      await expect(token.transfer(user1.address, ethers.parseEther("1000")))
        .to.not.be.reverted;
    });
  });

  describe("Admin Functions", function () {
    it("should update burn amount within range", async function () {
      await token.setBurnAmount(ethers.parseEther("20000"));
      expect(await token.burnAmount()).to.equal(ethers.parseEther("20000"));
    });

    it("should revert burn amount out of range", async function () {
      await expect(token.setBurnAmount(ethers.parseEther("5000")))
        .to.be.revertedWith("VideToken: burn amount out of range");
      await expect(token.setBurnAmount(ethers.parseEther("300000")))
        .to.be.revertedWith("VideToken: burn amount out of range");
    });

    it("should update holding threshold within range", async function () {
      await token.setHoldingThreshold(ethers.parseEther("20000"));
      expect(await token.holdingThreshold()).to.equal(ethers.parseEther("20000"));
    });

    it("should update like cost within range", async function () {
      await token.setLikeCost(ethers.parseEther("50"));
      expect(await token.likeCost()).to.equal(ethers.parseEther("50"));
    });

    it("should only allow owner to call admin functions", async function () {
      await expect(token.connect(user1).setBurnAmount(ethers.parseEther("20000")))
        .to.be.reverted;
    });
  });

  describe("canParticipate", function () {
    it("should return false if below threshold", async function () {
      expect(await token.canParticipate(user1.address)).to.be.false;
    });

    it("should return true if meets threshold", async function () {
      await token.transfer(user1.address, ethers.parseEther("20000"));
      expect(await token.canParticipate(user1.address)).to.be.true;
    });

    it("should return false if blacklisted", async function () {
      await token.transfer(user1.address, ethers.parseEther("20000"));
      await token.setBlacklist(user1.address, true);
      expect(await token.canParticipate(user1.address)).to.be.false;
    });

    it("should return false during cooldown", async function () {
      await token.transfer(user1.address, ethers.parseEther("100000"));
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.canParticipate(user1.address)).to.be.false;
    });
  });
});
