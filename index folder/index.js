document.addEventListener("DOMContentLoaded", function () {
  const scrollContainer = document.querySelector(".scroll-container");

  document.querySelector(".scroll-btn.left").addEventListener("click", () => {
    scrollContainer.scrollLeft -= 2500; // 🚀 faster scroll
  });

  document.querySelector(".scroll-btn.right").addEventListener("click", () => {
    scrollContainer.scrollLeft += 2500; // 🚀 faster scroll
  });

  scrollContainer.addEventListener("wheel", (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY * 2.5; // 🚀 increase multiplier
    }
  });
});
