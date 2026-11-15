// Look-alike characters (0/O, 1/l/I) are left out so a generated password can be read back or typed by hand.
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

export const GENERATED_LENGTH = 20;

const cryptoSource = (size) => crypto.getRandomValues(new Uint32Array(size));

// Rejection sampling keeps every character equally likely.
function pick(alphabet, random) {
	const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length;
	for (;;) {
		const [value] = random(1);
		if (value < limit) return alphabet[value % alphabet.length];
	}
}

function randomIndex(size, random) {
	const limit = Math.floor(0x100000000 / size) * size;
	for (;;) {
		const [value] = random(1);
		if (value < limit) return value % size;
	}
}

export function generatePassword(length = GENERATED_LENGTH, random = cryptoSource) {
	const size = Math.max(length, 12);
	const chars = [pick(LOWER, random), pick(UPPER, random), pick(DIGITS, random), pick(SYMBOLS, random)];
	while (chars.length < size) chars.push(pick(ALL, random));
	for (let index = chars.length - 1; index > 0; index -= 1) {
		const other = randomIndex(index + 1, random);
		[chars[index], chars[other]] = [chars[other], chars[index]];
	}
	return chars.join("");
}

export function canStoreCredential(scope = globalThis) {
	return typeof scope.PasswordCredential === "function" && typeof scope.navigator?.credentials?.store === "function";
}

// Chromium browsers show their own "Save password?" prompt from this call. Other browsers offer to save
// from the form itself, because the fields carry autocomplete="username" and "new-password".
export async function storeCredential(username, password, name = "", scope = globalThis) {
	if (!username || !password || !canStoreCredential(scope)) return "unsupported";
	try {
		const credential = new scope.PasswordCredential({ id: username, password, name: name || username });
		await scope.navigator.credentials.store(credential);
		return "stored";
	} catch {
		return "failed";
	}
}
