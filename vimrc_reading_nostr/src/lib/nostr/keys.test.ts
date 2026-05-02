import { describe, expect, it } from "vitest";
import {
	generateKeyPair,
	nsecToSecretKey,
	publicKeyToNpub,
	secretKeyToNsec,
} from "./keys";

describe("generateKeyPair", () => {
	it("秘密鍵と公開鍵のペアを生成する", () => {
		const keyPair = generateKeyPair();
		expect(keyPair.secretKey).toBeInstanceOf(Uint8Array);
		expect(keyPair.secretKey.length).toBe(32);
		expect(keyPair.publicKey).toBeTypeOf("string");
		expect(keyPair.publicKey.length).toBe(64);
	});

	it("生成するたびに異なる鍵ペアになる", () => {
		const keyPair1 = generateKeyPair();
		const keyPair2 = generateKeyPair();
		expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
	});
});

describe("publicKeyToNpub", () => {
	it("公開鍵をnpub形式にエンコードする", () => {
		const { publicKey } = generateKeyPair();
		const npub = publicKeyToNpub(publicKey);
		expect(npub).toMatch(/^npub1/);
	});
});

describe("secretKeyToNsec", () => {
	it("秘密鍵をnsec形式にエンコードする", () => {
		const { secretKey } = generateKeyPair();
		const nsec = secretKeyToNsec(secretKey);
		expect(nsec).toMatch(/^nsec1/);
	});
});

describe("nsecToSecretKey", () => {
	it("nsec文字列を秘密鍵に変換する", () => {
		const { secretKey } = generateKeyPair();
		const nsec = secretKeyToNsec(secretKey);
		const restored = nsecToSecretKey(nsec);
		expect(restored).toEqual(secretKey);
	});

	it("不正なnsecを渡すとnullを返す", () => {
		const result = nsecToSecretKey("invalid-nsec");
		expect(result).toBeNull();
	});
});
