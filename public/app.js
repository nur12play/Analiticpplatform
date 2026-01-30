let chartInstance = null;

function showError(msg) {
  document.getElementById("error").textContent = msg || "";
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function renderChart(labels, values, fieldName) {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  destroyChart();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: fieldName,
          data: values
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
      animation: false,
      normalized: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

async function load() {
  showError("");

  const field = document.getElementById("field").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  if (!start || !end) {
    showError("Выбери start и end дату.");
    return;
  }

  const qs = new URLSearchParams({ field, start_date: start, end_date: end });

  try {
    const [series, metrics] = await Promise.all([
      fetchJson(`/api/measurements?${qs.toString()}`),
      fetchJson(`/api/measurements/metrics?${qs.toString()}`)
    ]);

    document.getElementById("avg").textContent = metrics.avg ?? "-";
    document.getElementById("min").textContent = metrics.min ?? "-";
    document.getElementById("max").textContent = metrics.max ?? "-";
    document.getElementById("std").textContent = metrics.stdDev ?? "-";

    series.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = [];
    const values = [];

    for (const x of series) {
      const v = Number(x[field]);
      if (!Number.isFinite(v)) continue;

      labels.push(new Date(x.timestamp).toLocaleString());
      values.push(v);
    }

    if (values.length === 0) {
      destroyChart();
      throw new Error("Нет корректных числовых значений для графика.");
    }

    console.log("Loaded points:", values.length, "sample:", labels[0], values[0]);

    renderChart(labels, values, field);
  } catch (e) {
    showError(e.message);

    document.getElementById("avg").textContent = "-";
    document.getElementById("min").textContent = "-";
    document.getElementById("max").textContent = "-";
    document.getElementById("std").textContent = "-";

    destroyChart();
  }
}

document.getElementById("loadBtn").addEventListener("click", load);

document.getElementById("start").value = "2025-01-01";
document.getElementById("end").value = "2025-01-03";
