/* ═══════════════════════════════════════════════
   PassForge — encrypt.js
   AES-256-GCM encryption & decryption using the
   browser's native Web Crypto API (no libraries).

   DATA FORMAT (encrypted output):
   ┌──────────┬────────┬──────────────────────────┐
   │ Salt     │ IV     │ Ciphertext + Auth Tag     │
   │ 16 bytes │ 12 bytes│ variable                 │
   └──────────┴────────┴──────────────────────────┘
   The whole buffer is Base64-encoded for text transport.
═══════════════════════════════════════════════ */

/* ── Module State ── */
let encMode = 'encrypt'; // current mode: 'encrypt' | 'decrypt'

/* ── setEncMode(mode) ────────────────────────────────────────────────────────
   Switches the UI between Encrypt and Decrypt modes.
   Updates button highlight, input label text, and placeholder.
   Also hides any existing output so the user starts fresh.

   @param {string} mode - Either 'encrypt' or 'decrypt'
─────────────────────────────────────────────────────────────────────────── */
function setEncMode(mode) {
  encMode = mode;
  document.getElementById('modeEncBtn').classList.toggle('active', mode === 'encrypt');
  document.getElementById('modeDecBtn').classList.toggle('active', mode === 'decrypt');
  document.getElementById('inputLabel').textContent   = mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)';
  document.getElementById('encInput').placeholder     = mode === 'encrypt' ? 'Enter text to encrypt…' : 'Paste Base64 ciphertext…';
  document.getElementById('encOutput').style.display  = 'none';
}

/* ── toBase64(buf) ───────────────────────────────────────────────────────────
   Converts an ArrayBuffer to a Base64-encoded string.
   Used to produce a text-safe representation of the binary ciphertext.

   Process: ArrayBuffer → Uint8Array → char codes → btoa()

   @param {ArrayBuffer} buf
   @returns {string} Base64 string
─────────────────────────────────────────────────────────────────────────── */
function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/* ── fromBase64(str) ─────────────────────────────────────────────────────────
   Converts a Base64 string back to a Uint8Array.
   Used to decode the ciphertext before decryption.

   @param {string} str - Base64-encoded string
   @returns {Uint8Array}
─────────────────────────────────────────────────────────────────────────── */
function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

/* ── deriveKey(passphrase, salt) ─────────────────────────────────────────────
   Derives a 256-bit AES-GCM key from a human-readable passphrase
   using PBKDF2 (Password-Based Key Derivation Function 2).

   WHY PBKDF2?
   AES requires a fixed-length binary key (256 bits = 32 bytes), but users
   provide variable-length text passphrases. PBKDF2 "stretches" the passphrase
   into a key of the right size while making brute-force attacks slow.

   HOW IT WORKS:
   1. The passphrase is imported as raw key material (not directly usable as a key)
   2. PBKDF2 iteratively hashes it 310,000 times with SHA-256
   3. Each iteration takes ~microseconds; 310k iterations ≈ 310ms per guess
   4. This makes offline brute-force attacks ~310,000× slower

   WHY A RANDOM SALT?
   Without a salt, two users with the same passphrase would produce identical keys.
   The 16-byte random salt ensures that even identical passphrases yield
   completely different keys — defeating rainbow table attacks.

   @param {string}     passphrase - The user's secret passphrase text
   @param {Uint8Array} salt       - 16 bytes of random salt
   @returns {Promise<CryptoKey>}  - A 256-bit AES-GCM key
─────────────────────────────────────────────────────────────────────────── */
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();

  // Step 1: Import the raw passphrase bytes as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,            // not extractable — can't read the raw bytes back out
    ['deriveKey']
  );

  // Step 2: Derive a 256-bit AES-GCM key via PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310_000,  // OWASP 2023 recommended minimum for SHA-256
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,            // derived key is also not extractable
    ['encrypt', 'decrypt']
  );
}

