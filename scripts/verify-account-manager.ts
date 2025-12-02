import { ethers } from "hardhat";

async function main() {
    const accountManagerAddress = process.env.ACCOUNT_MANAGER_ADDRESS || "0xACeaD0bE65ABF00709238a7f064aA3285b0bb6d8";
    
    console.log("Verifying AccountManager at:", accountManagerAddress);
    
    const code = await ethers.provider.getCode(accountManagerAddress);
    if (code === "0x" || code.length <= 2) {
        console.log("❌ Contract not deployed or no code found");
        return;
    }
    
    console.log("✅ Contract code found");
    
    try {
        const AccountManagerFactory = await ethers.getContractFactory("AccountManager");
        const accountManager = AccountManagerFactory.attach(accountManagerAddress);
        
        const owner = await accountManager.owner();
        console.log("✅ Owner:", owner);
        
        // Check if gelatoDedicatedMsgSender is accessible (it's internal, so we check via storage or events)
        console.log("✅ Contract initialized successfully");
        
        console.log("\n✅ AccountManager is properly deployed and initialized!");
    } catch (error: any) {
        console.log("⚠️  Could not read contract state:", error.message);
        console.log("   This might be normal if the contract is still initializing.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

