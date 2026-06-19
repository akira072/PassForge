const COMMON_PASSWORDS = new Set([
  'password', '123456', 'password1', 'qwerty', 'abc123',
  'iloveyou', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'sunshine', 'princess', '123456789',
  '12345678', '11111111', 'password123', 'test', 'guest', 'login'
]);

const SEQUENCES = [
  'abcdefghijklmnop',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '01234567890'
];

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

function analyseStrength(pwd) {
  const label  = document.getElementById('strengthLabel');
  const entBox = document.getElementById('strengthEntropy');

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

  const hasUpper  = /[A-Z]/.test(pwd);
  const hasLower  = /[a-z]/.test(pwd);
  const hasDigit  = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  const longEnough = pwd.length >= 12;

  const noRepeat   = !/(.).*\1/.test(pwd);

  const noSeq      = !SEQUENCES.some(s => pwd.toLowerCase().includes(s.slice(0, 4)));

  const notCommon  = !COMMON_PASSWORDS.has(pwd.toLowerCase());

  setCriteria('c-length',     longEnough);
  setCriteria('c-upper',      hasUpper);
  setCriteria('c-lower',      hasLower);
  setCriteria('c-digit',      hasDigit);
  setCriteria('c-symbol',     hasSymbol);
  setCriteria('c-norepeat',   noRepeat);
  setCriteria('c-nosequence', noSeq);
  setCriteria('c-nocommon',   notCommon);

  let score = 0;
  if (pwd.length >= 8)        score++;
  if (pwd.length >= 12)       score++;
  if (hasUpper && hasLower)   score++;
  if (hasDigit)               score++;
  if (hasSymbol)              score++;

  if (!notCommon) score = Math.min(score, 1);
  if (!noSeq)     score = Math.min(score, 2);

  score = Math.max(1, score);

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

  let pool = 0;
  if (hasLower)  pool += 26;
  if (hasUpper)  pool += 26;
  if (hasDigit)  pool += 10;
  if (hasSymbol) pool += 32;
  pool = pool || 26; 

  const bits     = (pwd.length * Math.log2(pool)).toFixed(1);
  const crackSec = Math.pow(2, parseFloat(bits)) / 1e10;

  document.getElementById('sEntropy').textContent   = bits;
  document.getElementById('sLength').textContent    = pwd.length;
  document.getElementById('sCrackTime').textContent = formatTime(crackSec);
  document.getElementById('sPool').textContent      = pool;
  entBox.style.display = 'grid';
}

function setCriteria(id, pass) {
  document.getElementById(id).classList.toggle('pass', pass);
}

function resetCriteria() {
  document.querySelectorAll('.criteria-list li').forEach(li => li.classList.remove('pass'));
}
