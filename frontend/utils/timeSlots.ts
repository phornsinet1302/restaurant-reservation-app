// Parses "10:00am", "10:00AM", "10AM", "9:30pm" → total minutes since midnight
function parseTimeToMinutes(t: string): number {
  const match = t.trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2] || '0', 10);
  const period = match[3].toLowerCase();
  if (period === 'pm' && h !== 12) h += 12;
  if (period === 'am' && h === 12) h = 0;
  return h * 60 + m;
}

// Formats total minutes → "9:00am", "12:30pm", "7:00pm"
function formatMinutesToTime(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'pm' : 'am';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return m === 0
    ? `${h}:00${period}`
    : `${h}:${String(m).padStart(2, '0')}${period}`;
}

/**
 * Generates 30-minute time slots between a restaurant's opening and closing hours.
 * Returns an empty array if the hours cannot be parsed.
 *
 * @param opening - e.g. "10:00am", "10:00AM"
 * @param closing - e.g. "11:00pm", "11:00PM"
 * @param intervalMins - slot interval in minutes (default 30)
 */
export function generateTimeSlots(
  opening: string,
  closing: string,
  intervalMins = 30,
): string[] {
  if (!opening || !closing) return [];
  const start = parseTimeToMinutes(opening);
  const end = parseTimeToMinutes(closing);
  if (start < 0 || end < 0 || start >= end) return [];

  const slots: string[] = [];
  for (let t = start; t < end; t += intervalMins) {
    slots.push(formatMinutesToTime(t));
  }
  return slots;
}
