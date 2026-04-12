const { ethers } = require("ethers");

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const AGENT_ID = 1492;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC = "https://rpc.testnet.arc.network";

const ABI = [
  "function setAgentURI(uint256 agentId, string calldata agentURI) external",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

const newRegistration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Flowra",
  description: "Flowra is an autonomous payment escrow agent on Arc Network. She verifies proof of work submissions, validates GPS locations, and releases USDC streams based on real-world conditions.",
  image: "https://agentflowra.xyz/icon.svg",
  agent_type: "escrow_verification",
  capabilities: [
    "proof_of_work_verification",
    "location_validation",
    "payment_stream_arbitration",
    "usdc_escrow_management"
  ],
  services: [
    { name: "web", endpoint: "https://agentflowra.xyz" },
    { name: "api", endpoint: "https://flowra-production-2f3c.up.railway.app" }
  ],
  version: "1.0.0",
  platform: "https://agentflowra.xyz"
};

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);

  console.log("Wallet:", wallet.address);
  console.log("Owner of Agent 1492:", await registry.ownerOf(AGENT_ID));

  const uri = "data:application/json;base64," + Buffer.from(JSON.stringify(newRegistration)).toString("base64");
  
  console.log("Updating agent URI...");
  const tx = await registry.setAgentURI(AGENT_ID, uri);
  console.log("TX hash:", tx.hash);
  await tx.wait();
  console.log("Done. Agent URI updated.");
}

main().catch(console.error);
