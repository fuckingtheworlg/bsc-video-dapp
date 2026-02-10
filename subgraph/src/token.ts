import { Bytes } from "@graphprotocol/graph-ts";
import {
  BurnForUpload as BurnForUploadEvent,
  LikeBurn as LikeBurnEvent,
  FeesCollected as FeesCollectedEvent,
  BlacklistUpdated as BlacklistUpdatedEvent,
} from "../generated/VideToken/VideToken";
import {
  BurnRecord,
  LikeBurnRecord,
  FeeCollection,
} from "../generated/schema";
import { getOrCreateUserStats, getOrCreateProtocolStats } from "./utils";

export function handleBurnForUpload(event: BurnForUploadEvent): void {
  let id = Bytes.fromByteArray(event.transaction.hash.concatI32(event.logIndex.toI32()));
  let record = new BurnRecord(id);
  record.user = event.params.user;
  record.amount = event.params.amount;
  record.permitCount = event.params.permitCount;
  record.timestamp = event.block.timestamp;
  record.save();

  let userStats = getOrCreateUserStats(event.params.user);
  userStats.totalBurned = userStats.totalBurned.plus(event.params.amount);
  userStats.save();

  let protocol = getOrCreateProtocolStats();
  protocol.totalBurned = protocol.totalBurned.plus(event.params.amount);
  protocol.save();
}

export function handleLikeBurn(event: LikeBurnEvent): void {
  let id = Bytes.fromByteArray(event.transaction.hash.concatI32(event.logIndex.toI32()));
  let record = new LikeBurnRecord(id);
  record.user = event.params.user;
  record.amount = event.params.amount;
  record.timestamp = event.block.timestamp;
  record.save();
}

export function handleFeesCollected(event: FeesCollectedEvent): void {
  let id = Bytes.fromByteArray(event.transaction.hash.concatI32(event.logIndex.toI32()));
  let record = new FeeCollection(id);
  record.rewardAmount = event.params.rewardAmount;
  record.marketingAmount = event.params.marketingAmount;
  record.timestamp = event.block.timestamp;
  record.save();

  let protocol = getOrCreateProtocolStats();
  protocol.totalFeesCollected = protocol.totalFeesCollected.plus(
    event.params.rewardAmount.plus(event.params.marketingAmount)
  );
  protocol.save();
}

export function handleBlacklistUpdated(event: BlacklistUpdatedEvent): void {
  // Blacklist events are indexed for transparency but don't need a dedicated entity
  // They can be queried via transaction logs
}
