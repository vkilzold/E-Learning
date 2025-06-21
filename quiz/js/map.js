// Animate progress along the SVG path
const progressPath = document.getElementById('progress-path');
const totalLength = progressPath.getTotalLength();
let currentStep = 1;
const stepProgress = [0, 0.18, 0.36, 0.56, 0.72, 0.88, 1]; // 6 steps, normalized

function setProgress(step) {
  const pct = stepProgress[step];
  const dash = pct * totalLength;
  progressPath.setAttribute('stroke-dasharray', `${dash} ${totalLength}`);
}

setProgress(currentStep);

// Step interactivity
const steps = document.querySelectorAll('.road-step-svg');
const labels = document.querySelectorAll('.svg-step-label');

steps.forEach((step, idx) => {
  step.addEventListener('mouseenter', function(e) {
    this.classList.add('active');
    showTooltip(this, idx + 1, e);
  });
  step.addEventListener('mousemove', function(e) {
    moveTooltip(e);
  });
  step.addEventListener('mouseleave', function() {
    this.classList.remove('active');
    hideTooltip();
  });
  step.addEventListener('click', function() {
    steps.forEach(s => s.classList.remove('active'));
    this.classList.add('active');
    currentStep = idx + 1;
    setProgress(currentStep);
    highlightLabel(currentStep);
  });
  step.addEventListener('focus', function(e) {
    this.classList.add('active');
    showTooltip(this, idx + 1, e);
  });
  step.addEventListener('blur', function() {
    this.classList.remove('active');
    hideTooltip();
  });
});

function highlightLabel(stepNum) {
  labels.forEach(l => l.classList.remove('active'));
  const label = document.querySelector(`.svg-step-label[data-step="${stepNum}"]`);
  if (label) label.classList.add('active');
}

// Tooltip logic
let tooltip = null;
function showTooltip(step, stepNum, evt) {
  const label = document.querySelector(`.svg-step-label[data-step="${stepNum}"]`);
  if (!label) return;
  tooltip = document.createElement('div');
  tooltip.className = 'roadmap-tooltip';
  tooltip.innerHTML = `<strong>${label.querySelector('span').textContent}</strong><br>${label.querySelector('.desc').textContent}`;
  document.body.appendChild(tooltip);
  moveTooltip(evt);
}
function moveTooltip(evt) {
  if (!tooltip) return;
  tooltip.style.left = evt.pageX + 20 + 'px';
  tooltip.style.top = evt.pageY - 20 + 'px';
}
function hideTooltip() {
  if (tooltip) {
    document.body.removeChild(tooltip);
    tooltip = null;
  }
}

// Animate car/icon along the path (optional)
function animateCar(step) {
  // You can add a car SVG and animate its position along the path here if desired
}

// Initial highlight
highlightLabel(currentStep);

// Tooltip CSS
const style = document.createElement('style');
style.innerHTML = `
.roadmap-tooltip {
  position: absolute;
  background: #fff;
  color: #222;
  border: 2px solid #222;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 1rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  pointer-events: none;
  z-index: 1000;
  min-width: 180px;
  max-width: 260px;
  transition: opacity 0.2s;
}
.road-step.active .circle {
  border-color: #1e88e5;
  box-shadow: 0 0 0 4px #90caf9;
}
`;
document.head.appendChild(style); 