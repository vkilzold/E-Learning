function changeGIF(gifPath) {
  const img = document.getElementById("animation-sprite");
  
  // Set the selected animation
  img.src = gifPath + '?t=' + new Date().getTime(); // forces reload

  // If it's not the idle animation, return to idle after 1 second
  if (!gifPath.includes('idle')) {
    setTimeout(() => {
      img.src = 'animations/char-idle.gif?t=' + new Date().getTime();
    }, 1100); // 1000 milliseconds = 1 second
  }
}
