/**
 * Announces admin navigation that does not come from a link, so a page can
 * take it over, as the editor does to save before leaving (FR-ADMIN-18).
 * Links need no announcement: the editor intercepts their clicks.
 */
export const NAVIGATION_REQUEST = "admin:navigation-request";

export interface NavigationRequestDetail {
  href: string;
}

/**
 * Dispatches a cancelable request. Returns true when no listener cancelled
 * it, so the caller navigates itself; a listener that cancels navigates later
 * or not at all.
 */
export function announceNavigation(href: string): boolean {
  return window.dispatchEvent(
    new CustomEvent<NavigationRequestDetail>(NAVIGATION_REQUEST, {
      cancelable: true,
      detail: { href },
    }),
  );
}
