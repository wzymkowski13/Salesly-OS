import { UnifiedCalendarPage } from "@/components/unified-calendar-page";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  return <UnifiedCalendarPage searchParams={searchParams} basePath="/calendar" defaultScope="work"/>;
}
