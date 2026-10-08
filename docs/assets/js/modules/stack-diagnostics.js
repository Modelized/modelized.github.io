const VERSION = "20261008a";
const round = (value) => Math.round(value * 1000) / 1000;
const rect = (element) => {
  const box = element.getBoundingClientRect();
  return [box.x, box.y, box.width, box.height].map(round);
};
const range = (values) => values.length ? round(Math.max(...values) - Math.min(...values)) : 0;

export function summarizeStackTrace(frames) {
  const intervals = frames.slice(1).map((frame, i) => frame.t - frames[i].t);
  return {
    frames: frames.length,
    maxFrameGapMs: intervals.length ? round(Math.max(...intervals)) : 0,
    scrollYRange: range(frames.map((frame) => frame.scroll[1])),
    cards: (frames[0]?.cards || []).map((_, index) => ({
      index,
      centerRelativeToStackRange: range(frames.map((frame) => {
        const box = frame.cards[index].box;
        return box[1] + box[3] / 2 - frame.stack[1];
      })),
      layoutHeightRange: range(frames.map((frame) => frame.cards[index].size[1]))
    }))
  };
}

export function initStackDiagnostics() {
  if (document.getElementById("stack-diagnostics")) return;
  const host = document.createElement("aside");
  host.id = "stack-diagnostics";
  host.style.cssText = "position:fixed;z-index:2147483647;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));max-width:440px;margin:auto;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host{font:13px/1.4 system-ui;color:#fff;color-scheme:dark}
    details{background:#191919;border:1px solid #777;border-radius:12px;padding:9px;max-height:45vh;overflow:auto}
    summary{cursor:pointer;font-weight:600} p{margin:7px 0}
    .row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
    button,select{font:inherit;padding:8px;border:1px solid #888;border-radius:7px;background:#292929;color:#fff;min-height:36px}
    button:disabled,select:disabled{opacity:.45} textarea{box-sizing:border-box;width:100%;height:110px;font:11px monospace}
    [hidden]{display:none}
  </style><details open><summary>카드 진단</summary>
    <p>각 스택에서 기록 대기 → 한 번 스와이프 → 흔들림 여부 선택. 최대 6회, 서버 전송 없음.</p>
    <div class="row"><button data-go="discipline-stack">Disciplines 이동</button><button data-go="project-stack">Projects 이동</button></div>
    <div class="row"><select aria-label="기록할 스택"><option value="discipline-stack">Disciplines</option><option value="project-stack">Projects</option></select>
    <button id="arm">기록 대기</button><button id="stop" disabled>중단</button></div>
    <p id="status" role="status">대기 중 · 결과는 이 페이지를 닫으면 사라져.</p>
    <div class="row"><button id="yes" disabled>흔들림 있었음</button><button id="no" disabled>흔들림 없었음</button></div>
    <div class="row"><button id="copy" disabled>전체 결과 복사</button><button id="save" disabled>JSON 저장</button></div>
    <textarea aria-label="복사용 진단 결과" hidden readonly></textarea>
  </details>`;
  document.body.append(host);
  const ui = (id) => root.getElementById(id);
  const selection = root.querySelector("select");
  const captures = [];
  let armed = false;
  let baseline = null;
  let current = null;
  let frame = 0;
  const status = (text) => { ui("status").textContent = text; };
  const viewport = () => ({
    inner: [innerWidth, innerHeight], dpr: devicePixelRatio,
    visual: window.visualViewport ? {
      width: round(visualViewport.width), height: round(visualViewport.height),
      scale: visualViewport.scale, x: round(visualViewport.offsetLeft), y: round(visualViewport.offsetTop)
    } : null
  });
  const styles = (element) => {
    const css = getComputedStyle(element);
    return Object.fromEntries(["transform", "transformOrigin", "width", "height", "contain", "overflowX", "overflowY", "filter", "boxShadow", "transition", "willChange"].map((key) => [key, css[key]]));
  };
  const metadata = (stack) => ({
    id: stack.id, box: rect(stack), styles: styles(stack),
    ancestors: [stack.parentElement, stack.closest(".discipline-stack-bleed"), stack.closest(".discipline-stack-shell")].map((element) => ({ box: rect(element), styles: styles(element) })),
    cards: Array.from(stack.children).filter((card) => card.matches(".discipline-stack-card")).map((card) => ({
      slug: card.dataset.slug, styles: styles(card),
      surface: styles(card.querySelector(".discipline-stack-card__surface"))
    }))
  });
  const buttons = () => {
    const busy = armed || !!current;
    ui("arm").disabled = busy || captures.length >= 6;
    ui("stop").disabled = !busy;
    selection.disabled = busy;
    root.querySelectorAll("[data-go]").forEach((button) => { button.disabled = busy; });
    for (const id of ["yes", "no", "copy", "save"]) ui(id).disabled = busy || !captures.length;
  };
  const finish = (reason) => {
    cancelAnimationFrame(frame);
    frame = 0;
    armed = false;
    if (current) {
      const { trace } = current;
      trace.reason = reason;
      trace.summary = summarizeStackTrace(trace.frames);
      captures.push(trace);
      current = null;
      status(`${captures.length}회 저장됨 · 마지막 기록의 흔들림 여부를 선택해줘.`);
    } else status("기록 대기 취소됨");
    buttons();
  };
  const sample = () => {
    if (!current) return;
    try {
      const start = performance.now();
      const { stack, cards, trace, started, released } = current;
      const snapshot = {
        t: round(start - started), scroll: [round(scrollX), round(scrollY)], viewport: viewport(),
        stack: rect(stack), shell: rect(stack.closest(".discipline-stack-shell")),
        cards: cards.map((card) => {
          const css = getComputedStyle(card);
          return {
            pos: Number(card.dataset.stackPos), box: rect(card), size: [card.offsetWidth, card.offsetHeight],
            transform: css.transform, origin: css.transformOrigin,
            surface: rect(card.querySelector(".discipline-stack-card__surface")),
            animations: card.getAnimations().map((animation) => ({
              type: animation.constructor.name, property: animation.transitionProperty || null,
              time: typeof animation.currentTime === "number" ? round(animation.currentTime) : null,
              state: animation.playState
            }))
          };
        })
      };
      snapshot.readCostMs = round(performance.now() - start);
      trace.frames.push(snapshot);
      if (start - started >= 5000 || (released !== null && start - released >= 1400)) finish("complete");
      else frame = requestAnimationFrame(sample);
    } catch (error) {
      current.trace.error = String(error);
      finish("measurement-error");
    }
  };
  const eventLog = (type, event) => {
    if (!current || current.trace.events.length >= 500) return;
    current.trace.events.push({
      t: round(performance.now() - current.started), type,
      ...(event && "pointerId" in event ? { id: event.pointerId, x: round(event.clientX), y: round(event.clientY) } : {})
    });
  };
  ui("arm").onclick = () => {
    const stack = document.getElementById(selection.value);
    const box = stack.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight || stack.dataset.stackReady !== "true") {
      status("먼저 해당 스택으로 이동하고 카드가 보이는 상태에서 눌러줘.");
      return;
    }
    baseline = ["discipline-stack", "project-stack"].map((id) => metadata(document.getElementById(id)));
    armed = true;
    root.querySelector("textarea").hidden = true;
    status("기록 대기 · 선택한 스택을 한 번 넘겨줘.");
    buttons();
  };
  ui("stop").onclick = () => finish("manual-stop");
  root.querySelectorAll("[data-go]").forEach((button) => {
    button.onclick = () => {
      selection.value = button.dataset.go;
      document.getElementById(selection.value).scrollIntoView({ block: "center", behavior: "instant" });
    };
  });
  document.addEventListener("pointerdown", (event) => {
    if (!armed || !event.isPrimary || event.button !== 0) return;
    const stack = document.getElementById(selection.value);
    if (!stack.contains(event.target)) return;
    const started = performance.now();
    current = {
      stack, started, released: null, pointer: event.pointerId,
      cards: Array.from(stack.querySelectorAll(".discipline-stack-card")),
      trace: { stack: stack.id, visibleWobble: null, viewport: viewport(), frames: [], events: [],
        baseline }
    };
    armed = false;
    status("기록 중 · 손을 뗀 뒤 약 1.4초 기다려줘.");
    eventLog("pointerdown", event);
    frame = requestAnimationFrame(sample);
  }, { capture: true, passive: true });
  for (const type of ["pointermove", "pointerup", "pointercancel", "lostpointercapture"]) {
    document.addEventListener(type, (event) => {
      if (!current || event.pointerId !== current.pointer) return;
      eventLog(type, event);
      if (type === "pointerup" || type === "pointercancel") current.released = performance.now();
    }, { capture: true, passive: true });
  }
  for (const type of ["resize", "scroll", "orientationchange", "pageshow"]) {
    window.addEventListener(type, () => eventLog(type), { passive: true });
  }
  for (const type of ["resize", "scroll"]) {
    window.visualViewport?.addEventListener(type, () => eventLog(`visualViewport:${type}`), { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (current || armed)) finish("page-hidden");
  });
  for (const [id, value] of [["yes", true], ["no", false]]) {
    ui(id).onclick = () => {
      captures.at(-1).visibleWobble = value;
      status(`${captures.length}회 저장됨 · 마지막 기록: 흔들림 ${value ? "있음" : "없음"}`);
    };
  }
  const report = () => JSON.stringify({
    version: VERSION, userAgent: navigator.userAgent, capturedAt: new Date().toISOString(),
    note: "Diagnostic geometry reads can influence rendering. No pixel/compositor capture. Coordinates in CSS pixels.",
    captures
  }, null, 2);
  ui("copy").onclick = async () => {
    const text = report();
    try {
      await navigator.clipboard.writeText(text);
      status("복사됐어. 대화에 붙여넣거나 JSON 저장으로 파일을 보내줘.");
    } catch {
      const field = root.querySelector("textarea");
      field.value = text;
      field.hidden = false;
      field.focus();
      field.select();
      status("자동 복사가 막혔어. 아래 내용을 복사하거나 JSON 저장을 눌러줘.");
    }
  };
  ui("save").onclick = () => {
    const url = URL.createObjectURL(new Blob([report()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `modelized-stack-${Date.now()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}
