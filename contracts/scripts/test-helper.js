/**
 * 一键测试辅助脚本
 * 功能：转代币给钱包B → 快进时间 → 触发结算
 * 
 * 用法：npx hardhat run scripts/test-helper.js --network localhost
 * 
 * 可选参数（通过环境变量）：
 *   STEP=all        执行全部步骤（默认）
 *   STEP=transfer   只转代币
 *   STEP=settle     只快进+结算
 *   STEP=query      只查询状态
 *   STEP=blacklist  测试黑名单
 *   STEP=pause      测试暂停/恢复
 */
const { ethers } = require("hardhat");

// Hardhat 测试账户
const WALLET_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // deployer, has all tokens
const WALLET_B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // test liker

// 部署后的合约地址（Hardhat 默认确定性地址）
const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const INTERACTION_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

async function getContracts() {
  const token = await ethers.getContractAt("VideToken", TOKEN_ADDRESS);
  const interaction = await ethers.getContractAt("VideoInteraction", INTERACTION_ADDRESS);
  return { token, interaction };
}

function fmt(val) {
  return ethers.formatEther(val);
}

// ============ 步骤1：转代币给钱包B ============
async function transferTokens() {
  console.log("\n========== 转代币给钱包 B ==========");
  const { token } = await getContracts();
  const [walletA] = await ethers.getSigners();

  const balB_before = await token.balanceOf(WALLET_B);
  console.log(`钱包 B 当前余额: ${fmt(balB_before)} VIDE`);

  if (balB_before >= ethers.parseEther("50000")) {
    console.log("钱包 B 余额充足，跳过转账");
    return;
  }

  const amount = ethers.parseEther("200000"); // 转 20万（扣 3% 手续费后 B 收到 194,000）
  console.log(`从钱包 A 转 ${fmt(amount)} VIDE 给钱包 B...`);
  
  const tx = await token.connect(walletA).transfer(WALLET_B, amount);
  await tx.wait();

  const balB_after = await token.balanceOf(WALLET_B);
  const fee = amount - (balB_after - balB_before);
  console.log(`✅ 转账完成`);
  console.log(`   钱包 B 收到: ${fmt(balB_after - balB_before)} VIDE`);
  console.log(`   手续费扣除: ${fmt(fee)} VIDE (3%)`);
  console.log(`   钱包 B 余额: ${fmt(balB_after)} VIDE`);
}

// ============ 步骤2：快进时间 + 结算 ============
async function fastForwardAndSettle() {
  console.log("\n========== 快进时间 + 结算轮次 ==========");
  const { interaction } = await getContracts();
  const [walletA] = await ethers.getSigners();

  const roundId = await interaction.currentRoundId();
  const round = await interaction.rounds(roundId);
  
  console.log(`当前轮次: #${roundId}`);
  console.log(`轮次开始: ${new Date(Number(round.startTime) * 1000).toLocaleString()}`);
  console.log(`轮次结束: ${new Date(Number(round.endTime) * 1000).toLocaleString()}`);

  // 检查是否已可结算
  const block = await ethers.provider.getBlock("latest");
  const now = block.timestamp;
  const timeLeft = Number(round.endTime) - now;

  if (timeLeft > 0) {
    console.log(`距离结算还剩 ${timeLeft} 秒，快进时间...`);
    await ethers.provider.send("evm_increaseTime", [timeLeft + 10]);
    await ethers.provider.send("evm_mine", []);
    console.log(`✅ 时间已快进 ${timeLeft + 10} 秒`);
  } else {
    console.log("轮次已结束，可以直接结算");
  }

  // 结算
  try {
    console.log("执行 settleRound()...");
    const tx = await interaction.connect(walletA).settleRound();
    const receipt = await tx.wait();
    console.log(`✅ 轮次 #${roundId} 结算成功! TX: ${receipt.hash}`);
    
    const newRoundId = await interaction.currentRoundId();
    console.log(`新轮次 #${newRoundId} 已开始`);
  } catch (err) {
    if (err.message.includes("already settled")) {
      console.log("⚠️ 该轮次已经结算过了");
    } else {
      console.error("❌ 结算失败:", err.message);
    }
  }
}

