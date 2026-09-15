import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { adminConfig } from './admin-config.js';

const login = document.querySelector('#admin-login-form'), panel = document.querySelector('#admin-content');
const status = document.querySelector('#admin-status'), tbody = document.querySelector('#quotes-body');
let auth, nextCursor = null, generation = 0;
function clearPrivate() { generation++; if (panel) panel.hidden = true; tbody?.replaceChildren(); document.querySelector('#quote-details')?.replaceChildren(); nextCursor = null; }
function message(text) { status.textContent = text; }
function loginPage() { clearPrivate(); location.replace('admin-login.html'); }
async function logout() { clearPrivate(); if (auth) await signOut(auth); location.replace('admin-login.html'); }
document.querySelector('#logout')?.addEventListener('click', logout);
// Remove private DOM from back/forward snapshots; bfcache restores reauthenticate.
window.addEventListener('pagehide', clearPrivate);
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
async function api(query = '') {
  if (!auth.currentUser) throw Object.assign(new Error(), { status: 401 });
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(adminConfig.endpoint + query, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', credentials: 'omit' });
  const body = await response.json().catch(() => null);
  if (response.status !== 200 || body?.ok !== true) throw Object.assign(new Error(), { status: response.status });
  return body;
}
async function failure(error) {
  if ([401, 403].includes(error.status)) { clearPrivate(); await signOut(auth); loginPage(); }
  else message(error.status === 429 ? 'Please wait a moment and try again.' : 'Unable to load quotes. Please try again.');
}
function date(value) { return value ? new Date(value).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : '—'; }
async function details(id) {
  const current = generation; message('Loading quote…');
  try { const { quote } = await api('?id=' + encodeURIComponent(id)); if (current !== generation || !auth.currentUser) return;
    const box = document.querySelector('#quote-details'); box.replaceChildren();
    const title = document.createElement('h2'); title.textContent = 'Quote details'; box.append(title);
    const dl = document.createElement('dl');
    for (const [key, label] of [['fullName','Full name'],['email','Email'],['phone','Phone'],['propertyAddress','Property address'],['service','Service'],['message','Message'],['status','Status'],['createdAt','Created at']]) {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = key === 'createdAt' ? date(quote[key]) : (quote[key] || '—'); dl.append(dt, dd);
    } box.append(dl); box.focus(); message('');
  } catch (e) { if (current === generation) await failure(e); }
}
async function list(append = false) {
  const current = generation, more = document.querySelector('#load-more'); more.disabled = true; message('Loading quotes…');
  try { const data = await api(append && nextCursor ? '?cursor=' + encodeURIComponent(nextCursor) : ''); if (current !== generation || !auth.currentUser) return;
    if (!append) tbody.replaceChildren();
    for (const quote of data.quotes) { const tr = document.createElement('tr'); for (const key of ['createdAt','fullName','email','phone','service','status']) {
      const td = document.createElement('td'); if (key === 'fullName') { const button = document.createElement('button'); button.type = 'button'; button.className = 'quote-open'; button.textContent = quote.fullName || 'Open quote'; button.addEventListener('click', () => details(quote.id)); td.append(button); }
      else td.textContent = key === 'createdAt' ? date(quote[key]) : (quote[key] || '—'); tr.append(td);
    } tbody.append(tr); }
    nextCursor = data.nextCursor; more.hidden = !nextCursor; panel.hidden = false; message(tbody.children.length ? '' : 'No quotes yet.');
  } catch (e) { if (current === generation) await failure(e); } finally { more.disabled = false; }
}
document.querySelector('#load-more')?.addEventListener('click', () => list(true));
document.querySelector('#refresh')?.addEventListener('click', () => { generation++; document.querySelector('#quote-details').replaceChildren(); list(); });
async function start() {
  if (!adminConfig.firebase.apiKey) { message('Admin access is not configured yet.'); return; }
  auth = getAuth(initializeApp(adminConfig.firebase, 'alpine-admin'));
  // Test-only emulator setting is accepted on one explicit local origin.
  if (location.origin === 'http://127.0.0.1:5520' && adminConfig.firebase.projectId === 'demo-alpine-shine') connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await setPersistence(auth, browserSessionPersistence);
  if (login) {
    login.addEventListener('submit', async event => { event.preventDefault(); const button = login.querySelector('button'); if (button.disabled) return; button.disabled = true; message('Signing in…');
      try { await signInWithEmailAndPassword(auth, login.elements.email.value.trim(), login.elements.password.value); login.elements.password.value = ''; await api('?check=1'); location.replace('admin.html'); }
      catch (_) { await signOut(auth); login.elements.password.value = ''; message('Unable to sign in. Check your details and admin access.'); }
      finally { button.disabled = false; }
    }); login.querySelector('button').disabled = false; message('');
  } else onAuthStateChanged(auth, user => { clearPrivate(); if (!user) loginPage(); else list(); });
}
start().catch(() => { clearPrivate(); message('Unable to start admin login. Please try again.'); });
