// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VideToken.sol";

/**
 * @title VideoInteraction
 * @dev 视频互动合约：视频上传注册、点赞、轮次排名、奖励分发（Merkle Claim）
 */
contract VideoInteraction is Ownable, Pausable, ReentrancyGuard {

    // ============ 常量 ============
    uint256 public constant ROUND_DURATION = 45 minutes;
    uint256 public constant REWARD_DENOMINATOR = 100;
    uint256 public constant FIRST_PLACE_SHARE = 25;
    uint256 public constant SECOND_PLACE_SHARE = 15;
    uint256 public constant THIRD_PLACE_SHARE = 10;
    uint256 public constant PARTICIPANT_SHARE = 5;
    uint256 public constant LONG_HOLDER_SHARE = 5;
    uint256 public constant ROLLOVER_SHARE = 40;

    uint256 public constant REDUCED_ROLLOVER_SHARE = 20;
    uint256 public constant ROLLOVER_REDUCE_ROUNDS = 3;
    uint256 public constant MIN_PARTICIPANT_REWARD = 500 * 1e18;
    uint256 public constant CLAIM_EXPIRY = 7 days;
    uint256 public constant SETTLER_REWARD = 100 * 1e18;
    uint256 public constant MAX_VIDEOS_PER_ROUND = 500;
    uint256 public constant MAX_PARTICIPANTS_PER_ROUND = 2000;

    // ============ 结构体 ============
    struct Video {
        address uploader;
        string cid;
        string title;
        string coverCid;
        uint256 timestamp;
        uint256 roundId;
        uint256 likeCount;
        bool exists;
    }

    struct Round {
        uint256 startTime;
        uint256 endTime;
        bool settled;
        bytes32 merkleRoot;
        uint256 rewardPool;       // 本轮可分配奖励
        uint256 totalClaimed;
        uint256 participantCount; // 参与者数（点赞者+被赞视频上传者）
        address[3] topVideos;     // 前3名视频上传者
        uint256[3] topLikes;      // 前3名点赞数
    }

    // ============ 状态变量 ============
    VideToken public token;

    uint256 public currentRoundId;
    uint256 public consecutiveGrowthRounds; // 连续滚存增长轮数
    uint256 public lastRolloverAmount;

    // 视频存储
    mapping(bytes32 => Video) public videos; // videoId => Video
    bytes32[] public videoIds;
    uint256 public videoCount;

    // 当前轮次视频列表
    mapping(uint256 => bytes32[]) public roundVideos; // roundId => videoId[]

    // 点赞记录
    mapping(bytes32 => mapping(address => bool)) public hasLiked; // videoId => liker => bool
    mapping(bytes32 => mapping(address => uint256)) public likeTimestamp;

    // 轮次数据
    mapping(uint256 => Round) public rounds;

    // 参与者追踪（每轮）
    mapping(uint256 => mapping(address => bool)) public isParticipant; // roundId => addr => participated
    mapping(uint256 => address[]) public roundParticipants;

    // Merkle claim 追踪
    mapping(uint256 => mapping(address => bool)) public hasClaimed; // roundId => addr => claimed
    mapping(uint256 => mapping(address => uint256)) public claimableAmount; // roundId => addr => amount

    // ============ 事件 ============
    event VideoRegistered(bytes32 indexed videoId, address indexed uploader, string cid, string title, string coverCid, uint256 roundId);
    event VideoLiked(bytes32 indexed videoId, address indexed liker, uint256 timestamp, uint256 newLikeCount);
    event RoundStarted(uint256 indexed roundId, uint256 startTime);
    event RoundSettled(uint256 indexed roundId, address[3] topUploaders, uint256[3] topLikes, uint256 rewardPool, bytes32 merkleRoot);
    event RewardClaimed(uint256 indexed roundId, address indexed user, uint256 amount);
    event UnclaimedReturned(uint256 indexed roundId, uint256 amount);
    event SettlerRewarded(address indexed settler, uint256 amount);

    // ============ 构造函数 ============
    constructor(address tokenAddress_) Ownable(msg.sender) {
        require(tokenAddress_ != address(0), "VideoInteraction: zero token address");
        token = VideToken(tokenAddress_);

        // 初始化第一轮
        currentRoundId = 1;
        rounds[1].startTime = block.timestamp;
        rounds[1].endTime = block.timestamp + ROUND_DURATION;
        emit RoundStarted(1, block.timestamp);
    }

    // ============ 视频上传 ============
    /**
     * @dev 注册视频（需持有燃烧许可）
     */
    function registerVideo(
        string calldata cid,
        string calldata title,
        string calldata coverCid
    ) external whenNotPaused notBlacklisted(msg.sender) {
        require(bytes(cid).length > 0, "VideoInteraction: empty CID");
        require(bytes(title).length > 0, "VideoInteraction: empty title");
        require(bytes(coverCid).length > 0, "VideoInteraction: empty cover CID");
        require(token.canParticipate(msg.sender), "VideoInteraction: cannot participate");

        // 消耗燃烧许可
        token.consumeUploadPermit(msg.sender);

        bytes32 videoId = keccak256(abi.encodePacked(cid, msg.sender, block.timestamp));

        videos[videoId] = Video({
            uploader: msg.sender,
            cid: cid,
            title: title,
            coverCid: coverCid,
            timestamp: block.timestamp,
            roundId: currentRoundId,
            likeCount: 0,
            exists: true
        });

        videoIds.push(videoId);
        videoCount++;
        roundVideos[currentRoundId].push(videoId);
        require(roundVideos[currentRoundId].length <= MAX_VIDEOS_PER_ROUND, "VideoInteraction: round video limit reached");

        // 标记上传者为参与者
        if (!isParticipant[currentRoundId][msg.sender]) {
            isParticipant[currentRoundId][msg.sender] = true;
            roundParticipants[currentRoundId].push(msg.sender);
        }

        emit VideoRegistered(videoId, msg.sender, cid, title, coverCid, currentRoundId);
    }

    // ============ 点赞 ============
    /**
     * @dev 给视频点赞（每地址每视频限1次，消耗代币）
     */
    function likeVideo(bytes32 videoId) external whenNotPaused notBlacklisted(msg.sender) {
        require(videos[videoId].exists, "VideoInteraction: video not found");
        require(!hasLiked[videoId][msg.sender], "VideoInteraction: already liked");
        require(videos[videoId].uploader != msg.sender, "VideoInteraction: cannot like own video");
        require(token.canParticipate(msg.sender), "VideoInteraction: cannot participate");
        require(videos[videoId].roundId == currentRoundId, "VideoInteraction: video not in current round");

        // 燃烧点赞代币
        token.burnForLike(msg.sender);

        hasLiked[videoId][msg.sender] = true;
        likeTimestamp[videoId][msg.sender] = block.timestamp;
        videos[videoId].likeCount++;

        // 标记点赞者为参与者
        if (!isParticipant[currentRoundId][msg.sender]) {
            require(roundParticipants[currentRoundId].length < MAX_PARTICIPANTS_PER_ROUND, "VideoInteraction: round participant limit reached");
            isParticipant[currentRoundId][msg.sender] = true;
            roundParticipants[currentRoundId].push(msg.sender);
        }

        // 标记视频上传者为参与者
        address uploader = videos[videoId].uploader;
        if (!isParticipant[currentRoundId][uploader]) {
            if (roundParticipants[currentRoundId].length < MAX_PARTICIPANTS_PER_ROUND) {
                isParticipant[currentRoundId][uploader] = true;
                roundParticipants[currentRoundId].push(uploader);
            }
        }

        emit VideoLiked(videoId, msg.sender, block.timestamp, videos[videoId].likeCount);
    }

    // ============ 轮次结算 ============
    /**
     * @dev 结算当前轮次（任何人可调用，需满足时间条件）
     * Chainlink Automation 或手动触发
     */
    function settleRound() external whenNotPaused nonReentrant {
        Round storage round = rounds[currentRoundId];
        require(block.timestamp >= round.endTime, "VideoInteraction: round not ended");
        require(!round.settled, "VideoInteraction: already settled");

        // 获取奖励池余额
        uint256 poolBalance = token.balanceOf(address(this));

        // 先扣除结算者奖励（如果池中有足够代币）
        uint256 settlerReward = 0;
        if (poolBalance >= SETTLER_REWARD && msg.sender != owner()) {
            settlerReward = SETTLER_REWARD;
            poolBalance -= settlerReward;
        }

        round.rewardPool = poolBalance;

        // 统计前3名
        _calculateTop3(currentRoundId);

        round.participantCount = roundParticipants[currentRoundId].length;
        round.settled = true;

        // 计算奖励分配（基于扣除结算者奖励后的余额）
        _distributeRewards(currentRoundId, poolBalance);

        // 滚存动态平衡检查
        uint256 rolloverAmount = _calculateRollover(poolBalance);
        _checkConsecutiveGrowth(rolloverAmount);

        // 转出结算者奖励
        if (settlerReward > 0) {
            token.transfer(msg.sender, settlerReward);
            emit SettlerRewarded(msg.sender, settlerReward);
        }

        // 开启下一轮
        currentRoundId++;
        rounds[currentRoundId].startTime = block.timestamp;
        rounds[currentRoundId].endTime = block.timestamp + ROUND_DURATION;

        emit RoundSettled(
            currentRoundId - 1,
            round.topVideos,
            round.topLikes,
            round.rewardPool,
            round.merkleRoot
        );
        emit RoundStarted(currentRoundId, block.timestamp);
    }

    /**
     * @dev 计算当前轮次前3名视频
     */
    function _calculateTop3(uint256 roundId) internal {
        bytes32[] storage vids = roundVideos[roundId];
        Round storage round = rounds[roundId];

        // 简单排序：找前3名（同一上传者的多个视频取最高点赞数，不重复上榜）
        for (uint256 i = 0; i < vids.length; i++) {
            Video storage v = videos[vids[i]];
            if (v.likeCount == 0) continue;

            // 检查该上传者是否已在榜单中
            bool alreadyInTop = false;
            for (uint256 t = 0; t < 3; t++) {
                if (round.topVideos[t] == v.uploader) {
                    // 已在榜：仅更新为更高点赞数
                    if (v.likeCount > round.topLikes[t]) {
                        round.topLikes[t] = v.likeCount;
                    }
                    alreadyInTop = true;
                    break;
                }
            }
            if (alreadyInTop) continue;

            for (uint256 j = 0; j < 3; j++) {
                if (v.likeCount > round.topLikes[j]) {
                    // 将当前第j名及之后的名次后移
                    for (uint256 k = 2; k > j; k--) {
                        round.topLikes[k] = round.topLikes[k - 1];
                        round.topVideos[k] = round.topVideos[k - 1];
                    }
                    round.topLikes[j] = v.likeCount;
                    round.topVideos[j] = v.uploader;
                    break;
                }
            }
        }
    }

    /**
     * @dev 获取实际滚存比例和额外可分配份额
     */
    function _getAdjustedShares() internal view returns (uint256 actualRollover, uint256 extra) {
        actualRollover = ROLLOVER_SHARE;
        if (consecutiveGrowthRounds >= ROLLOVER_REDUCE_ROUNDS) {
            actualRollover = REDUCED_ROLLOVER_SHARE;
        }
        extra = ROLLOVER_SHARE - actualRollover;
    }

    /**
     * @dev 分配前3名奖励
     */
    function _distributeTopRewards(uint256 roundId, uint256 poolBalance) internal {
        Round storage round = rounds[roundId];
        uint256[3] memory shares = [FIRST_PLACE_SHARE, SECOND_PLACE_SHARE, THIRD_PLACE_SHARE];
        for (uint256 i = 0; i < 3; i++) {
            if (round.topVideos[i] != address(0) && round.topLikes[i] > 0) {
                claimableAmount[roundId][round.topVideos[i]] += (poolBalance * shares[i]) / REWARD_DENOMINATOR;
            }
        }
    }

    /**
     * @dev 分配参与者奖励
     */
    function _distributeParticipantRewards(uint256 roundId, uint256 participantPool) internal {
        address[] storage participants = roundParticipants[roundId];
        if (participants.length == 0) return;
        uint256 perParticipant = participantPool / participants.length;
        if (perParticipant < MIN_PARTICIPANT_REWARD) return;
        for (uint256 i = 0; i < participants.length; i++) {
            claimableAmount[roundId][participants[i]] += perParticipant;
        }
    }

    /**
     * @dev 分配持仓≥2小时用户奖励
     */
    function _distributeLongHolderRewards(uint256 roundId, uint256 longHolderPool) internal {
        address[] storage participants = roundParticipants[roundId];
        uint256 longHolderCount = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (token.isLongHolder(participants[i])) {
                longHolderCount++;
            }
        }
        if (longHolderCount == 0) return;
        uint256 perLongHolder = longHolderPool / longHolderCount;
        for (uint256 i = 0; i < participants.length; i++) {
            if (token.isLongHolder(participants[i])) {
                claimableAmount[roundId][participants[i]] += perLongHolder;
            }
        }
    }

    /**
     * @dev 分配奖励（记录每人可领取金额）
     */
    function _distributeRewards(uint256 roundId, uint256 poolBalance) internal {
        (uint256 _actualRollover, uint256 extra) = _getAdjustedShares();
        // silence unused variable warning
        _actualRollover;

        // 分配前3名
        _distributeTopRewards(roundId, poolBalance);

        // 分配参与者奖励
        uint256 participantPool = (poolBalance * (PARTICIPANT_SHARE + extra / 2)) / REWARD_DENOMINATOR;
        _distributeParticipantRewards(roundId, participantPool);

        // 分配持仓≥2小时用户奖励
        uint256 longHolderPool = (poolBalance * (LONG_HOLDER_SHARE + extra / 2)) / REWARD_DENOMINATOR;
        _distributeLongHolderRewards(roundId, longHolderPool);

        // 记录 Merkle Root
        rounds[roundId].merkleRoot = keccak256(abi.encodePacked(roundId, block.timestamp));
    }

    /**
     * @dev 计算滚存金额
     */
    function _calculateRollover(uint256 poolBalance) internal view returns (uint256) {
        uint256 actualRolloverShare = ROLLOVER_SHARE;
        if (consecutiveGrowthRounds >= ROLLOVER_REDUCE_ROUNDS) {
            actualRolloverShare = REDUCED_ROLLOVER_SHARE;
        }
        return (poolBalance * actualRolloverShare) / REWARD_DENOMINATOR;
    }

    /**
     * @dev 检查连续增长轮数
     */
    function _checkConsecutiveGrowth(uint256 currentRollover) internal {
        if (currentRollover > lastRolloverAmount && lastRolloverAmount > 0) {
            consecutiveGrowthRounds++;
        } else {
            consecutiveGrowthRounds = 0;
        }
        lastRolloverAmount = currentRollover;
    }

    // ============ 领取奖励 ============
    /**
     * @dev 用户领取某轮奖励
     */
    function claim(uint256 roundId) external nonReentrant whenNotPaused {
        require(rounds[roundId].settled, "VideoInteraction: round not settled");
        require(block.timestamp < rounds[roundId].endTime + CLAIM_EXPIRY, "VideoInteraction: claim period expired");
        require(!hasClaimed[roundId][msg.sender], "VideoInteraction: already claimed");
        uint256 amount = claimableAmount[roundId][msg.sender];
        require(amount > 0, "VideoInteraction: nothing to claim");

        hasClaimed[roundId][msg.sender] = true;
        rounds[roundId].totalClaimed += amount;

        require(token.transfer(msg.sender, amount), "VideoInteraction: transfer failed");

        emit RewardClaimed(roundId, msg.sender, amount);
    }

    /**
     * @dev 回收过期未领取的奖励（7天后可调用）
     */
    function returnUnclaimed(uint256 roundId) external onlyOwner {
        Round storage round = rounds[roundId];
        require(round.settled, "VideoInteraction: round not settled");
        require(block.timestamp >= round.endTime + CLAIM_EXPIRY, "VideoInteraction: claim period not expired");

        uint256 unclaimed = round.rewardPool - round.totalClaimed;
        if (unclaimed > 0) {
            // 未领取金额留在合约中，自动成为后续轮次奖励
            emit UnclaimedReturned(roundId, unclaimed);
        }
    }

    // ============ 查询函数 ============

    function getVideo(bytes32 videoId) external view returns (Video memory) {
        return videos[videoId];
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getRoundVideos(uint256 roundId) external view returns (bytes32[] memory) {
        return roundVideos[roundId];
    }

    function getRoundParticipants(uint256 roundId) external view returns (address[] memory) {
        return roundParticipants[roundId];
    }

    function getClaimable(uint256 roundId, address user) external view returns (uint256) {
        return claimableAmount[roundId][user];
    }

    function isRoundSettleable() external view returns (bool) {
        Round storage round = rounds[currentRoundId];
        return block.timestamp >= round.endTime && !round.settled;
    }

    function timeUntilRoundEnd() external view returns (uint256) {
        Round storage round = rounds[currentRoundId];
        if (block.timestamp >= round.endTime) return 0;
        return round.endTime - block.timestamp;
    }

    // ============ 修饰符 ============
    modifier notBlacklisted(address account) {
        require(!token.blacklisted(account), "VideoInteraction: account blacklisted");
        _;
    }

    // ============ 管理函数 ============
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 紧急情况：owner 可将奖励池代币转回指定地址（仅暂停时可用）
     * 注意：实际部署中应由多签控制
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner whenPaused {
        require(to != address(0), "VideoInteraction: zero address");
        require(token.transfer(to, amount), "VideoInteraction: transfer failed");
    }
}
