const request = require("supertest");
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Set test env before importing app
process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "*";
process.env.ADMIN_WALLETS = "";

const app = require("../src/index");
const { clearCleanupInterval } = require("../src/middleware/auth");

// Generate a test wallet for signing
const testWallet = ethers.Wallet.createRandom();
let authCounter = 0;

async function getAuthHeaders() {
  const timestamp = Math.floor(Date.now() / 1000);
  // Append counter to ensure unique message/signature per call (even within same second)
  const message = `BSC-DApp-Auth:${timestamp}:${authCounter++}`;
  const signature = await testWallet.signMessage(message);
  return {
    "X-Wallet-Address": testWallet.address,
    "X-Signature": signature,
    "X-Message": message,
  };
}

describe("Health Endpoint", () => {
  it("GET /api/health should return status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime).toBeDefined();
    expect(res.body.services).toBeDefined();
  });
});

describe("Auth Middleware", () => {
  it("should reject requests without auth headers", async () => {
    const res = await request(app).post("/api/moderation/report").send({ cid: "test" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing authentication headers");
  });

  it("should reject requests with invalid signature", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `BSC-DApp-Auth:${timestamp}`;
    const res = await request(app)
      .post("/api/moderation/report")
      .set("X-Wallet-Address", "0x0000000000000000000000000000000000000001")
      .set("X-Signature", "0xinvalid")
      .set("X-Message", message)
      .send({ cid: "test" });
    expect(res.status).toBe(401);
  });

  it("should reject expired signatures", async () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const message = `BSC-DApp-Auth:${oldTimestamp}`;
    const signature = await testWallet.signMessage(message);
    const res = await request(app)
      .post("/api/moderation/report")
      .set("X-Wallet-Address", testWallet.address)
      .set("X-Signature", signature)
      .set("X-Message", message)
      .send({ cid: "test" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Signature expired");
  });

  it("should accept valid signature", async () => {
    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/report")
      .set(headers)
      .send({ cid: "testCid123", reason: "test" });
    // Should get 200 (successful report), not 401
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject replayed signature (F8 fix)", async () => {
    const headers = await getAuthHeaders();
    // First request - should succeed
    const res1 = await request(app)
      .post("/api/moderation/report")
      .set(headers)
      .send({ cid: "replayCid", reason: "test" });
    expect(res1.status).toBe(200);

    // Second request with SAME signature - should be rejected
    const res2 = await request(app)
      .post("/api/moderation/report")
      .set(headers)
      .send({ cid: "replayCid2", reason: "test" });
    expect(res2.status).toBe(401);
    expect(res2.body.error).toBe("Signature already used");
  });
});

describe("Moderation Endpoints", () => {
  it("GET /api/moderation/blocklist should return array", async () => {
    const res = await request(app).get("/api/moderation/blocklist");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blocklist)).toBe(true);
  });

  it("POST /api/moderation/report should require CID", async () => {
    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/report")
      .set(headers)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("CID is required");
  });

  it("POST /api/moderation/report should succeed with valid CID", async () => {
    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/report")
      .set(headers)
      .send({ cid: "QmValidCID_report_test", reason: "inappropriate" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reportCount).toBe(1);
  });

  it("POST /api/moderation/report should prevent duplicate report from same wallet", async () => {
    const headers1 = await getAuthHeaders();
    await request(app)
      .post("/api/moderation/report")
      .set(headers1)
      .send({ cid: "QmDupReport", reason: "test" });

    // Same wallet, new signature (different timestamp)
    const headers2 = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/report")
      .set(headers2)
      .send({ cid: "QmDupReport", reason: "test again" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("You have already reported this video");
  });

  it("POST /api/moderation/block should reject without ADMIN_WALLETS configured (F3 fix)", async () => {
    // ADMIN_WALLETS is empty in test env
    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/block")
      .set(headers)
      .send({ cid: "QmBlockTest", block: true });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Admin wallets not configured");
  });

  it("POST /api/moderation/block should reject non-admin wallet (F3 fix)", async () => {
    // Set ADMIN_WALLETS to a different address
    const originalAdmins = process.env.ADMIN_WALLETS;
    process.env.ADMIN_WALLETS = "0x0000000000000000000000000000000000000099";

    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/block")
      .set(headers)
      .send({ cid: "QmBlockTest2", block: true });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not authorized");

    process.env.ADMIN_WALLETS = originalAdmins;
  });

  it("POST /api/moderation/block should allow admin wallet (F3 fix)", async () => {
    // Set ADMIN_WALLETS to include our test wallet
    const originalAdmins = process.env.ADMIN_WALLETS;
    process.env.ADMIN_WALLETS = testWallet.address;

    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/moderation/block")
      .set(headers)
      .send({ cid: "QmBlockTest3", block: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    process.env.ADMIN_WALLETS = originalAdmins;
  });
});

describe("Upload Endpoints", () => {
  it("POST /api/upload/video should reject without auth", async () => {
    const res = await request(app).post("/api/upload/video");
    expect(res.status).toBe(401);
  });

  it("POST /api/upload/video should reject without file", async () => {
    const headers = await getAuthHeaders();
    const res = await request(app)
      .post("/api/upload/video")
      .set(headers);
    expect(res.status).toBe(400);
  });
});

// Cleanup test data files and intervals after all tests
afterAll(() => {
  clearCleanupInterval();
  const dataDir = path.join(__dirname, "../data");
  const testFiles = ["blocklist.json", "reports.json"];
  for (const file of testFiles) {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
});
