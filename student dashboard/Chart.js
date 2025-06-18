document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('radarStatsChart');

  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Algebra', 'Calculus', 'Geometry', 'Number theory', 'Statistics', 'Physics'],
      datasets: [{
        label: 'Skill Scores',
        data: [80, 70, 65, 75, 60, 85],
        fill: true,
        backgroundColor: 'rgba(81, 16, 105, 0.2)',
        borderColor: '#511069',
        pointBackgroundColor: '#511069',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#511069'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#511069',
            font: {
              size: 14
            }
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: '#ddd' },
          grid: { color: '#eee' },
          pointLabels: {
            color: '#333',
            font: { size: 12 }
          },
          ticks: {
            color: '#999',
            backdropColor: 'transparent'
          }
        }
      }
    }
  });
});
