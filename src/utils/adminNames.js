const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function fullName({ firstName, lastName, username } = {}) {
	const joined = [clean(firstName), clean(lastName)].filter(Boolean).join(" ");
	return joined || clean(username);
}

export function givenName({ firstName, username } = {}) {
	return clean(firstName) || clean(username);
}

export function initial(names = {}) {
	const name = fullName(names);
	return name ? name.charAt(0).toUpperCase() : "A";
}
