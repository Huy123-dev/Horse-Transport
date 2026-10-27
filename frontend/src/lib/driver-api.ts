import { ApiError, apiGet, apiPost } from "@/lib/api-client";

export interface DriverTransportPlan {
  planId: string;
  requestId: string;
  routeDetails: string | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
  coordinatorId: string | null;
  coordinatorName: string | null;
  horseIds: string[];
  horses: Array<{
    horseId: string;
    name: string;
    microchipId: string;
    imageUrl: string | null;
  }>;
}

export interface DriverRouteStop {
  stopId: string;
  planId: string;
  sequenceNo: number;
  locationId: string | null;
  locationName: string | null;
  countryCode: string | null;
  stopName: string;
  stopType: string;
  plannedArrivalTime: string | null;
  plannedDepartureTime: string | null;
  actualArrivalTime: string | null;
  actualDepartureTime: string | null;
  notes: string | null;
}

export interface DriverHealthLog {
  logId: string;
  planId: string;
  horseId: string;
  horseName: string | null;
  stressLevel: number | null;
  heartRate: number | null;
  temperature: number | null;
  appetiteStatus: string | null;
  notes: string | null;
  photoUrl: string | null;
  loggedAt: string;
  loggedBy: string;
  loggedByName: string | null;
}

export interface DriverIncident {
  incidentId: string;
  planId: string;
  category: string;
  description: string;
  sos: boolean;
  latitude: number | null;
  longitude: number | null;
  status: string;
  additionalCost: number | null;
  costApproved: boolean;
  costApprovedBy: string | null;
  costApprovedByName: string | null;
  reportedAt: string;
}

export interface DriverTrackingLog {
  logId: string;
  planId: string;
  milestone: string | null;
  latitude: number;
  longitude: number;
  reportedAt: string;
  reportedBy: string;
  reportedByName: string | null;
}

export interface DriverDelivery {
  deliveryId: string;
  planId: string;
  recipientName: string;
  signatureImageUrl: string;
  deliveredAt: string;
  podDocumentUrl: string | null;
}

export const getDriverPlans = () => apiGet<DriverTransportPlan[]>("/transport-plans");

export const getDriverPlan = (planId: string) =>
  apiGet<DriverTransportPlan>(`/transport-plans/${planId}`);

export const getDriverPlanStops = (planId: string) =>
  apiGet<DriverRouteStop[]>(`/transport-plans/${planId}/stops`);

export const getDriverPlanHealthLogs = (planId: string) =>
  apiGet<DriverHealthLog[]>(`/transport-plans/${planId}/health-logs`);

export const getDriverPlanIncidents = (planId: string) =>
  apiGet<DriverIncident[]>(`/transport-plans/${planId}/incidents`);

export const getDriverPlanTracking = (planId: string) =>
  apiGet<DriverTrackingLog[]>(`/transport-plans/${planId}/tracking`);

export async function getDriverPlanDelivery(planId: string): Promise<DriverDelivery | null> {
  try {
    return await apiGet<DriverDelivery>(`/transport-plans/${planId}/delivery`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const createDriverHealthLog = (payload: {
  planId: string;
  horseId: string;
  stressLevel: number | null;
  heartRate: number | null;
  temperature: number | null;
  appetiteStatus: string | null;
  notes: string | null;
}) => apiPost<DriverHealthLog>("/health-logs", payload);

export const createDriverIncident = (payload: {
  planId: string;
  category: string;
  description: string;
  sos: boolean;
  latitude: number | null;
  longitude: number | null;
  additionalCost: number | null;
}) => apiPost<DriverIncident>("/incidents", payload);

export const createDriverTrackingLog = (payload: {
  planId: string;
  milestone: string | null;
  latitude: number;
  longitude: number;
}) => apiPost<DriverTrackingLog>("/tracking", payload);

export const createDriverDelivery = (payload: {
  planId: string;
  recipientName: string;
  signatureImageUrl: string;
  podDocumentUrl: string | null;
}) => apiPost<DriverDelivery>("/deliveries", payload);
