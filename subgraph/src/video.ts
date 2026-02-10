import { BigInt, Bytes, crypto } from "@graphprotocol/graph-ts";
import {
  VideoRegistered as VideoRegisteredEvent,
  VideoLiked as VideoLikedEvent,
  RoundSettled as RoundSettledEvent,
  RewardClaimed as RewardClaimedEvent,
  RoundStarted as RoundStartedEvent,
} from "../generated/VideoInteraction/VideoInteraction";
import {
  Video,
  Like,
  Round,
  RoundWinner,
  RewardClaim,
} from "../generated/schema";
import { getOrCreateUserStats, getOrCreateProtocolStats } from "./utils";

export function handleVideoRegistered(event: VideoRegisteredEvent): void {
  let video = new Video(event.params.videoId);
  video.cid = event.params.cid;
  video.title = event.params.title;
  video.coverCid = event.params.coverCid;
  video.uploader = event.params.uploader;
  video.timestamp = event.block.timestamp;
  video.roundId = event.params.roundId;
  video.likeCount = BigInt.zero();
  video.save();

  let userStats = getOrCreateUserStats(event.params.uploader);
  userStats.videoCount = userStats.videoCount.plus(BigInt.fromI32(1));
  userStats.save();

  let protocol = getOrCreateProtocolStats();
  protocol.totalVideos = protocol.totalVideos.plus(BigInt.fromI32(1));
  protocol.save();
}

export function handleVideoLiked(event: VideoLikedEvent): void {
  // Create Like entity
  let likeId = crypto.keccak256(
    event.params.videoId.concat(event.params.liker)
  );
  let like = new Like(Bytes.fromByteArray(likeId));
  like.video = event.params.videoId;
  like.liker = event.params.liker;
  like.timestamp = event.params.timestamp;
  like.save();

  // Update video like count
  let video = Video.load(event.params.videoId);
  if (video) {
    video.likeCount = event.params.newLikeCount;
    video.save();

    // Update uploader's received likes
    let uploaderStats = getOrCreateUserStats(video.uploader);
    uploaderStats.totalLikesReceived = uploaderStats.totalLikesReceived.plus(BigInt.fromI32(1));
    uploaderStats.save();
  }

  // Update liker stats
  let likerStats = getOrCreateUserStats(event.params.liker);
  likerStats.totalLikesGiven = likerStats.totalLikesGiven.plus(BigInt.fromI32(1));
  likerStats.save();

  let protocol = getOrCreateProtocolStats();
  protocol.totalLikes = protocol.totalLikes.plus(BigInt.fromI32(1));
  protocol.save();
}

export function handleRoundStarted(event: RoundStartedEvent): void {
  let roundId = event.params.roundId.toString();
  let round = new Round(roundId);
  round.roundNumber = event.params.roundId;
  round.startTime = event.params.startTime;
  round.endTime = event.params.startTime.plus(BigInt.fromI32(2700)); // 45 minutes
  round.settled = false;
  round.rewardPool = BigInt.zero();
  round.participantCount = BigInt.zero();
  round.topUploaders = [];
  round.topLikes = [];
  round.save();

  let protocol = getOrCreateProtocolStats();
  protocol.currentRoundId = event.params.roundId;
  protocol.save();
}

export function handleRoundSettled(event: RoundSettledEvent): void {
  let roundId = event.params.roundId.toString();
  let round = Round.load(roundId);
  if (!round) return;

  round.settled = true;
  round.rewardPool = event.params.rewardPool;
  round.merkleRoot = event.params.merkleRoot;

  let topUploaders: Bytes[] = [];
  let topLikes: BigInt[] = [];

  for (let i = 0; i < 3; i++) {
    topUploaders.push(event.params.topUploaders[i]);
    topLikes.push(event.params.topLikes[i]);

    // Create RoundWinner entities
    if (event.params.topLikes[i].gt(BigInt.zero())) {
      let winnerId = roundId + "-" + i.toString();
      let winner = new RoundWinner(winnerId);
      winner.round = roundId;
      winner.rank = i + 1;
      winner.uploader = event.params.topUploaders[i];
      winner.likes = event.params.topLikes[i];
      winner.reward = BigInt.zero(); // Will be set when claimed
      winner.save();
    }
  }

  round.topUploaders = topUploaders;
  round.topLikes = topLikes;
  round.save();
}

export function handleRewardClaimed(event: RewardClaimedEvent): void {
  let id = Bytes.fromByteArray(event.transaction.hash.concatI32(event.logIndex.toI32()));
  let claim = new RewardClaim(id);
  claim.round = event.params.roundId.toString();
  claim.user = event.params.user;
  claim.amount = event.params.amount;
  claim.timestamp = event.block.timestamp;
  claim.save();

  let userStats = getOrCreateUserStats(event.params.user);
  userStats.totalRewards = userStats.totalRewards.plus(event.params.amount);
  userStats.claimCount = userStats.claimCount.plus(BigInt.fromI32(1));
  userStats.save();

  let protocol = getOrCreateProtocolStats();
  protocol.totalRewardsClaimed = protocol.totalRewardsClaimed.plus(event.params.amount);
  protocol.save();
}
