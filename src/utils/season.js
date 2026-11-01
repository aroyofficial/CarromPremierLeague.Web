import dayjs from "@/plugins/dayjs";
import { LEAGUE_TIMEZONE } from "@/utils/constants";

const today = () => dayjs().tz(LEAGUE_TIMEZONE).startOf("day");

const asDate = (value) => (value ? dayjs.tz(value, LEAGUE_TIMEZONE).startOf("day") : null);

export const isSeasonUpcoming = (season) => {
	const start = asDate(season?.start_date);
	return Boolean(start && start.isAfter(today()));
};

export const isSeasonFinished = (season) => {
	const end = asDate(season?.end_date);
	return Boolean(end && end.isBefore(today()));
};

export const isSeasonOpen = (season) => Boolean(season?.start_date) && !isSeasonFinished(season);

export const seasonStartValue = (season) => asDate(season?.start_date)?.valueOf() ?? 0;
