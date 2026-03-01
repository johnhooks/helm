export interface Clock {
	now: () => number;
	advance: (seconds: number) => number;
	advanceTo: (t: number) => number;
}

export function createClock(start = 0): Clock {
	let time = start;

	return {
		now: () => time,
		advance(seconds) {
			time += seconds;
			return time;
		},
		advanceTo(t) {
			time = t;
			return time;
		},
	};
}
