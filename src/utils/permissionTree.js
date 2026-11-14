// Helpers for the permission hierarchy sent by GET /permissions/tree:
// sections hold areas, areas hold permissions, and a child permission needs its parent.

export const emptyTree = () => ({ sections: [], roles: [] });

export const flattenTree = (tree) => {
	const items = [];
	(tree?.sections || []).forEach((section) => {
		section.areas.forEach((area) => {
			area.permissions.forEach((permission) => {
				items.push({
					...permission,
					area: area.name,
					areaCode: area.code,
					section: section.name,
					sectionCode: section.code,
				});
			});
		});
	});
	return items;
};

export const buildIndex = (tree) => {
	const items = flattenTree(tree);
	const byCode = new Map(items.map((item) => [item.code, item]));
	const children = new Map();
	items.forEach((item) => {
		if (!item.parent) return;
		if (!children.has(item.parent)) children.set(item.parent, []);
		children.get(item.parent).push(item.code);
	});
	return {
		items,
		order: items.map((item) => item.code),
		byCode,
		parentOf: (code) => byCode.get(code)?.parent || null,
		childrenOf: (code) => children.get(code) || [],
		nameOf: (code) => byCode.get(code)?.name || code,
	};
};

export const inOrder = (index, codes) => {
	const wanted = new Set(codes);
	return index.order.filter((code) => wanted.has(code));
};

// Adds missing parents, so a set read from anywhere satisfies the hierarchy.
export const withParents = (index, codes) => {
	const next = new Set(codes);
	codes.forEach((code) => {
		const parent = index.parentOf(code);
		if (parent) next.add(parent);
	});
	return next;
};

export const sameSet = (left, right) => {
	const a = new Set(left);
	const b = new Set(right);
	return a.size === b.size && [...a].every((code) => b.has(code));
};

export const matchingRole = (roles, codes) => (roles || []).find((role) => sameSet(role.permissions, codes)) || null;

export const accessLabel = (index, roles, codes) => {
	if (!index.order.length) return `${codes.length} permissions`;
	if (!codes.length) return "No permissions";
	if (codes.length === index.order.length) return "Full access";
	return matchingRole(roles, codes)?.name || "Custom access";
};
