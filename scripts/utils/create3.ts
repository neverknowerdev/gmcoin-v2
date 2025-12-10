import {
    BytesLike,
    getAddress,
    getCreate2Address,
    getCreateAddress,
    hexlify,
    isHexString,
    keccak256,
    toBeHex,
    toUtf8Bytes,
    zeroPadValue,
} from "ethers";

export type SaltInput = string | BytesLike | bigint | number;

export const CREATE3_PROXY_INITCODE =
    "0x67363d3d37363d34f03d5260086018f3" as const;

export const CREATE3_PROXY_INITCODE_HASH =
    "0x21c35dbe1b344a2488cf3321d6ce542f8e9f305544ff09e4993a62319a497c1f" as const;

/**
 * Normalizes any salt-like input (string / number / hex) into a bytes32 hex string.
 * - If the input is already a 32-byte hex string, it is returned as-is.
 * - If the input is any other hex string, it is zero-padded to 32 bytes.
 * - If the input is a plain string, its UTF-8 bytes are keccak256 hashed.
 * - If the input is a number / bigint, it is transformed into hex and padded.
 */
export function normalizeSalt(input: SaltInput): string {
    if (typeof input === "string") {
        if (isHexString(input, 32)) {
            return input;
        }
        if (isHexString(input)) {
            return zeroPadValue(input, 32);
        }
        return keccak256(toUtf8Bytes(input));
    }

    if (typeof input === "number") {
        if (!Number.isSafeInteger(input) || input < 0) {
            throw new Error("Salt numbers must be safe, non-negative integers");
        }
        return zeroPadValue(toBeHex(BigInt(input)), 32);
    }

    if (typeof input === "bigint") {
        if (input < 0) {
            throw new Error("Salt bigint must be non-negative");
        }
        return zeroPadValue(toBeHex(input), 32);
    }

    return zeroPadValue(hexlify(input as BytesLike), 32);
}

/**
 * Computes the intermediate CREATE2 proxy address used by CREATE3.
 */
export function predictCreate3ProxyAddress(
    factoryAddress: string,
    salt: SaltInput
): string {
    return getCreate2Address(
        getAddress(factoryAddress),
        normalizeSalt(salt),
        CREATE3_PROXY_INITCODE_HASH
    );
}

/**
 * Computes the final CREATE3 deterministic deployment address produced for a salt.
 */
export function predictCreate3DeployedAddress(
    factoryAddress: string,
    salt: SaltInput
): string {
    const proxyAddress = predictCreate3ProxyAddress(factoryAddress, salt);
    return getCreateAddress({
        from: proxyAddress,
        nonce: 1,
    });
}

/**
 * Utility helper returning both proxy and final deployed addresses.
 */
export function getCreate3Addresses(
    factoryAddress: string,
    salt: SaltInput
): {
    proxy: string;
    deployed: string;
} {
    const proxy = predictCreate3ProxyAddress(factoryAddress, salt);
    const deployed = getCreateAddress({
        from: proxy,
        nonce: 1,
    });
    return { proxy, deployed };
}


