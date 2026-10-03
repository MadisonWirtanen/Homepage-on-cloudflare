function startClock() {
  const dateEl = document.getElementById("date-value");
  const weekdayEl = document.getElementById("weekday-value");
  const timeEl = document.getElementById("time-value");

  const tick = () => {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
    weekdayEl.textContent = now.toLocaleDateString("zh-CN", { weekday: "long" });
    timeEl.textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
  };

  tick();
  setInterval(tick, 1000);
}

export { startClock };
