export const GA_TRACKING_ID = 'G-EKWHS7RCFY';

/**
 * Sends an event to Google Analytics.
 * @param action The action that happened (e.g., 'Tab Change', 'Button Click')
 * @param category The category of the event (e.g., 'Navigation', 'Features')
 * @param label Optional label for more detail (e.g., 'Balance Tab', 'Arena Dialog')
 * @param value Optional numeric value
 */
export const logEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

/**
 * Manually logs a page view (useful for virtual routes in SPA if needed)
 */
export const logPageView = (pageName: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href
        });
    }
};