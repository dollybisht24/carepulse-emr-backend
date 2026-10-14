/**
 * Date and Time utilities for dynamic slot generation and schedule math
 */

/**
 * Parses "HH:mm" string into minutes from midnight (0 - 1439)
 */
const timeStringToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Converts minutes from midnight into "HH:mm" string
 */
const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Checks if interval [slotStartMin, slotEndMin) overlaps [breakStartMin, breakEndMin)
 */
const doesSlotOverlapBreak = (slotStartMin, slotEndMin, breakStartMin, breakEndMin) => {
  return slotStartMin < breakEndMin && slotEndMin > breakStartMin;
};

/**
 * Constructs a Date object given a base YYYY-MM-DD date string and "HH:mm" time string.
 * Uses ISO date construction.
 */
const combineDateAndTime = (dateStr, timeStr) => {
  // dateStr can be "2026-10-15" or full ISO string
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [hours, minutes] = timeStr.split(':');
  // Construct date in UTC ISO standard: YYYY-MM-DDTHH:mm:00.000Z
  return new Date(`${cleanDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`);
};

/**
 * Gets day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 */
const getDayOfWeek = (dateInput) => {
  const d = new Date(dateInput);
  return d.getUTCDay();
};

/**
 * Checks if a given Date timestamp is in the past
 */
const isPastTime = (targetDate, now = new Date()) => {
  return new Date(targetDate).getTime() < now.getTime();
};

module.exports = {
  timeStringToMinutes,
  minutesToTimeString,
  doesSlotOverlapBreak,
  combineDateAndTime,
  getDayOfWeek,
  isPastTime,
};
