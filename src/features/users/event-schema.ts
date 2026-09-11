import { z } from "zod";

export const userEventSchema = z.object({
  eventId: z.string().min(8).max(160),
  visitorId: z.string().min(8).max(160),
  customerIdHash: z.string().regex(/^[a-f0-9]{64}$/i, "customerIdHash 必须是 64 位十六进制哈希。").optional(),
  sessionId: z.string().max(160).optional(),
  eventName: z.string().min(1).max(120),
  occurredAt: z.string().min(10).max(80),
  pagePath: z.string().max(2000).optional(),
  elementKey: z.string().max(300).optional(),
  elementLabel: z.string().max(500).optional(),
  pageSection: z.string().max(200).optional(),
  destinationPath: z.string().max(2000).optional(),
  clickTarget: z.string().max(120).optional(),
  deviceCategory: z.string().max(40).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const userEventPayloadSchema = z.object({
  siteKey: z.enum(["tkf", "tms"]).default("tkf"),
  source: z.string().min(1).max(80).default("storefront"),
  event: userEventSchema.optional(),
  events: z.array(userEventSchema).max(50).optional(),
}).refine((value) => Boolean(value.event) || Boolean(value.events?.length), {
  message: "event 或 events 至少需要一个事件。",
});
