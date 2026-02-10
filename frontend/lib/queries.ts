import { gql } from "@apollo/client";

export const GET_VIDEOS = gql`
  query GetVideos($first: Int!, $skip: Int!) {
    videos(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
      id
      cid
      title
      coverCid
      uploader
      timestamp
      likeCount
      roundId
    }
  }
`;

export const GET_VIDEO = gql`
  query GetVideo($id: ID!) {
    video(id: $id) {
      id
      cid
      title
      coverCid
      uploader
      timestamp
      likeCount
      roundId
    }
  }
`;

export const GET_USER_VIDEOS = gql`
  query GetUserVideos($uploader: Bytes!) {
    videos(where: { uploader: $uploader }, orderBy: timestamp, orderDirection: desc) {
      id
      cid
      title
      coverCid
      uploader
      timestamp
      likeCount
      roundId
    }
  }
`;

export const GET_ROUND_INFO = gql`
  query GetRoundInfo($roundId: ID!) {
    round(id: $roundId) {
      id
      startTime
      endTime
      settled
      rewardPool
      participantCount
    }
  }
`;

export const GET_USER_STATS = gql`
  query GetUserStats($id: ID!) {
    userStats(id: $id) {
      totalBurned
      totalRewards
      totalLikesGiven
      totalLikesReceived
      videoCount
      claimCount
    }
  }
`;

export const GET_USER_CLAIMS = gql`
  query GetUserClaims($user: Bytes!) {
    rewardClaims(where: { user: $user }, orderBy: timestamp, orderDirection: desc) {
      id
      round {
        id
        roundNumber
      }
      amount
      timestamp
    }
  }
`;

export const GET_USER_LIKES = gql`
  query GetUserLikes($liker: Bytes!, $videoIds: [Bytes!]!) {
    likes(where: { liker: $liker, video_in: $videoIds }) {
      video {
        id
      }
    }
  }
`;
