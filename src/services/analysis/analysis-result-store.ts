import "server-only";

import type { SiteKey } from "@/config/sites";
import type { AnalysisResult } from "@/types/analytics";
import { getAnalysisForPeriod, saveAnalysis } from "@/services/database/repositories";
import { appConfig } from "@/config/env";

const SCHEMA_VERSION = "2026-09-18.analysis-result-v1";

export type PersistedAnalysisResult = {
  schemaVersion: typeof SCHEMA_VERSION;
  siteKey: SiteKey;
  period: { startDate: string; endDate: string };
  question: string;
  result: AnalysisResult;
  savedAt: string;
};

type AnalysisPeriod = {
  siteKey: SiteKey;
  startDate: string;
  endDate: string;
};

function remoteAnalysisUrl({ siteKey, startDate, endDate }: AnalysisPeriod) {
  if (!process.env.VERCEL || !appConfig.userEventApiUrl) return "";
  return `${appConfig.userEventApiUrl}/analysis-results/${siteKey}/${startDate}_${endDate}`;
}

function remoteReadKey() {
  return appConfig.userEventReadKey || appConfig.userEventForwardKey;
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (result.mode === "ai" || result.mode === "local")
    && typeof result.generatedAt === "string"
    && typeof result.headline === "string"
    && typeof result.summary === "string"
    && Array.isArray(result.findings)
    && Array.isArray(result.nextActions);
}

function parsePersistedRecord(value: unknown, period: AnalysisPeriod): PersistedAnalysisResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<PersistedAnalysisResult>;
  if (record.schemaVersion !== SCHEMA_VERSION || record.siteKey !== period.siteKey) return null;
  if (record.period?.startDate !== period.startDate || record.period?.endDate !== period.endDate) return null;
  if (!isAnalysisResult(record.result)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    siteKey: period.siteKey,
    period: { startDate: period.startDate, endDate: period.endDate },
    question: typeof record.question === "string" ? record.question : "",
    result: record.result,
    savedAt: typeof record.savedAt === "string" ? record.savedAt : record.result.generatedAt,
  };
}

export async function savePersistedAnalysis(
  period: AnalysisPeriod,
  question: string,
  result: AnalysisResult,
) {
  saveAnalysis(result, period.startDate, period.endDate, period.siteKey);
  const record: PersistedAnalysisResult = {
    schemaVersion: SCHEMA_VERSION,
    siteKey: period.siteKey,
    period: { startDate: period.startDate, endDate: period.endDate },
    question: question.trim(),
    result,
    savedAt: new Date().toISOString(),
  };
  const endpoint = remoteAnalysisUrl(period);
  if (!endpoint || !appConfig.userEventForwardKey) return record;
  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-tkf-ingest-key": appConfig.userEventForwardKey,
      },
      body: JSON.stringify(record),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn("analysis_result_remote_write_failed", error instanceof Error ? error.message : String(error));
  }
  return record;
}

export async function loadPersistedAnalysis(period: AnalysisPeriod): Promise<PersistedAnalysisResult | null> {
  const endpoint = remoteAnalysisUrl(period);
  const readKey = remoteReadKey();
  if (endpoint && readKey) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${readKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const parsed = parsePersistedRecord(await response.json(), period);
        if (parsed) return parsed;
      }
    } catch (error) {
      console.warn("analysis_result_remote_read_failed", error instanceof Error ? error.message : String(error));
    }
  }
  const result = getAnalysisForPeriod(period.startDate, period.endDate, period.siteKey);
  if (!result) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    siteKey: period.siteKey,
    period: { startDate: period.startDate, endDate: period.endDate },
    question: "",
    result,
    savedAt: result.generatedAt,
  };
}
