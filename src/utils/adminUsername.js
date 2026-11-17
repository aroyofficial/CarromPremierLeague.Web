/**
 * The username a new admin will get, before the server checks whether it is already taken.
 * Keep this in step with core/admin_usernames.py. The server adds the mailbox name or a
 * number when the first choice is taken, and that choice cannot be edited afterwards.
 */

const piece = (value) =>
	String(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9_.-]+/g, "")
		.replace(/^[._-]+|[._-]+$/g, "")
		.slice(0, 40);

const accept = (stem, seen, ordered) => {
	let text = String(stem || "").replace(/^[._-]+|[._-]+$/g, "");
	if (text.length > 100) text = text.slice(0, 100).replace(/^[._-]+|[._-]+$/g, "");
	if (!/^[a-z0-9_.-]{3,100}$/.test(text) || seen.has(text)) return;
	seen.add(text);
	ordered.push(text);
};

export const usernameCandidates = (firstName, lastName, email) => {
	const first = piece(firstName);
	const last = piece(lastName);
	const mailbox = String(email || "").split("@")[0];
	const local = email && String(email).includes("@") ? piece(mailbox) : "";
	const stems = [];
	if (first && last) {
		stems.push(`${first}.${last}`);
		if (local) stems.push(`${first}.${last}.${local}`);
	} else if (first && local) {
		stems.push(`${first}.${local}`);
		if (first.length >= 3) stems.push(first);
		stems.push(local);
	} else if (last && local) {
		stems.push(`${last}.${local}`);
		if (last.length >= 3) stems.push(last);
		stems.push(local);
	} else if (first) {
		stems.push(first);
	} else if (last) {
		stems.push(last);
	} else if (local) {
		stems.push(local);
	}
	const seen = new Set();
	const ordered = [];
	stems.forEach((stem) => accept(stem, seen, ordered));
	if (!ordered.length) return [];
	const preferred = ordered[0];
	for (let number = 2; number < 100; number += 1) {
		const suffix = String(number);
		const base = preferred.slice(0, 100 - suffix.length).replace(/^[._-]+|[._-]+$/g, "");
		accept(`${base}${suffix}`, seen, ordered);
	}
	return ordered;
};

export const suggestUsername = (firstName, lastName, email) => usernameCandidates(firstName, lastName, email)[0] || "";
