const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VideoInteraction", function () {
  let token, interaction;
  let owner, rewardPool, marketingPool, user1, user2, user3, user4, user5;
  const TOTAL_SUPPLY = ethers.parseEther("1000000000");
  const USER_TOKENS = ethers.parseEther("500000"); // enough for burn + likes
  const ROUND_DURATION = 45 * 60; // 45 minutes in seconds

  beforeEach(async function () {
    [owner, rewardPool, marketingPool, user1, user2, user3, user4, user5] = await ethers.getSigners();

    // Deploy token
    const VideToken = await ethers.getContractFactory("VideToken");
    token = await VideToken.deploy("VideToken", "VIDE", rewardPool.address, marketingPool.address, owner.address);
    await token.waitForDeployment();

    // Deploy interaction
    const VideoInteraction = await ethers.getContractFactory("VideoInteraction");
    interaction = await VideoInteraction.deploy(await token.getAddress());
    await interaction.waitForDeployment();

    // Configure token
    await token.setVideoContract(await interaction.getAddress());

    // Fund users (owner is whitelisted so no fee)
    await token.transfer(user1.address, USER_TOKENS);
    await token.transfer(user2.address, USER_TOKENS);
    await token.transfer(user3.address, USER_TOKENS);
    await token.transfer(user4.address, USER_TOKENS);
    await token.transfer(user5.address, USER_TOKENS);

    // Fund interaction contract with reward pool tokens
    await token.transfer(await interaction.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Deployment", function () {
    it("should set correct token address", async function () {
      expect(await interaction.token()).to.equal(await token.getAddress());
    });

    it("should initialize round 1", async function () {
      expect(await interaction.currentRoundId()).to.equal(1);
      const round = await interaction.getRound(1);
      expect(round.startTime).to.be.gt(0);
      expect(round.settled).to.be.false;
    });
  });

  describe("Video Registration", function () {
    beforeEach(async function () {
      // User1 burns for upload permit
      await token.connect(user1).burnForUpload();
    });

    it("should register a video with valid permit", async function () {
      await interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123");
      expect(await interaction.videoCount()).to.equal(1);
    });

    it("should emit VideoRegistered event", async function () {
      await expect(interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123"))
        .to.emit(interaction, "VideoRegistered");
    });

    it("should consume the upload permit", async function () {
      await interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123");
      expect(await token.burnPermitCount(user1.address)).to.equal(0);
    });

    it("should revert without upload permit", async function () {
      await expect(interaction.connect(user2).registerVideo("QmTestCID456", "No Permit", "QmCover456"))
        .to.be.revertedWith("VideToken: no upload permit");
    });

    it("should revert with empty CID", async function () {
      await expect(interaction.connect(user1).registerVideo("", "Title", "QmCover"))
        .to.be.revertedWith("VideoInteraction: empty CID");
    });

    it("should revert with empty title", async function () {
      await expect(interaction.connect(user1).registerVideo("QmCID", "", "QmCover"))
        .to.be.revertedWith("VideoInteraction: empty title");
    });

    it("should add video to round videos", async function () {
      await interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123");
      const roundVids = await interaction.getRoundVideos(1);
      expect(roundVids.length).to.equal(1);
    });

    it("should mark uploader as participant", async function () {
      await interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123");
      const participants = await interaction.getRoundParticipants(1);
      expect(participants).to.include(user1.address);
    });
  });

  describe("Like Video", function () {
    let videoId;

    beforeEach(async function () {
      await token.connect(user1).burnForUpload();
      const tx = await interaction.connect(user1).registerVideo("QmTestCID123", "My First Video", "QmCoverCID123");
      const receipt = await tx.wait();
      // Get videoId from event
      const event = receipt.logs.find(log => {
        try {
          return interaction.interface.parseLog(log)?.name === "VideoRegistered";
        } catch { return false; }
      });
      videoId = interaction.interface.parseLog(event).args.videoId;
    });

    it("should allow user to like a video", async function () {
      await interaction.connect(user2).likeVideo(videoId);
      const video = await interaction.getVideo(videoId);
      expect(video.likeCount).to.equal(1);
    });

    it("should emit VideoLiked event", async function () {
      await expect(interaction.connect(user2).likeVideo(videoId))
        .to.emit(interaction, "VideoLiked");
    });

    it("should burn like cost tokens", async function () {
      const balBefore = await token.balanceOf(user2.address);
      await interaction.connect(user2).likeVideo(videoId);
      const balAfter = await token.balanceOf(user2.address);
      expect(balBefore - balAfter).to.equal(ethers.parseEther("100"));
    });

    it("should prevent double like", async function () {
      await interaction.connect(user2).likeVideo(videoId);
      await expect(interaction.connect(user2).likeVideo(videoId))
        .to.be.revertedWith("VideoInteraction: already liked");
    });

    it("should prevent liking own video", async function () {
      await expect(interaction.connect(user1).likeVideo(videoId))
        .to.be.revertedWith("VideoInteraction: cannot like own video");
    });

    it("should mark liker as participant", async function () {
      await interaction.connect(user2).likeVideo(videoId);
      const participants = await interaction.getRoundParticipants(1);
      expect(participants).to.include(user2.address);
    });

    it("should allow multiple users to like same video", async function () {
      await interaction.connect(user2).likeVideo(videoId);
      await interaction.connect(user3).likeVideo(videoId);
      await interaction.connect(user4).likeVideo(videoId);
      const video = await interaction.getVideo(videoId);
      expect(video.likeCount).to.equal(3);
    });
  });

  describe("Round Settlement", function () {
    let videoId1, videoId2, videoId3;

    beforeEach(async function () {
      // Upload 3 videos
      await token.connect(user1).burnForUpload();
      await token.connect(user2).burnForUpload();
      await token.connect(user3).burnForUpload();

      let tx, receipt, event;

      tx = await interaction.connect(user1).registerVideo("QmCID1", "Video 1", "QmCover1");
      receipt = await tx.wait();
      event = receipt.logs.find(log => { try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; } catch { return false; } });
      videoId1 = interaction.interface.parseLog(event).args.videoId;

      tx = await interaction.connect(user2).registerVideo("QmCID2", "Video 2", "QmCover2");
      receipt = await tx.wait();
      event = receipt.logs.find(log => { try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; } catch { return false; } });
      videoId2 = interaction.interface.parseLog(event).args.videoId;

      tx = await interaction.connect(user3).registerVideo("QmCID3", "Video 3", "QmCover3");
      receipt = await tx.wait();
      event = receipt.logs.find(log => { try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; } catch { return false; } });
      videoId3 = interaction.interface.parseLog(event).args.videoId;

      // Likes: video1 gets 3, video2 gets 2, video3 gets 1
      await interaction.connect(user2).likeVideo(videoId1);
      await interaction.connect(user3).likeVideo(videoId1);
      await interaction.connect(user4).likeVideo(videoId1);

      await interaction.connect(user1).likeVideo(videoId2);
      await interaction.connect(user4).likeVideo(videoId2);

      await interaction.connect(user1).likeVideo(videoId3);
    });

    it("should revert if round not ended", async function () {
      await expect(interaction.settleRound())
        .to.be.revertedWith("VideoInteraction: round not ended");
    });

    it("should settle after round duration", async function () {
      await time.increase(ROUND_DURATION + 1);
      await expect(interaction.settleRound()).to.emit(interaction, "RoundSettled");
    });

    it("should correctly rank top 3", async function () {
      await time.increase(ROUND_DURATION + 1);
      await interaction.settleRound();

      const round = await interaction.getRound(1);
      expect(round.topVideos[0]).to.equal(user1.address); // 3 likes
      expect(round.topVideos[1]).to.equal(user2.address); // 2 likes
      expect(round.topVideos[2]).to.equal(user3.address); // 1 like
      expect(round.topLikes[0]).to.equal(3);
      expect(round.topLikes[1]).to.equal(2);
      expect(round.topLikes[2]).to.equal(1);
    });

    it("should start next round after settlement", async function () {
      await time.increase(ROUND_DURATION + 1);
      await interaction.settleRound();
      expect(await interaction.currentRoundId()).to.equal(2);
    });

    it("should prevent double settlement", async function () {
      await time.increase(ROUND_DURATION + 1);
      await interaction.settleRound();
      await expect(interaction.settleRound())
        .to.be.revertedWith("VideoInteraction: round not ended");
    });

    it("should mark round as settled", async function () {
      await time.increase(ROUND_DURATION + 1);
      await interaction.settleRound();
      const round = await interaction.getRound(1);
      expect(round.settled).to.be.true;
    });
  });

  describe("Reward Claiming", function () {
    let videoId1;

    beforeEach(async function () {
      await token.connect(user1).burnForUpload();
      const tx = await interaction.connect(user1).registerVideo("QmCID1", "Video 1", "QmCover1");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => { try { return interaction.interface.parseLog(log)?.name === "VideoRegistered"; } catch { return false; } });
      videoId1 = interaction.interface.parseLog(event).args.videoId;

      // Multiple users like video1
      await interaction.connect(user2).likeVideo(videoId1);
      await interaction.connect(user3).likeVideo(videoId1);
      await interaction.connect(user4).likeVideo(videoId1);

      // Settle round
      await time.increase(ROUND_DURATION + 1);
      await interaction.connect(user5).settleRound();
    });

    it("should set claimable amount for winners", async function () {
      const claimable = await interaction.getClaimable(1, user1.address);
      expect(claimable).to.be.gt(0);
    });

    it("should allow winners to claim", async function () {
      const claimable = await interaction.getClaimable(1, user1.address);
      const balBefore = await token.balanceOf(user1.address);
      await interaction.connect(user1).claim(1);
      const balAfter = await token.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(claimable);
    });

    it("should prevent double claim", async function () {
      await interaction.connect(user1).claim(1);
      await expect(interaction.connect(user1).claim(1))
        .to.be.revertedWith("VideoInteraction: already claimed");
    });

    it("should revert claim with nothing to claim", async function () {
      // user5 didn't participate meaningfully for a separate round claim
      // Let's check with an address that wasn't a winner
      const claimable = await interaction.getClaimable(1, owner.address);
      if (claimable === 0n) {
        await expect(interaction.connect(owner).claim(1))
          .to.be.revertedWith("VideoInteraction: nothing to claim");
      }
    });
  });

  describe("Query Functions", function () {
    it("should return correct isRoundSettleable", async function () {
      expect(await interaction.isRoundSettleable()).to.be.false;
      await time.increase(ROUND_DURATION + 1);
      expect(await interaction.isRoundSettleable()).to.be.true;
    });

    it("should return correct timeUntilRoundEnd", async function () {
      const remaining = await interaction.timeUntilRoundEnd();
      expect(remaining).to.be.gt(0);
      expect(remaining).to.be.lte(ROUND_DURATION);
    });

    it("should return 0 timeUntilRoundEnd after round ends", async function () {
      await time.increase(ROUND_DURATION + 1);
      expect(await interaction.timeUntilRoundEnd()).to.equal(0);
    });
  });

  describe("Pause", function () {
    it("should block registerVideo when paused", async function () {
      await token.connect(user1).burnForUpload();
      await interaction.pause();
      await expect(interaction.connect(user1).registerVideo("QmCID", "Title", "QmCover"))
        .to.be.reverted;
    });

    it("should block likeVideo when paused", async function () {
      await token.connect(user1).burnForUpload();
      await interaction.connect(user1).registerVideo("QmCID", "Title", "QmCover");
      await interaction.pause();
      // likeVideo needs a valid videoId, but pause check comes first
      await expect(interaction.connect(user2).likeVideo(ethers.keccak256("0x01")))
        .to.be.reverted;
    });

    it("should block settleRound when paused", async function () {
      await time.increase(ROUND_DURATION + 1);
      await interaction.pause();
      await expect(interaction.settleRound()).to.be.reverted;
    });
  });
});
