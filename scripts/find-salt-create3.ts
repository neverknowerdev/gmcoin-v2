import {
	getAddress,
	toBeHex,
	zeroPadValue,
} from "ethers";
import { predictCreate3DeployedAddress } from "./utils/create3";

interface SearchTarget {
	prefix?: string;
	suffix?: string;
	exact?: string;
	found: boolean;
	label: string;
}

async function main() {
	const factoryAddressRaw = process.env.CREATE3_DEPLOYER_ADDRESS;
	if (!factoryAddressRaw) {
		throw new Error("CREATE3_DEPLOYER_ADDRESS env variable is required");
	}
	const factoryAddress = getAddress(factoryAddressRaw);

	const targets = buildTargetsFromEnv();
	const totalTargets = targets.length;
	const progressEvery = Number(process.env.PROGRESS_EVERY ?? "1000");
	const maxIterations = process.env.MAX_ITERATIONS
		? BigInt(process.env.MAX_ITERATIONS)
		: undefined;

	let current = process.env.START_NUMBER ? BigInt(process.env.START_NUMBER) : 0n;
	let foundCount = 0;

	console.log("Searching salts for factory:", factoryAddress);
	console.log("Targets:");
	for (const target of targets) {
		console.log(`  - ${target.label}`);
	}
	console.log(`Starting at nonce: ${current}`);

	while (maxIterations === undefined || current < maxIterations) {
		const salt = zeroPadValue(toBeHex(current), 32);
		const predicted = predictCreate3DeployedAddress(factoryAddress, salt);

		for (const target of targets) {
			if (target.found) continue;
			if (matchesTarget(predicted, target)) {
				target.found = true;
				foundCount++;
				console.log(`\n✓ Found ${target.label}`);
				console.log("  Salt:", salt);
				console.log("  Address:", predicted);
				console.log("  Iterations:", current.toString());
				break;
			}
		}

		if (foundCount === totalTargets) {
			console.log("\nAll targets found. Exiting.");
			return;
		}

		if (progressEvery > 0 && current % BigInt(progressEvery) === 0n) {
			console.log(
				`Checked ${current.toString()} salts | Found ${foundCount}/${totalTargets} | Last: ${predicted}`
			);
		}

		current += 1n;
	}

	console.log("\nFinished search without finding every target.");
}

function buildTargetsFromEnv(): SearchTarget[] {
	const targets: SearchTarget[] = [];

	const jsonAddresses = process.env.TARGET_ADDRESSES;
	const singleAddress = process.env.TARGET_ADDRESS;
	if (jsonAddresses || singleAddress) {
		const addresses = jsonAddresses
			? parseJsonArray(jsonAddresses, "TARGET_ADDRESSES")
			: [singleAddress as string];
		for (const addr of addresses) {
			const checksum = getAddress(addr);
			targets.push({
				exact: checksum.toLowerCase(),
				found: false,
				label: `exact ${checksum}`,
			});
		}
		return targets;
	}

	const pairsJson = process.env.PREFIX_SUFFIX_PAIRS;
	if (pairsJson) {
		const parsed = parseJsonArray(pairsJson, "PREFIX_SUFFIX_PAIRS");
		for (const [index, entry] of parsed.entries()) {
			if (!entry.prefix && !entry.suffix) {
				throw new Error(`Entry ${index} requires prefix or suffix`);
			}
			targets.push({
				prefix: sanitizeFragment(entry.prefix),
				suffix: sanitizeFragment(entry.suffix),
				found: false,
				label: `prefix=${entry.prefix ?? ""} suffix=${entry.suffix ?? ""}`,
			});
		}
		return targets;
	}

	const prefix = process.env.PREFIX;
	const suffix = process.env.SUFFIX;
	if (!prefix && !suffix) {
		throw new Error(
			"Provide TARGET_ADDRESS / TARGET_ADDRESSES or at least one of PREFIX/SUFFIX/PREFIX_SUFFIX_PAIRS"
		);
	}
	targets.push({
		prefix: sanitizeFragment(prefix),
		suffix: sanitizeFragment(suffix),
		found: false,
		label: `prefix=${prefix ?? ""} suffix=${suffix ?? ""}`,
	});
	return targets;
}

function matchesTarget(address: string, target: SearchTarget): boolean {
	const candidate = address.toLowerCase();
	const exactMatch = target.exact ? candidate === target.exact : true;
	const prefixMatch = target.prefix
		? candidate.startsWith("0x" + target.prefix)
		: true;
	const suffixMatch = target.suffix
		? candidate.endsWith(target.suffix)
		: true;
	return exactMatch && prefixMatch && suffixMatch;
}

function sanitizeFragment(value?: string): string | undefined {
	if (!value) return undefined;
	return value.replace(/^0x/, "").toLowerCase();
}

function parseJsonArray(raw: string, label: string): any[] {
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			throw new Error();
		}
		return parsed;
	} catch (err) {
		throw new Error(`Invalid ${label} JSON: ${err}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