/* ── runEncryption() ─────────────────────────────────────────────────────────
   Dispatches to encrypt or decrypt based on current encMode.

   ENCRYPT FLOW:
   1. Generate random 16-byte salt and 12-byte IV (initialization vector)
   2. Derive AES-256-GCM key from passphrase + salt via PBKDF2
   3. Encrypt plaintext bytes with AES-GCM (produces ciphertext + 16-byte auth tag)
   4. Concatenate: salt(16) ‖ iv(12) ‖ ciphertext → Base64

   DECRYPT FLOW:
   1. Decode Base64 → combined binary
   2. Slice out salt[0:16], iv[16:28], ciphertext[28:]
   3. Re-derive the key from the passphrase + extracted salt
   4. AES-GCM decrypt: validates the auth tag automatically
      → throws DOMException if the key is wrong or data was tampered with

   WHY AES-GCM?
   GCM (Galois/Counter Mode) is an Authenticated Encryption with Associated
   Data (AEAD) cipher. It provides both:
   - Confidentiality: ciphertext reveals nothing about plaintext
   - Integrity:       any modification to the ciphertext causes decryption to fail

   WHY A RANDOM IV?
   AES-GCM is semantically secure only when the IV is unique per encryption.
   Reusing an IV with the same key leaks the XOR of two plaintexts.
   We generate a fresh cryptographically random 12-byte IV every time.
─────────────────────────────────────────────────────────────────────────── */
async function runEncryption() {
  const input   = document.getElementById('encInput').value.trim();
  const pass    = document.getElementById('encKey').value;
  const outBox  = document.getElementById('encOutput');
  const outText = document.getElementById('encOutputText');

  if (!input) { showToast('Enter text first!');       return; }
  if (!pass)  { showToast('Enter a passphrase!');     return; }

  try {
    if (encMode === 'encrypt') {
      // ── Encryption ──────────────────────────────────────────
      const salt = crypto.getRandomValues(new Uint8Array(16)); // random salt
      const iv   = crypto.getRandomValues(new Uint8Array(12)); // random IV
      const key  = await deriveKey(pass, salt);

      const enc       = new TextEncoder();
      const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(input)
      );

      // Pack: salt ‖ iv ‖ ciphertext into a single Uint8Array
      const combined = new Uint8Array(16 + 12 + cipherBuf.byteLength);
      combined.set(salt, 0);                          // bytes  0–15
      combined.set(iv,   16);                         // bytes 16–27
      combined.set(new Uint8Array(cipherBuf), 28);    // bytes 28–end

      outText.textContent     = toBase64(combined.buffer);
      outBox.style.display    = 'block';
      outBox.style.color      = 'var(--green)';

    } else {
      // ── Decryption ──────────────────────────────────────────
      const combined = fromBase64(input);
      const salt     = combined.slice(0, 16);   // extract salt
      const iv       = combined.slice(16, 28);  // extract IV
      const cipher   = combined.slice(28);      // rest is ciphertext

      const key      = await deriveKey(pass, salt);

      // AES-GCM decrypt: verifies the auth tag automatically.
      // If the passphrase is wrong or data was tampered with, this throws.
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipher
      );

      outText.textContent  = new TextDecoder().decode(plainBuf);
      outBox.style.display = 'block';
      outBox.style.color   = 'var(--blue)';
    }

  } catch (e) {
    // GCM auth tag verification failure → wrong key or corrupted data
    outText.textContent  = '⚠ Decryption failed — wrong passphrase or corrupted data.';
    outBox.style.display = 'block';
    outBox.style.color   = 'var(--red)';
  }
}

/* ── clearEncryption() ───────────────────────────────────────────────────────
   Resets all three encryption inputs and hides the output panel.
─────────────────────────────────────────────────────────────────────────── */
function clearEncryption() {
  document.getElementById('encInput').value   = '';
  document.getElementById('encKey').value     = '';
  document.getElementById('encOutput').style.display = 'none';
}
