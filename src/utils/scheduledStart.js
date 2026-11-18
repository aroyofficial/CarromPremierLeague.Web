export const startBlockedUntilScheduledDay = ({ enabled, scheduledDate, today }) => {
	if (!enabled) return false;
	const scheduled = String(scheduledDate || "").slice(0, 10);
	const current = String(today || "").slice(0, 10);
	return !scheduled || !current || scheduled !== current;
};
