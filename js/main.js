/**
 * Inicialização.
 */
"use strict";

document.getElementById("btnEvolve").onclick = () => openChar();
document.getElementById("btnMenu").onclick = openMenu;
function syncSound() {
  const b = document.getElementById("btnSound");
  b.classList.toggle("off", !AUD.pref.music);
  document.getElementById("soundLbl").textContent = AUD.pref.music ? "Música" : "Sem música";
}
syncSound();
document.getElementById("btnSound").onclick = () => {
  AUD.setMusic(!AUD.pref.music);
  syncSound();
};
["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => AUD.unlock(), true));
document.getElementById("btnSheet").onclick = () => {
  sheetOpen = !sheetOpen;
  const s = document.getElementById("sheet");
  if (s) s.dataset.open = String(sheetOpen);
};
function boot(data) {
  if (data && data.S) {
    state = migrate(data.S);
    CHECK = data.CHECK || null;
    render();
  } else showTitle();
}
boot({});
