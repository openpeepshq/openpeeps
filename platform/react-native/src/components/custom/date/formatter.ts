export const dateFormatter = (dateSource: string | Date | number) => {
	const currentDate: Date = new Date();
	const inputDate: Date = dateSource instanceof Date ? dateSource : new Date(dateSource);
	const timeDiff: number = currentDate.getTime() - inputDate.getTime();

	if (timeDiff < -60 * 60 * 1000) {
		return `on ${inputDate.toLocaleDateString() + ' at ' + inputDate.toLocaleTimeString()}`;
	} else if (timeDiff < -60 * 1000) {
		const minutes: number = Math.abs(Math.floor(timeDiff / (60 * 1000)));
		return `in ${minutes} minutes `;
	} else if (timeDiff < 60 * 1000) {
		// If less than 1 minute, display as now
		return 'now';
	} else if (timeDiff < 60 * 60 * 1000) {
		// If less than 24 hours, display in hours or minutes ago format
		const minutes: number = Math.floor(timeDiff / (60 * 1000));
		return `${minutes}m ago`;
	} else {
		return inputDate.toLocaleDateString() + ' ' + inputDate.toLocaleTimeString();
	}
};
