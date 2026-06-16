/* ═══════════════════════════════════════════════
   PassForge — generator.js
   Password & passphrase generation using the
   Web Crypto API for true randomness.
═══════════════════════════════════════════════ */

/* ── Character Pools ─────────────────────────────────────────────────────────
   Each pool is a string of characters belonging to one class.
   We build a combined pool at runtime based on the user's checkbox selections.
   The AMBIG regex matches characters that look alike (0/O, 1/l/I)
   and is used to strip them when "Exclude Ambiguous" is checked.
─────────────────────────────────────────────────────────────────────────── */
const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIG   = /[O0lI1]/g;

/* ── Word List for Passphrases ───────────────────────────────────────────────
   54 common, easy-to-remember words used as a diceware-style vocabulary.
   Passphrase entropy ≈ log₂(54^5 × 5 separators × 100 number combos) ≈ 55 bits
─────────────────────────────────────────────────────────────────────────── */
const WORD_LIST = [
  'apple','bridge','cloud','dragon','ember','falcon','grove','harbor',
  'island','jungle','kite','lemon','marble','noble','ocean','panda',
  'quartz','river','storm','tundra','ultra','vault','willow','xenon',
  'yellow','zenith','amber','blaze','cedar','dusk','eagle','frost',
  'glacier','hollow','iron','jade','knight','lunar','mango','nectar',
  'onyx','prism','quiet','raven','silver','torch','umber','viper',
  'wave','xeric','yonder','zinc','arctic','bronze','coral','delta'
];

/* ── secureRandInt(max) ──────────────────────────────────────────────────────
   Returns a cryptographically secure random integer in the range [0, max).

   WHY NOT Math.random()?
   Math.random() is a pseudo-random number generator (PRNG) seeded by the
   runtime. It is predictable if the seed is known and NOT suitable for
   security-sensitive applications.

   crypto.getRandomValues() reads from the operating system's entropy source
   (e.g., /dev/urandom on Linux), which is truly unpredictable.

   WHY REJECTION SAMPLING?
   Naive approach: `crypto.getRandomValues(arr)[0] % max`
   This creates a modulo bias: if 0xFFFFFFFF is not evenly divisible by max,
   some values in [0, max) will appear slightly more often than others.

   Fix: discard any value ≥ floor(0xFFFFFFFF / max) * max.
   This ensures the remaining values map uniformly onto [0, max).
─────────────────────────────────────────────────────────────────────────── */
function secureRandInt(max) {
  const arr = new Uint32Array(1);
  let v;
  do {
    crypto.getRandomValues(arr);
    v = arr[0];
  } while (v >= Math.floor(0xFFFFFFFF / max) * max);
  return v % max;
}

/* ── buildPool() ─────────────────────────────────────────────────────────────
   Reads the checkbox state from the DOM and concatenates the relevant
   character class strings into a single pool string.
   Strips ambiguous characters if that option is enabled.
─────────────────────────────────────────────────────────────────────────── */
function buildPool() {
  let pool = '';
  const noAmbig = document.getElementById('noAmbig').checked;
  if (document.getElementById('useUpper').checked)   pool += UPPER;
  if (document.getElementById('useLower').checked)   pool += LOWER;
  if (document.getElementById('useDigits').checked)  pool += DIGITS;
  if (document.getElementById('useSymbols').checked) pool += SYMBOLS;
  if (noAmbig) pool = pool.replace(AMBIG, '');
  return pool;
}

