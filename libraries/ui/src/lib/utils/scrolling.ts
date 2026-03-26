export const buildInfiniteScroll = (callback: () => void) => (node: HTMLElement) => {
    const observer = new IntersectionObserver(
        (entries) => {
            const [entry] = entries;
            if (entry.isIntersecting) {
                callback();
            }
        },
        {
            rootMargin: '100px',
            threshold: 0.1
        }
    );

    observer.observe(node);

    return {
        destroy() {
            observer.unobserve(node);
            observer.disconnect();
        }
    };
}
