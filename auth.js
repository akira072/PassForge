/* ═══════════════════════════════════════════════
   PassForge — auth.js
   Login / Sign-up + session management.
   Sessions are stored in localStorage (client-demo).
═══════════════════════════════════════════════ */

function showForm(type) {
  document.getElementById('loginForm').classList.toggle('hidden', type !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', type !== 'signup');
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${type}"]`).classList.add('active');
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.auth-input').forEach(i => i.classList.remove('input-error'));
}

function setError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(fieldId + 'Err');
  if (field) field.classList.add('input-error');
  if (err)   err.textContent = msg;
}

function handleSignup() {
  clearErrors();
  const name  = document.getElementById('suName').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const pass  = document.getElementById('suPass').value;
  const conf  = document.getElementById('suConf').value;
  let valid   = true;

  if (!name)  { setError('suName',  'Name is required.'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('suEmail', 'Enter a valid email address.'); valid = false; }
  if (pass.length < 8) { setError('suPass', 'Password must be at least 8 characters.'); valid = false; }
  if (pass !== conf)   { setError('suConf', 'Passwords do not match.'); valid = false; }
  if (!valid) return;

  const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
  if (users[email]) { setError('suEmail', 'Email already registered.'); return; }

  users[email] = { name, email, pass };
  localStorage.setItem('pf_users', JSON.stringify(users));
  showAuthToast('Account created! Please log in.', 'green');
  showForm('login');
  document.getElementById('liEmail').value = email;
}

function handleLogin() {
  clearErrors();
  const email = document.getElementById('liEmail').value.trim();
  const pass  = document.getElementById('liPass').value;
  let valid   = true;

  if (!email) { setError('liEmail', 'Email is required.'); valid = false; }
  if (!pass)  { setError('liPass', 'Password is required.'); valid = false; }
  if (!valid) return;

  const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
  const user  = users[email];
  if (!user || user.pass !== pass) { setError('liPass', 'Invalid email or password.'); return; }

  localStorage.setItem('pf_session', JSON.stringify({ name: user.name, email }));
  showAuthToast('Welcome back, ' + user.name + '!', 'green');
  setTimeout(() => { window.location.href = 'intro.html'; }, 900);
}

function continueAsGuest() {
  localStorage.setItem('pf_session', JSON.stringify({ name: 'Guest', email: '' }));
  window.location.href = 'intro.html';
}

function logout() {
  localStorage.removeItem('pf_session');
  window.location.href = 'login.html';
}

function applySession() {
  const raw = localStorage.getItem('pf_session');
  if (!raw) { window.location.href = 'login.html'; return null; }
  return JSON.parse(raw);
}

function showAuthToast(msg, color) {
  const t = document.getElementById('authToast');
  t.textContent = msg;
  t.style.borderColor = color === 'green' ? 'var(--green)' : 'var(--red)';
  t.style.color       = color === 'green' ? 'var(--green)' : 'var(--red)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function toggleAuthPass(inputId, btn) {
  const el = document.getElementById(inputId);
  el.type  = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}
