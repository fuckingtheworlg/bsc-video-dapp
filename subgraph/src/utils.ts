import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { UserStats, ProtocolStats } from "../generated/schema";

export function getOrCreateUserStats(address: Bytes): UserStats {
  let stats = UserStats.load(address);
  if (!stats) {
    stats = new UserStats(address);
    stats.totalBurned = BigInt.zero();
    stats.totalRewards = BigInt.zero();
    stats.totalLikesGiven = BigInt.zero();
    stats.totalLikesReceived = BigInt.zero();
    stats.videoCount = BigInt.zero();
    stats.claimCount = BigInt.zero();
  }
  return stats;
}

export function getOrCreateProtocolStats(): ProtocolStats {
  let stats = ProtocolStats.load("global");
  if (!stats) {
    stats = new ProtocolStats("global");
    stats.totalVideos = BigInt.zero();
    stats.totalLikes = BigInt.zero();
    stats.totalBurned = BigInt.zero();
    stats.totalRewardsClaimed = BigInt.zero();
    stats.totalFeesCollected = BigInt.zero();
    stats.currentRoundId = BigInt.fromI32(1);
  }
  return stats;
}
