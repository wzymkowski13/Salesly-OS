import { fromZonedTime } from "date-fns-tz";

export const APP_TIME_ZONE = "Europe/Warsaw";

export function todayInWarsaw() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateKeyInWarsaw(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function warsawLocalToUtc(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, APP_TIME_ZONE);
}

export function warsawDayRange(date: string) {
  return {
    start: warsawLocalToUtc(date, "00:00").toISOString(),
    end: warsawLocalToUtc(date, "23:59").toISOString(),
  };
}
