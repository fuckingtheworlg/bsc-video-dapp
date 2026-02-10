// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VideToken
 * @dev BSC DApp 核心代币合约
 * 功能：3%交易手续费自动拆分、燃烧上传许可、持仓追踪、钻石机制、黑名单、暂停
 */
contract VideToken is ERC20, Ownable, Pausable, ReentrancyGuard {

    // ============ 常量 ============
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18; // 10亿枚
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant TRANSFER_FEE_RATE = 300; // 3%
    uint256 public constant REWARD_POOL_SHARE = 8000; // 手续费的80%
    uint256 public constant MARKETING_POOL_SHARE = 2000; // 手续费的20%

    uint256 public constant BURN_AMOUNT_MIN = 10_000 * 1e18;
    uint256 public constant BURN_AMOUNT_MAX = 200_000 * 1e18;
    uint256 public constant HOLDING_THRESHOLD_MIN = 1_000 * 1e18;
    uint256 public constant HOLDING_THRESHOLD_MAX = 100_000 * 1e18;
    uint256 public constant LIKE_COST_MIN = 10 * 1e18;
    uint256 public constant LIKE_COST_MAX = 1_000 * 1e18;

    uint256 public constant DIAMOND_HOLD_DURATION = 4 hours;
    uint256 public constant LONG_HOLD_DURATION = 2 hours;
    uint256 public constant COOLDOWN_DURATION = 30 minutes;
    uint256 public constant BONUS_INITIAL_DURATION = 5 minutes;
    uint256 public constant BONUS_HOUR_DURATION = 1 hours;
    uint256 public constant BONUS_INITIAL_PERCENT = 10; // 10%
    uint256 public constant BONUS_HOURLY_PERCENT = 5;   // 每小时+5%
    uint256 public constant BONUS_HOURLY_MAX = 30;       // 最多+30%

    uint256 public constant RESET_HOUR_UTC = 16; // UTC 16:00 = 北京时间 00:00

    // ============ 状态变量 ============
    address public rewardPool;
    address public marketingPool;
    address public videoContract; // VideoInteraction 合约地址

    uint256 public burnAmount = 50_000 * 1e18;
    uint256 public holdingThreshold = 10_000 * 1e18;
    uint256 public likeCost = 100 * 1e18;

    // 持仓追踪
    mapping(address => uint256) public holdingSince;
    // 钻石机制
    mapping(address => bool) public hasSold;
    mapping(address => uint256) public cooldownUntil;
    // 持仓加成重置追踪
    mapping(address => uint256) public lastBonusResetDay;

    // 白名单（免手续费）
    mapping(address => bool) public feeWhitelist;
    // 黑名单
    mapping(address => bool) public blacklisted;

    // 燃烧上传许可
    mapping(address => uint256) public burnPermitCount;
    mapping(address => uint256) public totalBurned;

    // ============ 事件 ============
    event RewardPoolUpdated(address indexed oldPool, address indexed newPool);
    event MarketingPoolUpdated(address indexed oldPool, address indexed newPool);
    event VideoContractUpdated(address indexed oldContract, address indexed newContract);
    event BurnAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event HoldingThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event LikeCostUpdated(uint256 oldCost, uint256 newCost);
    event FeeWhitelistUpdated(address indexed account, bool whitelisted);
    event BlacklistUpdated(address indexed account, bool blacklisted);
    event BurnForUpload(address indexed user, uint256 amount, uint256 permitCount);
    event LikeBurn(address indexed user, uint256 amount);
    event FeesCollected(uint256 rewardAmount, uint256 marketingAmount);

    // ============ 修饰符 ============
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "VideToken: account is blacklisted");
        _;
    }

    modifier onlyVideoContract() {
        require(msg.sender == videoContract, "VideToken: caller is not video contract");
        _;
    }

    // ============ 构造函数 ============
    constructor(
        string memory name_,
        string memory symbol_,
        address rewardPool_,
        address marketingPool_,
        address initialHolder_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(rewardPool_ != address(0), "VideToken: zero reward pool");
        require(marketingPool_ != address(0), "VideToken: zero marketing pool");
        require(initialHolder_ != address(0), "VideToken: zero initial holder");

        rewardPool = rewardPool_;
        marketingPool = marketingPool_;

        // 白名单：合约本身、owner、奖励池、营销池
        feeWhitelist[address(this)] = true;
        feeWhitelist[msg.sender] = true;
        feeWhitelist[rewardPool_] = true;
        feeWhitelist[marketingPool_] = true;

        _mint(initialHolder_, TOTAL_SUPPLY);
        holdingSince[initialHolder_] = block.timestamp;
    }

    // ============ ERC20 重写 ============
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        // 黑名单检查
        if (from != address(0)) {
            require(!blacklisted[from], "VideToken: sender blacklisted");
        }
        if (to != address(0)) {
            require(!blacklisted[to], "VideToken: recipient blacklisted");
        }

        // mint 和 burn 不收手续费
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            _updateHoldingInfo(from, to);
            return;
        }

        // 白名单免手续费
        if (feeWhitelist[from] || feeWhitelist[to]) {
            super._update(from, to, amount);
            _updateHoldingInfo(from, to);
            return;
        }

        // 计算手续费
        uint256 feeAmount = (amount * TRANSFER_FEE_RATE) / FEE_DENOMINATOR;
        uint256 rewardFee = (feeAmount * REWARD_POOL_SHARE) / FEE_DENOMINATOR;
        uint256 marketingFee = feeAmount - rewardFee;
        uint256 transferAmount = amount - feeAmount;

        // 执行转账
        super._update(from, to, transferAmount);
        // 手续费直接拆分到两个地址
        if (rewardFee > 0) {
            super._update(from, rewardPool, rewardFee);
        }
        if (marketingFee > 0) {
            super._update(from, marketingPool, marketingFee);
        }

        emit FeesCollected(rewardFee, marketingFee);

        // 更新持仓信息
        _updateHoldingInfo(from, to);
    }

    /**
     * @dev 更新发送方和接收方的持仓追踪信息
     */
    function _updateHoldingInfo(address from, address to) internal {
        // 发送方：标记已卖出、设置冷却期（仅限用户间转账，不含燃烧）
        if (from != address(0) && to != address(0) && !feeWhitelist[from]) {
            hasSold[from] = true;
            cooldownUntil[from] = block.timestamp + COOLDOWN_DURATION;
        }
        // 如果发送方余额清零，重置持仓开始时间（包含燃烧场景）
        if (from != address(0) && balanceOf(from) == 0) {
            holdingSince[from] = 0;
        }

        // 接收方：如果之前没有持仓，记录持仓开始时间
        if (to != address(0) && holdingSince[to] == 0) {
            holdingSince[to] = block.timestamp;
        }
    }

    // ============ 燃烧上传许可 ============
    /**
     * @dev 用户燃烧代币获取上传许可
     */
    function burnForUpload() external nonReentrant notBlacklisted(msg.sender) {
        require(meetsHoldingThreshold(msg.sender), "VideToken: below holding threshold");
        require(balanceOf(msg.sender) >= burnAmount, "VideToken: insufficient balance for burn");
        require(!isInCooldown(msg.sender), "VideToken: in cooldown period");

        _burn(msg.sender, burnAmount);
        burnPermitCount[msg.sender] += 1;
        totalBurned[msg.sender] += burnAmount;

        emit BurnForUpload(msg.sender, burnAmount, burnPermitCount[msg.sender]);
    }

    /**
     * @dev 消耗一个上传许可（由 VideoInteraction 合约调用）
     */
    function consumeUploadPermit(address user) external onlyVideoContract {
        require(burnPermitCount[user] > 0, "VideToken: no upload permit");
        burnPermitCount[user] -= 1;
    }

    /**
     * @dev 点赞时燃烧代币（由 VideoInteraction 合约调用）
     */
    function burnForLike(address user) external onlyVideoContract {
        require(balanceOf(user) >= likeCost, "VideToken: insufficient balance for like");
        _burn(user, likeCost);
        emit LikeBurn(user, likeCost);
    }

    // ============ 查询函数 ============

    /**
     * @dev 检查地址是否达到持仓门槛
     */
    function meetsHoldingThreshold(address account) public view returns (bool) {
        return balanceOf(account) >= holdingThreshold;
    }

    /**
     * @dev 检查地址是否在冷却期
     */
    function isInCooldown(address account) public view returns (bool) {
        return block.timestamp < cooldownUntil[account];
    }

    /**
     * @dev 检查地址是否为钻石用户
     */
    function isDiamond(address account) public view returns (bool) {
        if (hasSold[account]) return false;
        if (holdingSince[account] == 0) return false;
        if (balanceOf(account) < holdingThreshold) return false;
        return (block.timestamp - holdingSince[account]) >= DIAMOND_HOLD_DURATION;
    }

    /**
     * @dev 检查地址是否持仓满2小时（有资格获得额外奖励）
     */
    function isLongHolder(address account) public view returns (bool) {
        if (holdingSince[account] == 0) return false;
        return (block.timestamp - holdingSince[account]) >= LONG_HOLD_DURATION;
    }

    /**
     * @dev 获取档位比例（0-100），基于钻石机制
     */
    function getTierRatio(address account) public view returns (uint256) {
        if (isInCooldown(account)) return 0;
        if (isDiamond(account)) return 100;
        if (hasSold[account]) return 80;
        // 未卖出但持仓不满4小时：线性增长至100
        if (holdingSince[account] == 0) return 0;
        uint256 holdTime = block.timestamp - holdingSince[account];
        if (holdTime >= DIAMOND_HOLD_DURATION) return 100;
        return 80 + (20 * holdTime) / DIAMOND_HOLD_DURATION;
    }

    /**
     * @dev 获取持仓加成百分比（0-40），基于持仓时间
     * 首次持仓满5分钟+10%，之后每小时+5%，最多+30%（总计最多+40%）
     * 每日 UTC 16:00（北京00:00）重置
     */
    function getHoldingBonus(address account) public view returns (uint256) {
        if (holdingSince[account] == 0) return 0;
        if (isInCooldown(account)) return 0;

        uint256 holdStart = holdingSince[account];
        // 检查今日重置
        uint256 todayReset = _getTodayResetTimestamp();
        if (holdStart < todayReset) {
            holdStart = todayReset;
        }

        uint256 holdDuration = block.timestamp - holdStart;
        if (holdDuration < BONUS_INITIAL_DURATION) return 0;

        uint256 bonus = BONUS_INITIAL_PERCENT; // +10%
        if (holdDuration > BONUS_INITIAL_DURATION) {
            uint256 extraHours = (holdDuration - BONUS_INITIAL_DURATION) / BONUS_HOUR_DURATION;
            uint256 extraBonus = extraHours * BONUS_HOURLY_PERCENT;
            if (extraBonus > BONUS_HOURLY_MAX) {
                extraBonus = BONUS_HOURLY_MAX;
            }
            bonus += extraBonus;
        }
        return bonus;
    }

    /**
     * @dev 获取用户完整的有效额度（基础额度 × 档位比例 × (100 + 加成) / 100）
     */
    function getEffectiveQuota(address account) external view returns (uint256) {
        uint256 balance = balanceOf(account);
        if (balance < holdingThreshold) return 0;

        uint256 baseQuota = balance / holdingThreshold; // 每 holdingThreshold 枚 = 1份
        uint256 tierRatio = getTierRatio(account);      // 0-100
        uint256 bonus = getHoldingBonus(account);       // 0-40

        return (baseQuota * tierRatio * (100 + bonus)) / 10000;
    }

    /**
     * @dev 检查用户是否有资格参与活动（持仓满足 + 非冷却 + 非黑名单）
     */
    function canParticipate(address account) external view returns (bool) {
        if (blacklisted[account]) return false;
        if (isInCooldown(account)) return false;
        if (!meetsHoldingThreshold(account)) return false;
        return true;
    }

    // ============ 内部工具函数 ============

    /**
     * @dev 获取今日 UTC 16:00 的 timestamp
     */
    function _getTodayResetTimestamp() internal view returns (uint256) {
        uint256 daysSinceEpoch = block.timestamp / 1 days;
        uint256 todayStart = daysSinceEpoch * 1 days;
        uint256 todayReset = todayStart + (RESET_HOUR_UTC * 1 hours);
        // 如果当前时间还没到今天的重置点，则用昨天的重置点
        if (block.timestamp < todayReset) {
            todayReset -= 1 days;
        }
        return todayReset;
    }

    // ============ 管理函数 ============

    function setRewardPool(address newPool) external onlyOwner {
        require(newPool != address(0), "VideToken: zero address");
        emit RewardPoolUpdated(rewardPool, newPool);
        feeWhitelist[rewardPool] = false;
        rewardPool = newPool;
        feeWhitelist[newPool] = true;
    }

    function setMarketingPool(address newPool) external onlyOwner {
        require(newPool != address(0), "VideToken: zero address");
        emit MarketingPoolUpdated(marketingPool, newPool);
        feeWhitelist[marketingPool] = false;
        marketingPool = newPool;
        feeWhitelist[newPool] = true;
    }

    function setVideoContract(address newContract) external onlyOwner {
        emit VideoContractUpdated(videoContract, newContract);
        if (videoContract != address(0)) {
            feeWhitelist[videoContract] = false;
        }
        videoContract = newContract;
        if (newContract != address(0)) {
            feeWhitelist[newContract] = true;
        }
    }

    function setBurnAmount(uint256 newAmount) external onlyOwner {
        require(newAmount >= BURN_AMOUNT_MIN && newAmount <= BURN_AMOUNT_MAX, "VideToken: burn amount out of range");
        emit BurnAmountUpdated(burnAmount, newAmount);
        burnAmount = newAmount;
    }

    function setHoldingThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold >= HOLDING_THRESHOLD_MIN && newThreshold <= HOLDING_THRESHOLD_MAX, "VideToken: threshold out of range");
        emit HoldingThresholdUpdated(holdingThreshold, newThreshold);
        holdingThreshold = newThreshold;
    }

    function setLikeCost(uint256 newCost) external onlyOwner {
        require(newCost >= LIKE_COST_MIN && newCost <= LIKE_COST_MAX, "VideToken: like cost out of range");
        emit LikeCostUpdated(likeCost, newCost);
        likeCost = newCost;
    }

    function setFeeWhitelist(address account, bool whitelisted) external onlyOwner {
        feeWhitelist[account] = whitelisted;
        emit FeeWhitelistUpdated(account, whitelisted);
    }

    function setBlacklist(address account, bool _blacklisted) external onlyOwner {
        blacklisted[account] = _blacklisted;
        emit BlacklistUpdated(account, _blacklisted);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
