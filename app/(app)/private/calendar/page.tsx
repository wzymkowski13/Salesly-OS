import { UnifiedCalendarPage } from "@/components/unified-calendar-page";

export default async function PrivateCalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  return <UnifiedCalendarPage searchParams={searchParams} basePath="/private/calendar" defaultScope="private"/>;
}
