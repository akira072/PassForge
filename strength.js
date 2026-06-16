/* ═══════════════════════════════════════════════
   PassForge — strength.js
   Real-time password strength analysis:
   criteria checks, scoring, entropy calculation.
═══════════════════════════════════════════════ */

/* ── Known Weak Passwords ────────────────────────────────────────────────────
   A small blocklist of the most commonly used passwords.
   Any password matching one of these gets capped at score 1 (Very Weak),
   regardless of length or character diversity.
─────────────────────────────────────────────────────────────────────────── */
const COMMON_PASSWORDS = new Set([
  'password', '123456', 'password1', 'qwerty', 'abc123',
  'iloveyou', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'sunshine', 'princess', '123456789',
  '12345678', '11111111', 'password123', 'test', 'guest', 'login'
]);

/* ── Common Keyboard / Alphabet Sequences ────────────────────────────────────
   If a password contains any 4-character run from these sequences
   (e.g. "qwer", "1234", "asdf"), it is penalised for predictability.
─────────────────────────────────────────────────────────────────────────── */
const SEQUENCES = [
  'abcdefghijklmnop',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '01234567890'
];

/* ── Bar / Label Color Palette ───────────────────────────────────────────────
   Maps score (1–5) to a CSS variable color and a human-readable label.
   Score 1 = Very Weak (red), Score 5 = Very Strong (green).
─────────────────────────────────────────────────────────────────────────── */
const SCORE_COLORS = [
  'var(--red)',
  'var(--orange)',
  'var(--yellow)',
  'var(--blue)',
  'var(--green)'
];

const SCORE_LABELS = [
  'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'
];

/* ── analyseStrength(pwd) ────────────────────────────────────────────────────
   Main strength analysis function, called on every keystroke via oninput.

   SCORING ALGORITHM (max score = 5):
   +1  length ≥ 8
   +1  length ≥ 12  (rewards going beyond the common minimum)
   +1  has BOTH uppercase and lowercase letters
   +1  has at least one digit
   +1  has at least one symbol

   PENALTIES (caps the score):
   - Common password  → cap at 1 (Very Weak)
   - Contains a known sequence (qwerty, 1234…) → cap at 2 (Weak)

   ENTROPY CALCULATION:
   Determined by which character classes are present:
   - lowercase:  26 chars
   - uppercase:  26 chars
   - digits:     10 chars
   - symbols:    32 chars (approximation)
   entropy = length × log₂(pool_size)

   @param {string} pwd - The current value of the password input
─────────────────────────────────────────────────────────────────────────── */
function analyseStrength(pwd) {
  const label  = document.getElementById('strengthLabel');
  const entBox = document.getElementById('strengthEntropy');

  // ── Reset state when field is cleared ──
  if (!pwd) {
    document.querySelectorAll('.bar').forEach(b => {
      b.style.background = 'rgba(255,255,255,.06)';
      b.style.boxShadow  = '';
    });
    label.textContent = 'Waiting for input…';
    label.style.color  = 'var(--slate)';
    entBox.style.display = 'none';
    resetCriteria();
    return;
  }

  // ── Character-class detection (regex tests) ──
  const hasUpper  = /[A-Z]/.test(pwd);
  const hasLower  = /[a-z]/.test(pwd);
  const hasDigit  = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  // ── Structural checks ──
  const longEnough = pwd.length >= 12;

  // No repeated character: regex (.).*\1 matches any char appearing ≥ twice
  const noRepeat   = !/(.).*\1/.test(pwd);

  // No known sequence: check if any 4-char slice of a known sequence appears
  const noSeq      = !SEQUENCES.some(s => pwd.toLowerCase().includes(s.slice(0, 4)));

  // Not in the common password blocklist
  const notCommon  = !COMMON_PASSWORDS.has(pwd.toLowerCase());

  // ── Update the criteria checklist ──
  setCriteria('c-length',     longEnough);
  setCriteria('c-upper',      hasUpper);
  setCriteria('c-lower',      hasLower);
  setCriteria('c-digit',      hasDigit);
  setCriteria('c-symbol',     hasSymbol);
  setCriteria('c-norepeat',   noRepeat);
  setCriteria('c-nosequence', noSeq);
  setCriteria('c-nocommon',   notCommon);

  // ── Compute score (1–5) ──
  let score = 0;
  if (pwd.length >= 8)        score++;
  if (pwd.length >= 12)       score++;
  if (hasUpper && hasLower)   score++;
  if (hasDigit)               score++;
  if (hasSymbol)              score++;

  // Apply penalties
  if (!notCommon) score = Math.min(score, 1);
  if (!noSeq)     score = Math.min(score, 2);

  // Ensure score is at least 1 so we always display a color
  score = Math.max(1, score);

  // ── Animate the 5 strength bars ──
  document.querySelectorAll('.bar').forEach((b, i) => {
    if (i < score) {
      b.style.background = SCORE_COLORS[score - 1];
      b.style.boxShadow  = `0 0 8px ${SCORE_COLORS[score - 1]}`;
    } else {
      b.style.background = 'rgba(255,255,255,.06)';
      b.style.boxShadow  = '';
    }
  });

  label.textContent = SCORE_LABELS[score - 1];
  label.style.color  = SCORE_COLORS[score - 1];

  // ── Compute and display entropy metrics ──
  // Build the pool size estimate from which character classes are present
  let pool = 0;
  if (hasLower)  pool += 26;
  if (hasUpper)  pool += 26;
  if (hasDigit)  pool += 10;
  if (hasSymbol) pool += 32;
  pool = pool || 26; // fallback: assume lowercase if somehow nothing matched

  const bits     = (pwd.length * Math.log2(pool)).toFixed(1);
  const crackSec = Math.pow(2, parseFloat(bits)) / 1e10;

  document.getElementById('sEntropy').textContent   = bits;
  document.getElementById('sLength').textContent    = pwd.length;
  document.getElementById('sCrackTime').textContent = formatTime(crackSec);
  document.getElementById('sPool').textContent      = pool;
  entBox.style.display = 'grid';
}

/* ── setCriteria(id, pass) ───────────────────────────────────────────────────
   Toggles the `.pass` class on a criteria list item.
   CSS handles the color change and ✓/✗ symbol via ::before pseudo-element.

   @param {string}  id   - The DOM id of the <li> element
   @param {boolean} pass - Whether the criterion is satisfied
─────────────────────────────────────────────────────────────────────────── */
function setCriteria(id, pass) {
  document.getElementById(id).classList.toggle('pass', pass);
}

/* ── resetCriteria() ─────────────────────────────────────────────────────────
   Removes the `.pass` class from all criteria items,
   resetting them to the default "failed" (✗) state.
   Called when the password input is cleared.
─────────────────────────────────────────────────────────────────────────── */
function resetCriteria() {
  document.querySelectorAll('.criteria-list li').forEach(li => li.classList.remove('pass'));
}
