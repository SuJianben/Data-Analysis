const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

const shanghaiDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function dateTimeParts(date: Date): DateTimeParts {
  return shanghaiDateTimeFormatter.formatToParts(date).reduce<DateTimeParts>((parts, part) => {
    if (part.type !== "literal") parts[part.type as keyof DateTimeParts] = part.value;
    return parts;
  }, { year: "", month: "", day: "", hour: "", minute: "", second: "" });
}

function parsedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShanghaiDateTime(value: string) {
  const date = parsedDate(value);
  if (!date) return value;
  const parts = dateTimeParts(date);
  return `${parts.year}/${Number(parts.month)}/${Number(parts.day)} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatShanghaiMonthDayTime(value: string) {
  const date = parsedDate(value);
  if (!date) return value;
  const parts = dateTimeParts(date);
  return `${Number(parts.month)}/${Number(parts.day)} ${parts.hour}:${parts.minute}:${parts.second}`;
}
