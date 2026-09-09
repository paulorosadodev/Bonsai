/**
 * Scrolls the window down smoothly so the bottom of an element is visible in the viewport,
 * if it currently extends beyond the bottom edge.
 */
export function scrollBottomIntoViewIfNeeded(element: HTMLElement | null, bottomOffset = 32, delay = 100) {
    setTimeout(() => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const targetBottom = window.innerHeight - bottomOffset;
        if (rect.bottom > targetBottom) {
            window.scrollBy({
                top: rect.bottom - targetBottom,
                behavior: "smooth",
            });
        }
    }, delay);
}