// ============ 步骤3：查询全面状态 ============
async function queryStatus() {
  console.log("\n========== 系统状态查询 ==========");
  const { token, interaction } = await getContracts();

  // 代币信息
  console.log("\n--- 代币信息 ---");
  const balA = await token.balanceOf(WALLET_A);
  const balB = await token.balanceOf(WALLET_B);
  const balContract = await token.balanceOf(INTERACTION_ADDRESS);
  console.log(`钱包 A 余额:     ${fmt(balA)} VIDE`);
  console.log(`钱包 B 余额:     ${fmt(balB)} VIDE`);
  console.log(`合约奖励池余额:  ${fmt(balContract)} VIDE`);

  // 持仓信息
  console.log("\n--- 持仓与资格 ---");
  for (const [name, addr] of [["钱包 A", WALLET_A], ["钱包 B", WALLET_B]]) {
    const bonus = await token.getHoldingBonus(addr);
    const tier = await token.getTierRatio(addr);
    const diamond = await token.isDiamond(addr);
    const canPart = await token.canParticipate(addr);
    const cooldown = await token.isInCooldown(addr);
    const permits = await token.burnPermitCount(addr);
    console.log(`${name}: 加成=${bonus}% 档位=${tier}% 钻石=${diamond} 可参与=${canPart} 冷却中=${cooldown} 许可=${permits}`);
  }

  // 轮次信息
  console.log("\n--- 轮次信息 ---");
  const roundId = await interaction.currentRoundId();
  const round = await interaction.rounds(roundId);
  console.log(`当前轮次: #${roundId}`);
  console.log(`开始时间: ${new Date(Number(round.startTime) * 1000).toLocaleString()}`);
  console.log(`结束时间: ${new Date(Number(round.endTime) * 1000).toLocaleString()}`);
  console.log(`已结算:   ${round.settled}`);
  console.log(`视频总数: ${await interaction.videoCount()}`);

  // 上一轮奖励查询（如果存在）
  if (roundId > 1n) {
    const prevId = roundId - 1n;
    const prevRound = await interaction.rounds(prevId);
    console.log(`\n--- 上一轮 #${prevId} ---`);
    console.log(`奖励池:   ${fmt(prevRound.rewardPool)} VIDE`);
    console.log(`参与人数: ${prevRound.participantCount}`);
    
    const claimA = await interaction.claimableAmount(prevId, WALLET_A);
    const claimB = await interaction.claimableAmount(prevId, WALLET_B);
    console.log(`钱包 A 可领: ${fmt(claimA)} VIDE`);
    console.log(`钱包 B 可领: ${fmt(claimB)} VIDE`);
  }
}

// ============ 步骤4：测试黑名单 ============
async function testBlacklist() {
  console.log("\n========== 测试黑名单功能 ==========");
  const { token } = await getContracts();
  const [walletA] = await ethers.getSigners();
  const testAddr = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Account #2

  console.log(`将 ${testAddr} 加入黑名单...`);
  await (await token.connect(walletA).setBlacklist(testAddr, true)).wait();
  console.log(`✅ 已加入黑名单`);
  console.log(`黑名单状态: ${await token.blacklisted(testAddr)}`);

  console.log(`将 ${testAddr} 移出黑名单...`);
  await (await token.connect(walletA).setBlacklist(testAddr, false)).wait();
  console.log(`✅ 已移出黑名单`);
  console.log(`黑名单状态: ${await token.blacklisted(testAddr)}`);
}

// ============ 步骤5：测试暂停 ============
async function testPause() {
  console.log("\n========== 测试暂停/恢复功能 ==========");
  const { token } = await getContracts();
  const [walletA] = await ethers.getSigners();

  console.log("暂停合约...");
  await (await token.connect(walletA).pause()).wait();
  console.log(`✅ 合约已暂停, paused=${await token.paused()}`);

  // 测试暂停后转账失败
  try {
    await token.connect(walletA).transfer(WALLET_B, ethers.parseEther("1"));
    console.log("❌ 转账应该失败但成功了");
  } catch (err) {
    console.log("✅ 暂停后转账被正确拒绝");
  }

  console.log("恢复合约...");
  await (await token.connect(walletA).unpause()).wait();
  console.log(`✅ 合约已恢复, paused=${await token.paused()}`);
}

// ============ 主函数 ============
async function main() {
  const step = process.env.STEP || "all";
  
  console.log("╔══════════════════════════════════════╗");
  console.log("║    BSC DApp 测试辅助脚本              ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`执行步骤: ${step}`);

  switch (step) {
    case "transfer":
      await transferTokens();
      break;
    case "settle":
      await fastForwardAndSettle();
      break;
    case "query":
      await queryStatus();
      break;
    case "blacklist":
      await testBlacklist();
      break;
    case "pause":
      await testPause();
      break;
    case "all":
    default:
      await transferTokens();
      await queryStatus();
      console.log("\n💡 提示: 执行以下命令可以单独运行各步骤:");
      console.log("  STEP=transfer  npx hardhat run scripts/test-helper.js --network localhost");
      console.log("  STEP=settle    npx hardhat run scripts/test-helper.js --network localhost");
      console.log("  STEP=query     npx hardhat run scripts/test-helper.js --network localhost");
      console.log("  STEP=blacklist npx hardhat run scripts/test-helper.js --network localhost");
      console.log("  STEP=pause     npx hardhat run scripts/test-helper.js --network localhost");
      break;
  }

  console.log("\n✅ 完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
