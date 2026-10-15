const SETTLE_PASS_DELAYS = [0, 140, 320, 560];

function createSettledScheduler(callback) {
  const timers = [];

  const clear = () => {
    while (timers.length) {
      window.clearTimeout(timers.pop());
    }
  };

  const schedule = (baseDelay = 0, beforeSchedule) => {
    clear();
    beforeSchedule?.();

    SETTLE_PASS_DELAYS.forEach((offset) => {
      timers.push(window.setTimeout(callback, baseDelay + offset));
    });
  };

  return { clear, schedule };
}

export { createSettledScheduler };