/* ── generatePassword() ──────────────────────────────────────────────────────
   Main password generation function. Algorithm:

   1. Build character pool from user options.
   2. GUARANTEE at least one character from each selected class.
      (Without this, "has uppercase" might fail by random chance.)
   3. Fill remaining slots either by:
      a. Picking randomly from the full pool (repeats allowed), or
      b. Removing each used char from a copy of the pool (no repeats).
   4. Fisher-Yates shuffle the result so required chars aren't always first.
   5. Display the password and compute entropy stats.
─────────────────────────────────────────────────────────────────────────── */
function generatePassword() {
  const len      = parseInt(document.getElementById('lenSlider').value);
  const noRepeat = document.getElementById('noRepeat').checked;
  const pool     = buildPool();

  if (!pool) {
    showToast('Select at least one character set!');
    return;
  }

  // Step 2: guarantee at least one char per selected class
  let required = [];
  if (document.getElementById('useUpper').checked)   required.push(UPPER[secureRandInt(UPPER.length)]);
  if (document.getElementById('useLower').checked)   required.push(LOWER[secureRandInt(LOWER.length)]);
  if (document.getElementById('useDigits').checked)  required.push(DIGITS[secureRandInt(DIGITS.length)]);
  if (document.getElementById('useSymbols').checked) required.push(SYMBOLS[secureRandInt(SYMBOLS.length)]);

  // Step 3: fill remaining characters
  let pwd   = [...required];
  let avail = noRepeat ? pool.split('') : null; // clone pool for no-repeat mode

  for (let i = pwd.length; i < len; i++) {
    if (noRepeat) {
      if (!avail.length) break; // pool exhausted — can't fill more without repeats
      const idx = secureRandInt(avail.length);
      pwd.push(avail[idx]);
      avail.splice(idx, 1); // remove used character from available list
    } else {
      pwd.push(pool[secureRandInt(pool.length)]);
    }
  }

  // Step 4: Fisher-Yates shuffle
  // Iterates from the last element down, swapping each with a random earlier element.
  // This produces a uniformly random permutation with O(n) time.
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  const result = pwd.join('');
  document.getElementById('genOutput').value = result;
  showEntropyStats(result, pool.length);
}

/* ── generatePassphrase() ────────────────────────────────────────────────────
   Generates a diceware-style passphrase: 5 random words + a random separator
   + a 2-digit number. Example: "glacier!amber!hollow!wave!cedar!47"

   Passphrases are more memorable than random character strings, while still
   providing strong entropy (~55 bits for this configuration).
─────────────────────────────────────────────────────────────────────────── */
function generatePassphrase() {
  const words = Array.from({ length: 5 }, () => WORD_LIST[secureRandInt(WORD_LIST.length)]);
  const seps  = ['-', '_', '.', '!', '#'];
  const sep   = seps[secureRandInt(seps.length)];
  const num   = secureRandInt(100).toString().padStart(2, '0');
  const phrase = words.join(sep) + sep + num;

  document.getElementById('genOutput').value = phrase;

  // Entropy = log₂(wordList^5 × separators × 100 possible numbers)
  const bits = Math.log2(Math.pow(WORD_LIST.length, 5) * seps.length * 100);
  showEntropyStats(phrase, WORD_LIST.length, bits);
}

/* ── showEntropyStats(pwd, poolSize, overrideBits) ───────────────────────────
   Calculates and displays entropy metrics for a generated password.

   ENTROPY FORMULA:
   entropy (bits) = length × log₂(pool_size)

   This is the information-theoretic measure of unpredictability.
   Each bit doubles the number of possible values — so 64 bits means
   2^64 ≈ 18 quintillion possible passwords.

   CRACK TIME ESTIMATE:
   crack_time = 2^entropy_bits ÷ guesses_per_second
   We assume 10^10 (10 billion) guesses/sec, which represents a fast GPU
   attacking a bcrypt or PBKDF2-protected hash offline.

   @param {string} pwd       - The generated password (used for display only)
   @param {number} poolSize  - Number of unique characters in the pool
   @param {number} [overrideBits] - Pre-calculated entropy (used for passphrases)
─────────────────────────────────────────────────────────────────────────── */
function showEntropyStats(pwd, poolSize, overrideBits) {
  const bits     = overrideBits || (pwd.length * Math.log2(poolSize));
  const guesses  = Math.pow(2, bits);
  const crackStr = formatTime(guesses / 1e10);
  const rating   = bits < 40  ? 'Very Weak'
                 : bits < 60  ? 'Weak'
                 : bits < 80  ? 'Fair'
                 : bits < 100 ? 'Strong'
                 : 'Very Strong';

  document.getElementById('eEntropy').textContent  = bits.toFixed(1);
  document.getElementById('ePoolSize').textContent = poolSize;
  document.getElementById('eCrackTime').textContent = crackStr;
  document.getElementById('eStrength').textContent  = rating;
  document.getElementById('entropyBox').style.display = 'grid';
  document.getElementById('crackNote').style.display  = 'block';
}
