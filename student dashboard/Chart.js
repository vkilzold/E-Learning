document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('radarStatsChart');

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark
      ? {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          borderColor: '#fff',
          pointBackgroundColor: '#ffd600',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ffd600',
          labelColor: '#fff',
          gridColor: '#888',
          tickColor: '#fff',
        }
      : {
          backgroundColor: 'rgba(81, 16, 105, 0.2)',
          borderColor: '#222',
          pointBackgroundColor: '#511069',
          pointBorderColor: '#222',
          pointHoverBackgroundColor: '#222',
          pointHoverBorderColor: '#511069',
          labelColor: '#222',
          gridColor: '#222',
          tickColor: '#222',
        };
  }

  let chart;
  function renderChart() {
    const colors = getChartColors();
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Basic Algebra', 'Fraction', 'Basic Operation', 'Geometry', 'Number theory'],
        datasets: [{
          label: 'Skill Scores',
          data: [80, 70, 65, 75, 60, 85],
          fill: true,
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          pointBackgroundColor: colors.pointBackgroundColor,
          pointBorderColor: colors.pointBorderColor,
          pointHoverBackgroundColor: colors.pointHoverBackgroundColor,
          pointHoverBorderColor: colors.pointHoverBorderColor
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: colors.labelColor,
              font: { size: 16, family: 'Orbitron, sans-serif' }
            }
          }
        },
        scales: {
          r: {
            angleLines: { color: colors.gridColor },
            grid: { color: colors.gridColor },
            pointLabels: {
              color: colors.labelColor,
              font: { size: 14, family: 'Orbitron, sans-serif' }
            },
            ticks: {
              color: colors.tickColor,
              backdropColor: 'transparent',
              font: { family: 'Orbitron, sans-serif' }
            }
          }
        }
      }
    });
  }

  renderChart();

  // Listen for theme changes
  const observer = new MutationObserver(() => {
    renderChart();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});