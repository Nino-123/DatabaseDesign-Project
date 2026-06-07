/**
 * metrics_charts.js
 * JBNU Smart Factory — Encapsulated Chart.js Configuration
 *
 * Exports two functions consumed by dashboard.html:
 *   renderAnomalyChart(canvasId, timestamps, scores)
 *   renderVibrationChart(canvasId, timestamps, vibration)
 *
 * Both use the dark SF palette defined in dashboard.css variables.
 * Requires Chart.js 4.x to be loaded before this file.
 */

/* ─── Shared Design Tokens ──────────────────────────────────── */
const SF_COLORS = {
  blue:       '#3b82f6',
  cyan:       '#22d3ee',
  danger:     '#ef4444',
  warn:       '#f59e0b',
  ok:         '#22c55e',
  gridLine:   'rgba(42, 47, 62, 0.8)',
  tickColor:  '#475569',
  tooltipBg:  '#1a1e2a',
  tooltipBorder: '#2a2f3e',
};

const SF_FONT = {
  family: "'JetBrains Mono', monospace",
  size:   11,
};

/* ─── Global Chart.js Defaults ──────────────────────────────── */
if (typeof Chart !== 'undefined') {
  Chart.defaults.color          = SF_COLORS.tickColor;
  Chart.defaults.font.family    = SF_FONT.family;
  Chart.defaults.font.size      = SF_FONT.size;
  Chart.defaults.borderColor    = SF_COLORS.gridLine;
  Chart.defaults.backgroundColor = 'transparent';
}

/* ─── Shared Axis Configuration Builder ─────────────────────── */
function buildSharedAxis(labelStr, position = 'left', tickColor = SF_COLORS.blue) {
  return {
    position,
    grid: {
      color: SF_COLORS.gridLine,
      drawBorder: false,
    },
    ticks: {
      color: tickColor,
      font: SF_FONT,
      maxTicksLimit: 8,
      padding: 8,
    },
    border: {
      color: SF_COLORS.gridLine,
      dash: [4, 4],
    },
    title: {
      display: true,
      text: labelStr,
      color: SF_COLORS.tickColor,
      font: { ...SF_FONT, size: 10 },
      padding: { bottom: 6 },
    },
  };
}

/* ─── Shared Tooltip Configuration ──────────────────────────── */
const SHARED_TOOLTIP = {
  enabled: true,
  backgroundColor: SF_COLORS.tooltipBg,
  borderColor: SF_COLORS.tooltipBorder,
  borderWidth: 1,
  titleColor: '#e2e8f0',
  bodyColor: '#94a3b8',
  titleFont: { ...SF_FONT, weight: '600' },
  bodyFont: SF_FONT,
  padding: 10,
  cornerRadius: 6,
  displayColors: true,
  boxPadding: 4,
  mode: 'index',
  intersect: false,
};

/* ─── Shared Plugin Block ────────────────────────────────────── */
function buildPlugins(titleStr) {
  return {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        color: '#94a3b8',
        font: SF_FONT,
        boxWidth: 12,
        boxHeight: 12,
        borderRadius: 3,
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: SHARED_TOOLTIP,
    title: {
      display: false,
    },
  };
}

/* ─── Gradient Builder ───────────────────────────────────────── */
function makeGradient(ctx, colorRgb, alphaTop = 0.3, alphaBot = 0.0) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0,   `rgba(${colorRgb}, ${alphaTop})`);
  gradient.addColorStop(1,   `rgba(${colorRgb}, ${alphaBot})`);
  return gradient;
}

/* ─── Label Formatter ────────────────────────────────────────── */
function trimTimestamps(timestamps, maxLabels = 12) {
  if (!timestamps || timestamps.length === 0) return [];
  const step = Math.max(1, Math.floor(timestamps.length / maxLabels));
  return timestamps.map((ts, i) => (i % step === 0 ? ts : ''));
}

/* ═══════════════════════════════════════════════════════════════
   FUNCTION: renderAnomalyChart
   Dual-axis line chart:
     Left  axis  → Isolation Forest anomaly score
     Right axis  → (reserved for future overlay)
   ═══════════════════════════════════════════════════════════════ */
function renderAnomalyChart(canvasId, timestamps, scores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { console.warn('[SF] Canvas not found:', canvasId); return; }

  const ctx = canvas.getContext('2d');

  // Colour-coded point colours: red if score > 0, cyan otherwise
  const pointColors = (scores || []).map(v =>
    v > 0 ? SF_COLORS.danger : SF_COLORS.cyan
  );

  const scoreGrad = makeGradient(ctx, '59,130,246', 0.25, 0.0);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Anomaly Score (IF)',
          data: scores,
          borderColor: SF_COLORS.blue,
          backgroundColor: scoreGrad,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600, easing: 'easeInOutQuart' },
      scales: {
        x: {
          grid: { color: SF_COLORS.gridLine, drawBorder: false },
          ticks: {
            color: SF_COLORS.tickColor,
            font: SF_FONT,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
            padding: 6,
          },
          border: { color: SF_COLORS.gridLine },
          title: {
            display: true,
            text: 'Timestamp',
            color: SF_COLORS.tickColor,
            font: { ...SF_FONT, size: 10 },
          },
        },
        y: {
          ...buildSharedAxis('Anomaly Score', 'left', SF_COLORS.blue),
          suggestedMin: -1,
          suggestedMax: 1,
        },
      },
      plugins: {
        ...buildPlugins('Anomaly Score — Isolation Forest'),
        tooltip: {
          ...SHARED_TOOLTIP,
          callbacks: {
            label: (ctx) =>
              ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)}`,
          },
        },
      },
    },
  });
}

/* ═══════════════════════════════════════════════════════════════
   FUNCTION: renderVibrationChart
   Single-axis line chart for raw vibration sensor values.
   ═══════════════════════════════════════════════════════════════ */
function renderVibrationChart(canvasId, timestamps, vibration) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) { console.warn('[SF] Canvas not found:', canvasId); return; }

  const ctx = canvas.getContext('2d');
  const vibGrad = makeGradient(ctx, '34,211,238', 0.22, 0.0);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [
        {
          label: 'Vibration (Raw)',
          data: vibration,
          borderColor: SF_COLORS.cyan,
          backgroundColor: vibGrad,
          pointBackgroundColor: SF_COLORS.cyan,
          pointBorderColor: SF_COLORS.cyan,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600, easing: 'easeInOutQuart' },
      scales: {
        x: {
          grid: { color: SF_COLORS.gridLine, drawBorder: false },
          ticks: {
            color: SF_COLORS.tickColor,
            font: SF_FONT,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
            padding: 6,
          },
          border: { color: SF_COLORS.gridLine },
          title: {
            display: true,
            text: 'Timestamp',
            color: SF_COLORS.tickColor,
            font: { ...SF_FONT, size: 10 },
          },
        },
        y: {
          ...buildSharedAxis('Vibration Magnitude', 'left', SF_COLORS.cyan),
        },
      },
      plugins: {
        ...buildPlugins('Raw Vibration Metric'),
        tooltip: {
          ...SHARED_TOOLTIP,
          callbacks: {
            label: (ctx) =>
              ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)}`,
          },
        },
      },
    },
  });
}
