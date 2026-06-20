import { validateGhlConfig } from "./ghlConfigValidator";

const DEFAULT_GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

type GhlRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export type GhlApiResult<T = unknown> = {
  ok: boolean;
  previewMode: boolean;
  status: number;
  data?: T;
  error?: string;
  request: {
    method: string;
    path: string;
  };
};

type GhlContactPayload = Record<string, unknown> & {
  email?: string;
  locationId?: string;
};

type GhlOpportunityPayload = Record<string, unknown> & {
  contactId?: string;
  locationId?: string;
  pipelineId?: string;
};

function baseUrl() {
  return (process.env.GHL_BASE_URL || DEFAULT_GHL_BASE_URL).replace(/\/$/, "");
}

function buildUrl(path: string, query?: GhlRequestOptions["query"]) {
  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

function previewResponse<T>(path: string, method: string, data?: T): GhlApiResult<T> {
  return {
    ok: true,
    previewMode: true,
    status: 0,
    data,
    request: { method, path }
  };
}

function safeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "GoHighLevel API request failed.";
}

async function request<T>(path: string, options: GhlRequestOptions = {}): Promise<GhlApiResult<T>> {
  const config = validateGhlConfig();
  const method = options.method ?? "GET";

  if (config.isPreviewMode) {
    return previewResponse<T>(path, method);
  }

  try {
    const response = await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: GHL_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) as T : undefined;

    if (!response.ok) {
      return {
        ok: false,
        previewMode: false,
        status: response.status,
        data,
        error: `GoHighLevel API returned ${response.status}.`,
        request: { method, path }
      };
    }

    return {
      ok: true,
      previewMode: false,
      status: response.status,
      data,
      request: { method, path }
    };
  } catch (error) {
    return {
      ok: false,
      previewMode: false,
      status: 0,
      error: safeError(error),
      request: { method, path }
    };
  }
}

function extractContactId(data: unknown) {
  const value = data as { contact?: { id?: string }; id?: string } | undefined;
  return value?.contact?.id ?? value?.id;
}

function extractOpportunityId(data: unknown) {
  const value = data as { opportunity?: { id?: string }; id?: string } | undefined;
  return value?.opportunity?.id ?? value?.id;
}

export async function searchContactByEmail(email: string) {
  const result = await request("/contacts/search/duplicate", {
    query: {
      locationId: process.env.GHL_LOCATION_ID,
      email
    }
  });
  const data = result.data as { contact?: { id?: string }; contacts?: Array<{ id?: string }>; id?: string } | undefined;
  return {
    ...result,
    ghlContactId: data?.contact?.id ?? data?.contacts?.[0]?.id ?? data?.id
  };
}

export async function createContact(payload: GhlContactPayload) {
  const result = await request("/contacts/", {
    method: "POST",
    body: {
      locationId: process.env.GHL_LOCATION_ID,
      ...payload
    }
  });
  return {
    ...result,
    ghlContactId: extractContactId(result.data)
  };
}

export async function updateContact(contactId: string, payload: GhlContactPayload) {
  const result = await request(`/contacts/${encodeURIComponent(contactId)}`, {
    method: "PUT",
    body: {
      locationId: process.env.GHL_LOCATION_ID,
      ...payload
    }
  });
  return {
    ...result,
    ghlContactId: extractContactId(result.data) ?? contactId
  };
}

export async function createOpportunity(payload: GhlOpportunityPayload) {
  const result = await request("/opportunities/", {
    method: "POST",
    body: {
      locationId: process.env.GHL_LOCATION_ID,
      pipelineId: process.env.GHL_PIPELINE_ID,
      ...payload
    }
  });
  return {
    ...result,
    ghlOpportunityId: extractOpportunityId(result.data)
  };
}

export async function updateOpportunity(opportunityId: string, payload: GhlOpportunityPayload) {
  const result = await request(`/opportunities/${encodeURIComponent(opportunityId)}`, {
    method: "PUT",
    body: payload
  });
  return {
    ...result,
    ghlOpportunityId: extractOpportunityId(result.data) ?? opportunityId
  };
}

export async function getPipeline(pipelineId = process.env.GHL_PIPELINE_ID) {
  return request(`/opportunities/pipelines/${encodeURIComponent(pipelineId ?? "missing-pipeline-id")}`);
}

export async function getLocation(locationId = process.env.GHL_LOCATION_ID) {
  return request(`/locations/${encodeURIComponent(locationId ?? "missing-location-id")}`);
}
