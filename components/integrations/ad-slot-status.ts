/** Observe presentation only. Never remove, hide or cancel provider content. */
export function observeAdSlot(host: HTMLElement, content: HTMLElement) {
  const check = () => {
    const filled = [...content.querySelectorAll("iframe, img, a, video, object, embed")].some((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (filled) host.dataset.status = "filled";
    else if (host.dataset.status === "filled") host.dataset.status = "empty";
  };
  const observer = new MutationObserver(check);
  observer.observe(content, { childList: true, subtree: true });
  const resizeObserver = new ResizeObserver(check);
  resizeObserver.observe(content);
  check();
  return () => {
    observer.disconnect();
    resizeObserver.disconnect();
  };
}
