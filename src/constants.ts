// Single source of truth for tunable defaults.
// Anything a user might reasonably want to change lives in settings;
// these are sensible internals.

export const STORAGE_KEYS = {
	dailyStats: 'aiFootprint.dailyStats.v2',
	streak: 'aiFootprint.streak.v2',
	cadenceBaselines: 'aiFootprint.cadenceBaselines.v2',
	nudgeHistory: 'aiFootprint.nudgeHistory.v2',
	snoozeUntil: 'aiFootprint.snoozeUntil.v2',
	onboarded: 'aiFootprint.onboarded.v1',
} as const;

export const CADENCE = {
	// Edits with more characters than this are treated as non-typing
	// (paste, snippet, autocomplete acceptance).
	maxCharsPerKeystroke: 2,
	// Pauses longer than this are excluded from the rhythm baseline.
	maxIntervalMs: 5_000,
	// Minimum samples before we'll claim a baseline is meaningful.
	minSamplesForBaseline: 40,
	// Rolling window of intervals kept per language.
	windowSize: 200,
	// Multiplier: current median must be this much faster than baseline
	// median to count as "suspiciously fast".
	fastMultiplier: 3,
} as const;

export const SCORING = {
	// Lines per point deducted from the daily score.
	linesPerPoint: 5,
	// Maximum daily deduction per single paste (bounds outliers).
	maxDeductionPerPaste: 25,
	startingScore: 100,
	// Streak: a "clean day" is one where score stayed >= this value.
	cleanDayThreshold: 80,
} as const;

export const NUDGE = {
	subtleLines: 5,
	warningLines: 15,
	strongLines: 30,
	snoozeMinutes: 30,
	statusBarMs: 8_000,
} as const;
