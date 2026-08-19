/**
 * Web-side types. The wire shapes — session user, roles, notifications, search
 * results, route keys — come from `@campus-connect/contracts` so the browser and
 * the API cannot drift apart; they are re-exported here so feature code has one
 * import to reach for.
 */
export type { NotificationItem, Role, RouteKey, SearchResult, SessionUser, Tone, Permission } from '@campus-connect/contracts';
export { ROLE_LABELS, ROLES, ROUTE_KEYS, can } from '@campus-connect/contracts';

/** Historic alias — several screens still import `Notification`. */
export type { NotificationItem as Notification } from '@campus-connect/contracts';

export type Option = { value: string; label: string };

/** The `{ items, meta }` envelope every paginated list endpoint returns. */
export type ListResponse<T> = {
  items: T[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};
