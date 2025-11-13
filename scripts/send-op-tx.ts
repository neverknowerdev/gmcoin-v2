import { ethers } from "hardhat";

async function main() {
  console.log("Sending transaction");

const [sender] = await ethers.getSigners();

console.log("Sending 1 wei from", sender.address, "to itself");

console.log("Sending L2 transaction");
const tx = await sender.sendTransaction({
  to: sender.address,
  value: 1n,
});

await tx.wait();

  console.log("Transaction sent successfully");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
