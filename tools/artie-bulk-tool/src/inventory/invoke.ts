import { GoogleAuth } from "google-auth-library";
import { resolveCredentialPath } from "../firebase/admin.js";
import type { ParsedInventoryInput } from "./input.js";

export const INVENTORY_FUNCTION_URL_ENV = "GENERATE_INVENTORY_GARMENTS_URL";
export const INVENTORY_FUNCTION_AUDIENCE_ENV = "GENERATE_INVENTORY_GARMENTS_AUDIENCE";

export interface InventoryFunctionConfig {
  url: string;
  audience: string;
}

export interface InventoryFunctionBody {
  physicalDesignId: string;
  quantity: number;
  size: string;
  backprintVersion: string;
}

export interface InventoryQrGeneration {
  generatedCount: number;
  skippedCount: number;
  totalGarments: number;
  uniqueGarmentsProcessed: number;
}

export interface InventoryFunctionResponse {
  garmentCount: number;
  garmentIds: string[];
  qrGeneration: InventoryQrGeneration;
}

export interface InventoryRequestArgs {
  url: string;
  audience: string;
  body: InventoryFunctionBody;
}

export type InventoryRequestFn = (args: InventoryRequestArgs) => Promise<InventoryFunctionResponse>;

export function resolveInventoryFunctionConfig(
  env: NodeJS.ProcessEnv = process.env,
): InventoryFunctionConfig {
  const url = env[INVENTORY_FUNCTION_URL_ENV]?.trim();
  if (!url) {
    throw new Error(
      `${INVENTORY_FUNCTION_URL_ENV} is not set. Copy tools/artie-bulk-tool/.env.example to .env and set the Cloud Run URL.`,
    );
  }

  const audience = env[INVENTORY_FUNCTION_AUDIENCE_ENV]?.trim() || url;
  return { url, audience };
}

export function toInventoryFunctionBody(input: ParsedInventoryInput): InventoryFunctionBody {
  return {
    physicalDesignId: input.physicalDesignId,
    quantity: input.quantity,
    size: input.size,
    backprintVersion: input.backprintVersion,
  };
}

export async function defaultInventoryRequest(
  args: InventoryRequestArgs,
): Promise<InventoryFunctionResponse> {
  const keyFile = resolveCredentialPath();
  const auth = new GoogleAuth(keyFile ? { keyFile } : {});
  const client = await auth.getIdTokenClient(args.audience);

  try {
    const res = await client.request<unknown>({
      url: args.url,
      method: "POST",
      data: args.body,
      headers: { "Content-Type": "application/json" },
      responseType: "json",
    });
    return parseInventoryFunctionResponse(res.data, res.status);
  } catch (error) {
    throw wrapInventoryInvokeError(error);
  }
}

export async function invokeGenerateInventoryGarments(
  input: ParsedInventoryInput,
  requestFn: InventoryRequestFn = defaultInventoryRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<InventoryFunctionResponse> {
  const config = resolveInventoryFunctionConfig(env);
  return requestFn({
    url: config.url,
    audience: config.audience,
    body: toInventoryFunctionBody(input),
  });
}

function parseInventoryFunctionResponse(data: unknown, status?: number): InventoryFunctionResponse {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`generateInventoryGarments returned a non-JSON body (status ${status ?? "unknown"}).`);
  }

  const record = data as Record<string, unknown>;
  const garmentIds = Array.isArray(record.garmentIds)
    ? record.garmentIds.filter((id): id is string => typeof id === "string")
    : [];
  const qrRaw =
    record.qrGeneration && typeof record.qrGeneration === "object" && !Array.isArray(record.qrGeneration)
      ? (record.qrGeneration as Record<string, unknown>)
      : {};

  return {
    garmentCount: typeof record.garmentCount === "number" ? record.garmentCount : garmentIds.length,
    garmentIds,
    qrGeneration: {
      generatedCount: typeof qrRaw.generatedCount === "number" ? qrRaw.generatedCount : 0,
      skippedCount: typeof qrRaw.skippedCount === "number" ? qrRaw.skippedCount : 0,
      totalGarments: typeof qrRaw.totalGarments === "number" ? qrRaw.totalGarments : garmentIds.length,
      uniqueGarmentsProcessed:
        typeof qrRaw.uniqueGarmentsProcessed === "number" ? qrRaw.uniqueGarmentsProcessed : garmentIds.length,
    },
  };
}

function wrapInventoryInvokeError(error: unknown): Error {
  if (isGaxiosLikeError(error)) {
    const status = error.response.status;
    const data = error.response.data;
    const detail =
      typeof data === "string"
        ? data
        : data !== undefined
          ? JSON.stringify(data)
          : error.message;
    return new Error(`generateInventoryGarments failed (${status}): ${detail}`);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function isGaxiosLikeError(
  error: unknown,
): error is { message: string; response: { status: number; data: unknown } } {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return false;
  }
  const response = (error as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("status" in response)) {
    return false;
  }
  return typeof (response as { status?: unknown }).status === "number";
}
