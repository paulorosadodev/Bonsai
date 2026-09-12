/**
 * Scrolls the window down smoothly so the bottom of an element is visible in the viewport,
 * if it currently extends beyond the bottom edge.
 */
export function scrollBottomIntoViewIfNeeded(target: HTMLElement | null | (() => HTMLElement | null), bottomOffset?: number, delay = 100) {
    setTimeout(() => {
        const element = typeof target === "function" ? target() : target;
        if (!element) return;

        const nav = typeof document !== "undefined" ? document.querySelector('nav[aria-label="Principal"]') : null;
        const navHeight = nav && window.innerWidth < 1024 ? nav.getBoundingClientRect().height : 0;
        const defaultOffset = navHeight > 0 ? navHeight + 20 : 32;
        const effectiveBottomOffset = bottomOffset ?? defaultOffset;

        const rect = element.getBoundingClientRect();
        const targetBottom = window.innerHeight - effectiveBottomOffset;
        if (rect.bottom > targetBottom) {
            let scrollDistance = rect.bottom - targetBottom;
            const header = typeof document !== "undefined" ? document.querySelector("header.sticky, header") : null;
            const headerHeight = header ? header.getBoundingClientRect().height : 56;
            const availableHeight = window.innerHeight - effectiveBottomOffset - headerHeight - 16;
            if (rect.height > availableHeight) {
                scrollDistance = Math.max(0, rect.top - (headerHeight + 16));
            }
            if (scrollDistance > 0) {
                window.scrollBy({
                    top: scrollDistance,
                    behavior: "smooth",
                });
            }
        }
    }, delay);
}
