import "server-only";

import { createHash } from "node:crypto";
import { QueueClient } from "@vercel/queue";
import { appConfig } from "@/config/env";
import type { SiteKey } from "@/config/sites";
import type { UserEventInput } from "@/types/analytics";

export type UserEventQueueMessage = {
  schemaVersion: "2026-09-17.v1";
  siteKey: SiteKey;
  source: string;
  events: UserEventInput[];
  queuedAt: string;
};

export async function queueUserEvents(siteKey: SiteKey, source: string, events: UserEventInput[]) {
  const idempotencyKey = createHash("sha256")
    .update([siteKey, source, ...events.map((event) => event.eventId)].join("|"))
    .digest("hex");
  const message: UserEventQueueMessage = {
    schemaVersion: "2026-09-17.v1",
    siteKey,
    source,
    events,
    queuedAt: new Date().toISOString(),
  };
  const queue = new QueueClient({
    region: appConfig.userEventQueueRegion,
    deploymentId: null,
  });
  const result = await queue.send(appConfig.userEventQueueTopic, message, {
    retentionSeconds: 7 * 24 * 60 * 60,
    idempotencyKey,
  });
  return { messageId: result.messageId, accepted: events.length };
}
