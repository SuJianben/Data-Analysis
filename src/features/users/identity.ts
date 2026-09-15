export type UserIdentityType = "customer" | "visitor";

const CUSTOMER_PREFIX = "customer:";
const VISITOR_PREFIX = "visitor:";

export type ParsedUserIdentity = {
  type: UserIdentityType;
  id: string;
  key: string;
};

export function customerIdentityKey(customerIdHash: string) {
  return `${CUSTOMER_PREFIX}${customerIdHash}`;
}

export function visitorIdentityKey(visitorId: string) {
  return `${VISITOR_PREFIX}${visitorId}`;
}

export function parseUserIdentityKey(value: string): ParsedUserIdentity | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value).trim();
  } catch {
    return null;
  }
  const match = decoded.match(/^(customer|visitor):(.+)$/);
  if (!match || match[2].length < 8 || match[2].length > 200) return null;
  const type = match[1] as UserIdentityType;
  return { type, id: match[2], key: `${type}:${match[2]}` };
}

export function userIdentityLabel(type: UserIdentityType, id: string) {
  const shortId = id.slice(0, 10);
  return `${userIdentityTypeLabel(type)} ${shortId}`;
}

export function userIdentityTypeLabel(type: UserIdentityType) {
  return type === "customer" ? "已识别客户" : "匿名访客";
}

export function userIdentityDescription(type: UserIdentityType) {
  return type === "customer" ? "脱敏客户标识" : "浏览器匿名标识";
}
