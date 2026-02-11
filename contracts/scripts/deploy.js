const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 配置地址（部署前需修改为实际地址）
  const rewardPoolAddress = process.env.REWARD_POOL_ADDRESS || deployer.address;
  const marketingPoolAddress = process.env.MARKETING_POOL_ADDRESS || deployer.address;
  const initialHolderAddress = process.env.INITIAL_HOLDER_ADDRESS || deployer.address;

  // 1. 部署 VideToken
  console.log("\n--- Deploying VideToken ---");
  const VideToken = await ethers.getContractFactory("VideToken");
  const token = await VideToken.deploy(
    "SEESHOW",          // name
    "SEESHOW",          // symbol
    rewardPoolAddress,
    marketingPoolAddress,
    initialHolderAddress
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("VideToken deployed to:", tokenAddress);

  // 2. 部署 VideoInteraction
  console.log("\n--- Deploying VideoInteraction ---");
  const VideoInteraction = await ethers.getContractFactory("VideoInteraction");
  const interaction = await VideoInteraction.deploy(tokenAddress);
  await interaction.waitForDeployment();
  const interactionAddress = await interaction.getAddress();
  console.log("VideoInteraction deployed to:", interactionAddress);

  // 3. 配置：将 VideoInteraction 地址设置到 VideToken
  console.log("\n--- Configuring contracts ---");
  const tx = await token.setVideoContract(interactionAddress);
  await tx.wait();
  console.log("VideoContract set on VideToken");

  // 打印部署信息汇总
  console.log("\n========== Deployment Summary ==========");
  console.log("VideToken:        ", tokenAddress);
  console.log("VideoInteraction: ", interactionAddress);
  console.log("RewardPool:       ", rewardPoolAddress);
  console.log("MarketingPool:    ", marketingPoolAddress);
  console.log("InitialHolder:    ", initialHolderAddress);
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
