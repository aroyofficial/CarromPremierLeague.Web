const decode = (value) => {
	const padded = String(value).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
	const bytes = new Uint8Array(raw.length);
	for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
	return bytes.buffer;
};

const encode = (buffer) => {
	const bytes = new Uint8Array(buffer);
	let raw = "";
	for (const byte of bytes) raw += String.fromCharCode(byte);
	return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const publicKeyRequest = (options) => {
	const request = { ...options, challenge: decode(options.challenge) };
	if (options.allowCredentials) {
		request.allowCredentials = options.allowCredentials.map((item) => ({ ...item, id: decode(item.id) }));
	}
	if (options.excludeCredentials) {
		request.excludeCredentials = options.excludeCredentials.map((item) => ({ ...item, id: decode(item.id) }));
	}
	if (options.user) request.user = { ...options.user, id: decode(options.user.id) };
	return request;
};

export const createPasskey = async (options) => {
	const credential = await navigator.credentials.create({ publicKey: publicKeyRequest(options) });
	return {
		id: credential.id,
		rawId: encode(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: encode(credential.response.clientDataJSON),
			attestationObject: encode(credential.response.attestationObject),
			transports: credential.response.getTransports?.() || [],
		},
		clientExtensionResults: credential.getClientExtensionResults?.() || {},
	};
};

export const usePasskey = async (options) => {
	const credential = await navigator.credentials.get({ publicKey: publicKeyRequest(options) });
	return {
		id: credential.id,
		rawId: encode(credential.rawId),
		type: credential.type,
		response: {
			clientDataJSON: encode(credential.response.clientDataJSON),
			authenticatorData: encode(credential.response.authenticatorData),
			signature: encode(credential.response.signature),
			userHandle: credential.response.userHandle ? encode(credential.response.userHandle) : null,
		},
		clientExtensionResults: credential.getClientExtensionResults?.() || {},
	};
};

export const webauthnCodec = { encode, decode };
