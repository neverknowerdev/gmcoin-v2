import { ethers } from "hardhat";

async function main() {

	const walletAddress = process.env.WALLET_ADDRESS?.toLowerCase();
	let factoryAddress = process.env.CREATE3_DEPLOYER_ADDRESS;

	const all = await ethers.getSigners();
	let signer: any;

	if (walletAddress) {
		signer = all.find((s) => s.address.toLowerCase() === walletAddress) ?? all[0];
		if (signer.address.toLowerCase() !== walletAddress) {
			console.log(`Warning: WALLET_ADDRESS ${walletAddress} not found, using first signer`);
		}
	} else {
		signer = all[0];
		console.log("No WALLET_ADDRESS provided, using first signer");
	}

	console.log("Using signer:", signer.address);

	const Create3DeployerFactory = await ethers.getContractFactory("Create3Deployer", signer);

	// Deploy Create3Deployer if address not provided
	if (!factoryAddress) {
		console.log("CREATE3_DEPLOYER_ADDRESS not provided, deploying Create3Deployer...");
		const create3Deployer = await Create3DeployerFactory.deploy();
		await create3Deployer.waitForDeployment();
		factoryAddress = await create3Deployer.getAddress();
		console.log("Create3Deployer deployed at:", factoryAddress);
	} else {
		console.log("Using existing Create3Deployer:", factoryAddress);
	}

	const create3 = Create3DeployerFactory.attach(factoryAddress).connect(signer);

	const startsWith = (addr: string, prefix: string) => {
		// const addrLower = addr.toLowerCase();
		// Remove "0x" from prefix if present, then check if address starts with "0x" + prefix
		return addr.startsWith("0x" + prefix);
	};
	const endsWith = (addr: string, suffix: string) => addr.toLowerCase().endsWith(suffix.toLowerCase());

	const progressEvery = Number(process.env.PROGRESS_EVERY ?? "1000");

	// Support both single PREFIX/SUFFIX and array of prefix-suffix pairs
	// For array: PREFIX_SUFFIX_PAIRS='[{"prefix":"abc","suffix":"123"},{"prefix":"def","suffix":"456"}]'
	const prefixSuffixPairsJson = process.env.PREFIX_SUFFIX_PAIRS;
	let searchTargets: Array<{ prefix?: string; suffix?: string; found?: boolean }> = [];

	if (prefixSuffixPairsJson) {
		try {
			searchTargets = JSON.parse(prefixSuffixPairsJson);
			if (!Array.isArray(searchTargets)) {
				throw new Error("PREFIX_SUFFIX_PAIRS must be a JSON array");
			}
		} catch (e) {
			throw new Error(`Invalid PREFIX_SUFFIX_PAIRS JSON: ${e}`);
		}
	} else {
		// Fallback to single PREFIX/SUFFIX for backward compatibility
		const prefix = process.env.PREFIX;
		const suffix = process.env.SUFFIX;
		if (!prefix && !suffix) {
			throw new Error("At least one of PREFIX or SUFFIX must be provided, or use PREFIX_SUFFIX_PAIRS");
		}
		searchTargets = [{ prefix, suffix, found: false }];
	}

	// Validate all targets have at least prefix or suffix
	for (const target of searchTargets) {
		if (!target.prefix && !target.suffix) {
			throw new Error("Each search target must have at least one of prefix or suffix");
		}
		target.found = false;
	}

	console.log("Search criteria:");
	searchTargets.forEach((target, idx) => {
		console.log(`  Target ${idx + 1}:`);
		if (target.prefix) console.log("    Prefix:", target.prefix);
		if (target.suffix) console.log("    Suffix:", target.suffix);
	});

	let startNumber = process.env.START_NUMBER ? BigInt(process.env.START_NUMBER) : 0n;
	let i = startNumber;
	console.log("Starting from:", i.toString());
	const totalTargets = searchTargets.length;
	let foundCount = 0;

	for (; ;) {
		const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);
		const predicted = await create3.getDeployedAddress(salt);

		// Check each target that hasn't been found yet
		for (let idx = 0; idx < searchTargets.length; idx++) {
			const target = searchTargets[idx];
			if (target.found) continue;

			const matchesPrefix = target.prefix ? startsWith(predicted, target.prefix) : true;
			const matchesSuffix = target.suffix ? endsWith(predicted, target.suffix) : true;

			if (matchesPrefix && matchesSuffix) {
				target.found = true;
				foundCount++;
				console.log(`\n✓ Found target ${idx + 1}!`);
				console.log("  Salt:", salt);
				console.log("  Predicted:", predicted);
				console.log("  Iterations:", i.toString());
				console.log(`  Progress: ${foundCount}/${totalTargets} found\n`);

				// If all targets found, exit
				if (foundCount === totalTargets) {
					console.log("All targets found! Exiting...");
					break;
				}
			}
		}

		// Exit if all found
		if (foundCount === totalTargets) {
			break;
		}

		if (progressEvery > 0 && i % BigInt(progressEvery) === 0n) {
			console.log(`Checked: ${i.toString()} | Found: ${foundCount}/${totalTargets} | Current: ${predicted}`);
		}
		i += 1n;
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});


