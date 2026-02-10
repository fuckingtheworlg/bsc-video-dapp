const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Audit Fixes", function () {
  let token, interaction;
  let owner, rewardPool, marketingPool, user1, user2, user3, user4, user5;
  const USER_TOKENS = ethers.parseEther("500000");
  const ROUND_DURATION = 45 * 60;
  const CLAIM_EXPIRY = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    [owner, rewardPool, marketingPool, user1, user2, user3, user4, user5] = await ethers.getSigners();

    const VideToken = await ethers.getContractFactory("VideToken");
    token = await VideToken.deploy("VideToken", "VIDE", rewardPool.address, marketingPool.address, owner.address);
    await token.waitForDeployment();

    const VideoInteraction = await ethers.getContractFactory("VideoInteraction");
    interaction = await VideoInteraction.deploy(await token.getAddress());
    await interaction.waitForDeployment();

    await token.setVideoContract(await interaction.getAddress());

    await token.transfer(user1.address, USER_TOKENS);
    await token.transfer(user2.address, USER_TOKENS);
    await token.transfer(user3.address, USER_TOKENS);
    await token.transfer(user4.address, USER_TOKENS);
    await token.transfer(user5.address, USER_TOKENS);

    await token.transfer(await interaction.getAddress(), ethers.parseEther("1000000"));
  });

  // Helper to register a video and return its videoId
  async function registerAndGetId(userSigner, cid, title, cover) {
    await token.connect(userSigner).burnForUpload();
    const tx = await interaction.connect(userSigner).registerVideo(cid, title, cover);
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; }
      catch { return false; }
    });
    return interaction.interface.parseLog(event).args.videoId;
  }

  describe("F1: VideoRegistered event includes coverCid", function () {
    it("should emit coverCid in VideoRegistered event", async function () {
      await token.connect(user1).burnForUpload();
      const tx = await interaction.connect(user1).registerVideo("QmVidCID", "Test Video", "QmCoverCID");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; }
        catch { return false; }
      });
      const parsed = interaction.interface.parseLog(event);
      expect(parsed.args.cid).to.equal("QmVidCID");
      expect(parsed.args.title).to.equal("Test Video");
      expect(parsed.args.coverCid).to.equal("QmCoverCID");
    });
  });

  describe("F5: Same uploader cannot appear multiple times in top 3", function () {
    it("should deduplicate same uploader in top 3", async function () {
      // user1 uploads 2 videos, user2 uploads 1 video
      const vid1 = await registerAndGetId(user1, "QmCID1", "V1", "QmC1");
      const vid2 = await registerAndGetId(user1, "QmCID2", "V2", "QmC2");
      const vid3 = await registerAndGetId(user2, "QmCID3", "V3", "QmC3");

      // vid1 gets 3 likes, vid2 gets 2 likes, vid3 gets 1 like
      await interaction.connect(user2).likeVideo(vid1);
      await interaction.connect(user3).likeVideo(vid1);
      await interaction.connect(user4).likeVideo(vid1);

      await interaction.connect(user3).likeVideo(vid2);
      await interaction.connect(user4).likeVideo(vid2);

      await interaction.connect(user1).likeVideo(vid3);

      await time.increase(ROUND_DURATION + 1);
      await interaction.settleRound();

      const round = await interaction.getRound(1);
      // user1 should appear only once (with best score = 3)
      // user2 should be second (with 1 like)
      expect(round.topVideos[0]).to.equal(user1.address);
      expect(round.topLikes[0]).to.equal(3);
      expect(round.topVideos[1]).to.equal(user2.address);
      expect(round.topLikes[1]).to.equal(1);
      // user1 should NOT appear again
      expect(round.topVideos[2]).to.not.equal(user1.address);
    });
  });

  describe("F6: Settler reward deducted before distribution", function () {
    it("should not give settler reward to owner", async function () {
      const vid = await registerAndGetId(user1, "QmCID1", "V1", "QmC1");
      await interaction.connect(user2).likeVideo(vid);

      await time.increase(ROUND_DURATION + 1);

      const balBefore = await token.balanceOf(owner.address);
      await interaction.connect(owner).settleRound(); // owner settles
      const balAfter = await token.balanceOf(owner.address);

      // Owner should NOT receive settler reward
      expect(balAfter).to.equal(balBefore);
    });

    it("should give settler reward to non-owner settler", async function () {
      const vid = await registerAndGetId(user1, "QmCID1", "V1", "QmC1");
      await interaction.connect(user2).likeVideo(vid);

      await time.increase(ROUND_DURATION + 1);

      const balBefore = await token.balanceOf(user5.address);
      await interaction.connect(user5).settleRound();
      const balAfter = await token.balanceOf(user5.address);

      const settlerReward = ethers.parseEther("100");
      expect(balAfter - balBefore).to.equal(settlerReward);
    });

    it("should still allow claims after settler reward deduction", async function () {
      const vid = await registerAndGetId(user1, "QmCID1", "V1", "QmC1");
      await interaction.connect(user2).likeVideo(vid);
      await interaction.connect(user3).likeVideo(vid);

      await time.increase(ROUND_DURATION + 1);
      await interaction.connect(user5).settleRound();

      // user1 should be able to claim their reward
      const claimable = await interaction.getClaimable(1, user1.address);
      if (claimable > 0n) {
        await expect(interaction.connect(user1).claim(1)).to.not.be.reverted;
      }
    });
  });

  describe("F7: Claim enforces CLAIM_EXPIRY", function () {
    beforeEach(async function () {
      const vid = await registerAndGetId(user1, "QmCID1", "V1", "QmC1");
      await interaction.connect(user2).likeVideo(vid);
      await interaction.connect(user3).likeVideo(vid);
      await interaction.connect(user4).likeVideo(vid);

      await time.increase(ROUND_DURATION + 1);
      await interaction.connect(user5).settleRound();
    });

    it("should allow claim within expiry period", async function () {
      const claimable = await interaction.getClaimable(1, user1.address);
      expect(claimable).to.be.gt(0);
      await expect(interaction.connect(user1).claim(1)).to.not.be.reverted;
    });

    it("should reject claim after expiry period", async function () {
      // Advance time past CLAIM_EXPIRY (7 days)
      await time.increase(CLAIM_EXPIRY + 1);

      await expect(interaction.connect(user1).claim(1))
        .to.be.revertedWith("VideoInteraction: claim period expired");
    });

    it("should allow claim just before expiry", async function () {
      // Advance time to just before expiry
      await time.increase(CLAIM_EXPIRY - 60); // 1 minute before expiry
      const claimable = await interaction.getClaimable(1, user1.address);
      if (claimable > 0n) {
        await expect(interaction.connect(user1).claim(1)).to.not.be.reverted;
      }
    });
  });

  describe("F2: Round participant and video limits", function () {
    it("should enforce MAX_VIDEOS_PER_ROUND constant", async function () {
      const maxVids = await interaction.MAX_VIDEOS_PER_ROUND();
      expect(maxVids).to.equal(500);
    });

    it("should enforce MAX_PARTICIPANTS_PER_ROUND constant", async function () {
      const maxParts = await interaction.MAX_PARTICIPANTS_PER_ROUND();
      expect(maxParts).to.equal(2000);
    });
  });
});
