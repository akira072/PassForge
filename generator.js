const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIG   = /[O0lI1]/g;

const WORD_LIST = [
  'apple','bridge','cloud','dragon','ember','falcon','grove','harbor',
  'island','jungle','kite','lemon','marble','noble','ocean','panda',
  'quartz','river','storm','tundra','ultra','vault','willow','xenon',
  'yellow','zenith','amber','blaze','cedar','dusk','eagle','frost',
  'glacier','hollow','iron','jade','knight','lunar','mango','nectar',
  'onyx','prism','quiet','raven','silver','torch','umber','viper',
  'wave','xeric','yonder','zinc','arctic','bronze','coral','delta'
];

function secureRandInt(max) {
  const arr = new Uint32Array(1);
  let v;
  do {
    crypto.getRandomValues(arr);
    v = arr[0];
  } while (v >= Math.floor(0xFFFFFFFF / max) * max);
  return v % max;
}
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
function generatePassword() {
  const len      = parseInt(document.getElementById('lenSlider').value);
  const noRepeat = document.getElementById('noRepeat').checked;
  const pool     = buildPool();

  if (!pool) {
    showToast('Select at least one character set!');
    return;
  }
  let required = [];
  if (document.getElementById('useUpper').checked)   required.push(UPPER[secureRandInt(UPPER.length)]);
  if (document.getElementById('useLower').checked)   required.push(LOWER[secureRandInt(LOWER.length)]);
  if (document.getElementById('useDigits').checked)  required.push(DIGITS[secureRandInt(DIGITS.length)]);
  if (document.getElementById('useSymbols').checked) required.push(SYMBOLS[secureRandInt(SYMBOLS.length)]);

  let pwd   = [...required];
  let avail = noRepeat ? pool.split('') : null; 

  for (let i = pwd.length; i < len; i++) {
    if (noRepeat) {
      if (!avail.length) break; 
      const idx = secureRandInt(avail.length);
      pwd.push(avail[idx]);
      avail.splice(idx, 1);
    } else {
      pwd.push(pool[secureRandInt(pool.length)]);
    }
  }

  for (let i = pwd.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  const result = pwd.join('');
  document.getElementById('genOutput').value = result;
  showEntropyStats(result, pool.length);
}


function generatePassphrase() {
  const words = Array.from({ length: 5 }, () => WORD_LIST[secureRandInt(WORD_LIST.length)]);
  const seps  = ['-', '_', '.', '!', '#'];
  const sep   = seps[secureRandInt(seps.length)];
  const num   = secureRandInt(100).toString().padStart(2, '0');
  const phrase = words.join(sep) + sep + num;

  document.getElementById('genOutput').value = phrase;

  const bits = Math.log2(Math.pow(WORD_LIST.length, 5) * seps.length * 100);
  showEntropyStats(phrase, WORD_LIST.length, bits);
}

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
