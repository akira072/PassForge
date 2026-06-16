/* ═══════════════════════════════════════════════
   PassForge — utils.js
   Shared utility functions: UI, clipboard, toast
═══════════════════════════════════════════════ */

/**
 * switchTab(name, btn)
 * Hides all .card sections and deactivates all .tab-btn elements,
 * then shows the tab matching `name` and marks `btn` as active.
 *
 * @param {string} name  - The tab identifier (e.g. 'generator', 'strength', 'encrypt')
 * @param {HTMLElement} btn - The button element that was clicked
 */
function switchTab(name, btn) {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

/**
 * showToast(msg)
 * Briefly shows a floating notification at the bottom-right of the screen.
 * Auto-hides after 2 seconds using CSS transitions (opacity + translateY).
 *
 * @param {string} msg - The message to display inside the toast
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

/**
 * copyField(id)
 * Reads the `.value` of an <input> or <textarea> by its DOM id
 * and writes it to the system clipboard via the Clipboard API.
 *
 * @param {string} id - The element's id attribute
 */
function copyField(id) {
  const el = document.getElementById(id);
  const txt = el.value;
  if (!txt) return;
  navigator.clipboard.writeText(txt).then(() => showToast('Copied ✓'));
}

/**
 * copyDivText(id)
 * Reads the `.textContent` of any element (e.g. a <span> inside .output-box)
 * and copies it to the clipboard.
 *
 * @param {string} id - The element's id attribute
 */
function copyDivText(id) {
  const txt = document.getElementById(id).textContent;
  if (!txt) return;
  navigator.clipboard.writeText(txt).then(() => showToast('Copied ✓'));
}

/**
 * toggleVisibility(inputId, btn)
 * Toggles an <input> between type="password" (masked) and type="text" (visible).
 * Updates the button's emoji icon to reflect the current state.
 *
 * @param {string} inputId  - The id of the password input field
 * @param {HTMLElement} btn - The eye icon button element
 */
function toggleVisibility(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

/**
 * syncSlider(el)
 * Keeps the two length display elements (#lenLabel, #lenSlider_val)
 * in sync with the range slider's current value as the user drags it.
 *
 * @param {HTMLInputElement} el - The range input element
 */
function syncSlider(el) {
  document.getElementById('lenLabel').textContent = el.value;
  document.getElementById('lenSlider_val').textContent = el.value;
}

/**
 * formatTime(sec)
 * Converts a raw number of seconds into a human-readable duration string.
 * Used to display estimated brute-force crack times.
 *
 * Ranges: < 1 sec → years → millions → billions → ∞
 *
 * @param {number} sec - Duration in seconds
 * @returns {string} Human-readable time string (e.g. "3.2M yrs", "47 days")
 */
function formatTime(sec) {
  if (sec < 1)          return '< 1 sec';
  if (sec < 60)         return sec.toFixed(0) + ' sec';
  if (sec < 3600)       return (sec / 60).toFixed(0) + ' min';
  if (sec < 86400)      return (sec / 3600).toFixed(0) + ' hrs';
  if (sec < 31536000)   return (sec / 86400).toFixed(0) + ' days';
  const y = sec / 31536000;
  if (y < 1e6)  return y.toFixed(0) + ' yrs';
  if (y < 1e9)  return (y / 1e6).toFixed(1) + 'M yrs';
  if (y < 1e12) return (y / 1e9).toFixed(1) + 'B yrs';
  return '∞';
}
