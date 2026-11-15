const TOKEN_KEY = "cpl_admin_token";
const USER_KEY = "cpl_admin_user";
const NAME_KEY = "cpl_admin_name";

const read = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);

export const authToken = {
	get: () => read(TOKEN_KEY),
	getUser: () => read(USER_KEY),
	getNames() {
		try {
			const names = JSON.parse(localStorage.getItem(NAME_KEY) || "{}");
			return { firstName: names.firstName || "", lastName: names.lastName || "" };
		} catch {
			return { firstName: "", lastName: "" };
		}
	},
	setNames(firstName, lastName) {
		localStorage.setItem(NAME_KEY, JSON.stringify({ firstName: firstName || "", lastName: lastName || "" }));
	},
	set(token, username) {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(USER_KEY, username);
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(USER_KEY);
	},
	clear() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		localStorage.removeItem(NAME_KEY);
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(USER_KEY);
	},
};
