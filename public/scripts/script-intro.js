window.addEventListener("load", () => {
  const loader = document.getElementById("intro-loader");
  if (!loader) return;

  if (sessionStorage.getItem("introShown")) {
    loader.remove();
    return;
  }

  sessionStorage.setItem("introShown", "true");

  setTimeout(() => {
    loader.style.transition = "opacity 0.5s ease";
    loader.style.opacity = 0;

    setTimeout(() => {
      loader.remove();
    }, 500);
  }, 3000);
});