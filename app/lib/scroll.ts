const keys: Record<string, number> = {
  Space: 1,
  PageUp: 1,
  PageDown: 1,
  Home: 1,
  End: 1,
  ArrowLeft: 1,
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowDown: 1,
};

function preventDefault(e: Event) {
  e.preventDefault();
}

function preventDefaultForScrollKeys(e: KeyboardEvent) {
  if (keys[e.code]) {
    preventDefault(e);
    return false;
  }
}

// modern Chrome requires { passive: false } when adding event
let supportsPassive = false;
try {
  window.addEventListener(
    "test",
    null as unknown as EventListenerOrEventListenerObject,
    Object.defineProperty({}, "passive", {
      get: function () {
        supportsPassive = true;
      },
    }),
  );
} catch {
  /* */
}

let wheelOpt: AddEventListenerOptions | false, wheelEvent: string;
if (typeof document !== "undefined") {
  wheelOpt = supportsPassive ? { passive: false } : false;
  wheelEvent =
    "onwheel" in document.createElement("div") ? "wheel" : "mousewheel";
}

export function disableScroll(): void {
  window.addEventListener("DOMMouseScroll", preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener("touchmove", preventDefault, wheelOpt); // mobile
  window.addEventListener("keydown", preventDefaultForScrollKeys, false);
}

export function enableScroll(): void {
  window.removeEventListener("DOMMouseScroll", preventDefault, false);
  window.removeEventListener(
    wheelEvent,
    preventDefault,
    wheelOpt as EventListenerOptions,
  );
  window.removeEventListener(
    "touchmove",
    preventDefault,
    wheelOpt as EventListenerOptions,
  );
  window.removeEventListener("keydown", preventDefaultForScrollKeys, false);
}
