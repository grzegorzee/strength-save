export const MAX_HR_MIN = 100;
export const MAX_HR_MAX = 230;

/**
 * Validate a user-supplied max heart rate. Returns the value as an integer,
 * or null when it is not an integer within the physiological 100-230 range.
 */
export function parseMaxHR(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isInteger(input)) {
    return null;
  }
  if (input < MAX_HR_MIN || input > MAX_HR_MAX) {
    return null;
  }
  return input;
}
