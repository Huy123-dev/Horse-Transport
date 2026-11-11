import { apiGet } from "@/lib/api-client";

export type JourneyEventType = "TRACKING" | "HEALTH" | "INCIDENT";

export interface JourneyTimelineEntry {
  eventId: string;
  type: JourneyEventType;
  timestamp: string;
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  horseId: string | null;
  horseName: string | null;
  status: string | null;
  sos: boolean | null;
}

export const getJourneyTimeline = (planId: string) =>
  apiGet<JourneyTimelineEntry[]>(`/transport-plans/${planId}/timeline`);
