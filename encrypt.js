let encMode = 'encrypt';

function setEncMode(mode) {
  encMode = mode;
  document.getElementById('modeEncBtn').classList.toggle('active', mode === 'encrypt');
  document.getElementById('modeDecBtn').classList.toggle('active', mode === 'decrypt');
  document.getElementById('inputLabel').textContent   = mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)';
  document.getElementById('encInput').placeholder     = mode === 'encrypt' ? 'Enter text to encrypt…' : 'Paste Base64 ciphertext…';
  document.getElementById('encOutput').style.display  = 'none';
}

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,          
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310_000, 
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,          
    ['encrypt', 'decrypt']
  );
}

async function runEncryption() {
  const input   = document.getElementById('encInput').value.trim();
  const pass    = document.getElementById('encKey').value;
  const outBox  = document.getElementById('encOutput');
  const outText = document.getElementById('encOutputText');

  if (!input) { showToast('Enter text first!');       return; }
  if (!pass)  { showToast('Enter a passphrase!');     return; }

  try {
    if (encMode === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16)); 
      const iv   = crypto.getRandomValues(new Uint8Array(12)); 
      const key  = await deriveKey(pass, salt);

      const enc       = new TextEncoder();
      const cipherBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(input)
      );
      const combined = new Uint8Array(16 + 12 + cipherBuf.byteLength);
      combined.set(salt, 0);                          
      combined.set(iv,   16);                        
      combined.set(new Uint8Array(cipherBuf), 28);    

      outText.textContent     = toBase64(combined.buffer);
      outBox.style.display    = 'block';
      outBox.style.color      = 'var(--green)';

    } else {
     
      const combined = fromBase64(input);
      const salt     = combined.slice(0, 16);   
      const iv       = combined.slice(16, 28);  
      const cipher   = combined.slice(28);     

      const key      = await deriveKey(pass, salt);
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
    outText.textContent  = '⚠ Decryption failed — wrong passphrase or corrupted data.';
    outBox.style.display = 'block';
    outBox.style.color   = 'var(--red)';
  }
}
function clearEncryption() {
  document.getElementById('encInput').value   = '';
  document.getElementById('encKey').value     = '';
  document.getElementById('encOutput').style.display = 'none';
}
