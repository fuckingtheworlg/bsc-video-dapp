# BSC DApp - 代币经济 + 视频互动

基于 BSC 链的去中心化应用，围绕代币经济和视频互动构建。

## 项目结构

```
├── contracts/          # Hardhat 智能合约项目
│   ├── contracts/      # Solidity 合约源码
│   ├── scripts/        # 部署脚本
│   └── test/           # 合约测试（74个测试用例）
├── backend/            # Node.js API 服务
│   └── src/
│       ├── routes/     # Express 路由（upload, cover, moderation, health）
│       ├── services/   # 业务服务（pinata, ffmpeg, settler）
│       ├── middleware/  # 中间件（签名验证）
│       └── utils/      # 工具（logger）
└── subgraph/           # The Graph 子图（链上数据索引）
    └── src/            # 事件处理映射
```

## 智能合约

### VideToken.sol
- ERC20 代币，总供应量 10 亿枚
- 3% 交易手续费自动拆分（80% 奖励池 + 20% 营销池）
- 燃烧上传许可机制（可调参数，初始 50,000 枚）
- 持仓追踪、钻石机制、冷却期
- 持仓加成计算（每日 UTC 16:00 重置）
- 黑名单、暂停功能

### VideoInteraction.sol
- 视频注册（IPFS CID 上链）
- 点赞功能（消耗代币 + 限一次）
- 45 分钟轮次排名系统
- 奖励分发（25%/15%/10%/5%/5% + 40% 滚存）
- Claim 模式领取奖励
- 滚存动态平衡

## 快速开始

### 合约

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### 后端

```bash
cd backend
npm install
cp .env.example .env  # 填写配置
npm run dev
```

### 子图

```bash
cd subgraph
npm install
npm run codegen
npm run build
```

## 环境变量

### 合约部署
- `PRIVATE_KEY` — 部署者钱包私钥
- `BSCSCAN_API_KEY` — BscScan API Key（合约验证）

### 后端服务
- `PINATA_JWT` — Pinata IPFS JWT Token
- `PINATA_GATEWAY` — Pinata 网关域名
- `BSC_RPC_URL` — BSC 主网 RPC
- `TOKEN_CONTRACT_ADDRESS` — VideToken 合约地址
- `VIDEO_CONTRACT_ADDRESS` — VideoInteraction 合约地址
- `SETTLER_PRIVATE_KEY` — 结算者钱包私钥（Cron 备选）

## API 端点

| Method | Path | Auth | 功能 |
|--------|------|------|------|
| POST | `/api/upload/video` | ✅ | 上传视频至 IPFS |
| POST | `/api/upload/cover` | ✅ | 上传封面至 IPFS |
| POST | `/api/cover/generate` | ✅ | 从视频提取封面 |
| GET | `/api/moderation/blocklist` | ❌ | 获取屏蔽列表 |
| POST | `/api/moderation/report` | ✅ | 举报视频 |
| POST | `/api/moderation/block` | ✅ | 管理员屏蔽/解除 |
| GET | `/api/health` | ❌ | 健康检查 |

## 部署流程

1. 部署 VideToken 合约
2. 部署 VideoInteraction 合约
3. 调用 `token.setVideoContract(interactionAddress)`
4. 向 VideoInteraction 合约转入奖励池代币
5. 更新后端 `.env` 中的合约地址
6. 更新子图 `subgraph.yaml` 中的合约地址和起始区块
7. 部署子图到 The Graph
8. 启动后端服务
