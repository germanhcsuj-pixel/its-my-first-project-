const toast = document.querySelector(".toast");
 
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}
 
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(button.dataset.action === "login" ? "Авторизация скоро будет доступна." : "Проект готов к запуску — подключи свой backend.");
  });
});
 
document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      showToast("Команда скопирована в буфер обмена.");
    } catch {
      showToast("Скопируй команду вручную из блока запроса.");
    }
  });
});
 
const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
 
const menuButton = document.querySelector(".menu-button");
menuButton.addEventListener("click", () => showToast("Мобильная навигация будет подключена в следующем шаге."));
 
