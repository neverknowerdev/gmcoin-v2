import { getCreate3Addresses } from "./utils/create3";

async function main() {
    const factoryAddress = process.env.CREATE3_FACTORY_ADDRESS;
    const salt = process.env.CREATE3_SALT;

    if (!factoryAddress) {
        throw new Error("CREATE3_FACTORY_ADDRESS environment variable is required");
    }

    if (!salt) {
        throw new Error("CREATE3_SALT environment variable is required");
    }

    console.log("CREATE3 Factory Address:", factoryAddress);
    console.log("Salt:", salt);

    const addresses = getCreate3Addresses(factoryAddress, salt);

    console.log("\n=== CREATE3 Addresses ===");
    console.log("Proxy Address:", addresses.proxy);
    console.log("Deployed Address:", addresses.deployed);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

