import "server-only";

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { appConfig } from "@/config/env";

export type RemoteSnapshotDescriptor = {
  endpoint: string;
  version: string;
  sha256: string;
};

function snapshotEndpoint() {
  if (!appConfig.userEventApiUrl || !snapshotReadKey()) return null;
  return `${appConfig.userEventApiUrl}/snapshot`;
}

function snapshotReadKey() {
  return appConfig.userEventReadKey || appConfig.userEventForwardKey;
}

function authorizationHeaders() {
  return { Authorization: `Bearer ${snapshotReadKey()}` };
}

function normalizedEtag(value: string | null) {
  return (value || "").replace(/^W\//, "").replace(/^"|"$/g, "");
}

export async function describeRemoteSnapshot(): Promise<RemoteSnapshotDescriptor | null> {
  const endpoint = snapshotEndpoint();
  if (!endpoint) return null;
  const response = await fetch(endpoint, {
    method: "HEAD",
    headers: authorizationHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`远程快照检查失败（HTTP ${response.status}）。`);
  const version = normalizedEtag(response.headers.get("etag"));
  const sha256 = response.headers.get("x-snapshot-sha256") || "";
  if (!/^[a-f0-9]{16,64}$/i.test(version) || !/^[a-f0-9]{64}$/i.test(sha256)) {
    throw new Error("远程快照缺少有效的版本或校验信息。");
  }
  return { endpoint, version, sha256: sha256.toLowerCase() };
}

export async function downloadRemoteSnapshot(descriptor: RemoteSnapshotDescriptor, targetPath: string) {
  const response = await fetch(descriptor.endpoint, {
    headers: authorizationHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`远程快照下载失败（HTTP ${response.status}）。`);
  if (response.headers.get("x-snapshot-encoding") !== "gzip") {
    throw new Error("远程快照压缩格式不受支持。");
  }
  const compressed = Buffer.from(await response.arrayBuffer());
  const actualSha256 = createHash("sha256").update(compressed).digest("hex");
  if (actualSha256 !== descriptor.sha256) throw new Error("远程快照传输校验失败。");
  await writeFile(targetPath, gunzipSync(compressed));
}
