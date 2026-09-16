import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { adminConfig } from './admin-config.js';

const TABS = ['quotes', 'registrations', 'applications'];
const login = document.querySelector('#admin-login-form'), panel = document.querySelector('#admin-content');
const status = document.querySelector('#admin-status');
const bodies = {
  quotes: document.querySelector('#quotes-body'),
  registrations: document.querySelector('#registrations-body'),
  applications: document.querySelector('#applications-body'),
};
const moreButtons = {
  quotes: document.querySelector('#load-more'),
  registrations: document.querySelector('#load-more-registrations'),
  applications: document.querySelector('#load-more-applications'),
};
const detailBoxes = {
  quotes: document.querySelector('#quote-details'),
  registrations: document.querySelector('#registration-details'),
  applications: document.querySelector('#application-details'),
};
const emptyMessages = {
  quotes: 'No quotes yet.',
  registrations: 'No registrations yet.',
  applications: 'No applications yet.',
};
const loadingMessages = {
  quotes: 'Loading quotes…',
  registrations: 'Loading registrations…',
  applications: 'Loading applications…',
};
const errorMessages = {
  quotes: 'Unable to load quotes. Please try again.',
  registrations: 'Unable to load registrations. Please try again.',
  applications: 'Unable to load applications. Please try again.',
};
const REGISTRATION_LABELS = {
  'full-name': 'Full name',
  email: 'Email',
  phone: 'Phone',
  'property-address': 'Property address',
  'property-type': 'Property type',
  'property-type-details': 'Property type details',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  'service-required': 'Service required',
  'service-details': 'Service details',
  'linen-hire': 'Linen hire',
  'cleaning-frequency': 'Cleaning frequency',
  'frequency-details': 'Frequency details',
  'property-access': 'Property access',
  'parking-instructions': 'Parking instructions',
  'lockbox-code': 'Lockbox code',
  'billing-details': 'Billing details',
  'property-notes': 'Property notes',
  'referral-source': 'Referral source',
  'referral-name': 'Referral name',
  'referral-agency-name': 'Referral agency name',
  'referral-source-details': 'Referral source details',
  'marketing-consent': 'Marketing consent',
  'photo-permission': 'Photo permission',
};
let auth, currentTab = 'quotes', generation = 0;
const nextCursor = { quotes: null, registrations: null, applications: null };

function clearPrivate() {
  generation++;
  if (panel) panel.hidden = true;
  for (const tab of TABS) {
    bodies[tab]?.replaceChildren();
    detailBoxes[tab]?.replaceChildren();
    nextCursor[tab] = null;
    if (moreButtons[tab]) moreButtons[tab].hidden = true;
  }
}

function message(text) { status.textContent = text; }
function loginPage() { clearPrivate(); location.replace('admin-login.html'); }
async function logout() { clearPrivate(); if (auth) await signOut(auth); location.replace('admin-login.html'); }
document.querySelector('#logout')?.addEventListener('click', logout);
window.addEventListener('pagehide', clearPrivate);
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

function endpointFor(name) {
  const endpoints = adminConfig.endpoints || {};
  if (name === 'quotes') return endpoints.quotes || adminConfig.endpoint || '';
  return endpoints[name] || '';
}

async function api(name, query = '') {
  if (!auth.currentUser) throw Object.assign(new Error(), { status: 401 });
  const url = endpointFor(name);
  if (!url) throw Object.assign(new Error(), { status: 503 });
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(url + query, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', credentials: 'omit' });
  const body = await response.json().catch(() => null);
  if (response.status !== 200 || body?.ok !== true) throw Object.assign(new Error(), { status: response.status });
  return body;
}

async function apiPost(name, payload) {
  if (!auth.currentUser) throw Object.assign(new Error(), { status: 401 });
  const url = endpointFor(name);
  if (!url) throw Object.assign(new Error(), { status: 503 });
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store', credentials: 'omit' });
  const body = await response.json().catch(() => null);
  if (response.status !== 200 || body?.ok !== true) throw Object.assign(new Error(), { status: response.status });
  return body;
}

async function failure(error, tab = currentTab) {
  if ([401, 403].includes(error.status)) { clearPrivate(); await signOut(auth); loginPage(); }
  else message(error.status === 429 ? 'Please wait a moment and try again.' : (errorMessages[tab] || 'Unable to load this section. Please try again.'));
}

function date(value) { return value ? new Date(value).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }) : '—'; }
function text(value) { return typeof value === 'string' && value ? value : (value || value === 0 ? String(value) : '—'); }
function fileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function fieldLabel(key, labels) {
  if (labels[key]) return labels[key];
  return key.replace(/^avail-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderRows(box, title, rows) {
  box.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = title;
  const dl = document.createElement('dl');
  for (const [label, value, sensitive] of rows) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label;
    if (sensitive) dt.className = 'sensitive';
    dd.textContent = value;
    dl.append(dt, dd);
  }
  box.append(heading, dl);
  box.focus();
}

function setTab(name) {
  if (!TABS.includes(name)) return;
  const changed = currentTab !== name;
  currentTab = name;
  document.querySelectorAll('.admin-nav [data-tab]').forEach(button => {
    if (button.dataset.tab === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('.admin-panel').forEach(section => { section.hidden = section.dataset.panel !== name; });
  if (changed) {
    generation++;
    for (const tab of TABS) if (tab !== name) detailBoxes[tab]?.replaceChildren();
  }
  if (!bodies[name]?.children.length) list(false);
  else message('');
}

async function details(tab, id) {
  const current = generation;
  message(tab === 'quotes' ? 'Loading quote…' : tab === 'registrations' ? 'Loading registration…' : 'Loading application…');
  try {
    const data = await api(tab, '?id=' + encodeURIComponent(id));
    if (current !== generation || !auth.currentUser || currentTab !== tab) return;
    const box = detailBoxes[tab];
    if (tab === 'quotes') {
      const quote = data.quote;
      renderRows(box, 'Quote details', [
        ['Full name', text(quote.fullName)],
        ['Email', text(quote.email)],
        ['Phone', text(quote.phone)],
        ['Property address', text(quote.propertyAddress)],
        ['Service', text(quote.service)],
        ['Message', text(quote.message)],
        ['Status', text(quote.status)],
        ['Created at', date(quote.createdAt)],
      ]);
      addQuoteStatusForm(box, quote);
    } else if (tab === 'registrations') {
      const item = data.registration, form = item.formData || {}, rows = [
        ['Status', text(item.status)],
        ['Source', text(item.source)],
        ['Created at', date(item.createdAt)],
      ];
      for (const key of Object.keys(REGISTRATION_LABELS)) {
        rows.push([REGISTRATION_LABELS[key], text(form[key]), key === 'lockbox-code']);
      }
      renderRows(box, 'Registration details', rows);
    } else {
      const item = data.application, form = item.formData || {}, rows = [
        ['Status', text(item.status)],
        ['Source', text(item.source)],
        ['Created at', date(item.createdAt)],
        ['CV uploaded', item.hasCv ? 'Yes' : 'No'],
      ];
      if (item.hasCv && item.cv && typeof item.cv === 'object') {
        rows.push(['File type', text(item.cv.contentType)]);
        rows.push(['Size', fileSize(item.cv.sizeBytes)]);
        rows.push(['Scan status', text(item.cv.scanStatus)]);
      }
      for (const key of Object.keys(form)) rows.push([fieldLabel(key, {}), text(form[key])]);
      renderRows(box, 'Application details', rows);
    }
    message('');
  } catch (e) { if (current === generation) await failure(e, tab); }
}

const QUOTE_STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['quoted', 'Quoted'], ['converted', 'Converted']];

function addQuoteStatusForm(box, quote) {
  const form = document.createElement('form');
  form.className = 'quote-status';
  form.addEventListener('submit', event => event.preventDefault());
  const label = document.createElement('label');
  const caption = document.createElement('span');
  caption.textContent = 'Update status';
  const select = document.createElement('select');
  select.id = 'quote-status';
  select.setAttribute('aria-label', 'Quote status');
  for (const [value, name] of QUOTE_STATUSES) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    select.append(option);
  }
  if (QUOTE_STATUSES.some(([value]) => value === quote.status)) select.value = quote.status;
  select.dataset.current = quote.status || '';
  label.append(caption, select);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'quote-status-save';
  button.textContent = 'Save';
  button.addEventListener('click', () => saveQuoteStatus(quote.id, select, button));
  form.append(label, button);
  box.append(form);
}

async function saveQuoteStatus(id, select, button) {
  const previous = select.dataset.current || select.value;
  const current = generation;
  button.disabled = true;
  message('Updating quote status…');
  try {
    await apiPost('updateQuoteStatus', { id, status: select.value });
    if (current !== generation || !auth.currentUser) return;
    nextCursor.quotes = null;
    await list(false, 'quotes');
    if (current !== generation || !auth.currentUser) return;
    await details('quotes', id);
    if (current === generation) message('Quote status updated.');
  } catch (e) {
    select.value = QUOTE_STATUSES.some(([value]) => value === previous) ? previous : select.value;
    if (current === generation) {
      if ([401, 403].includes(e.status)) await failure(e, 'quotes');
      else message(e.status === 429 ? 'Please wait a moment and try again.' : 'Unable to update quote status. Please try again.');
    }
  } finally { button.disabled = false; }
}

function appendRow(tab, item) {
  const tr = document.createElement('tr');
  let keys, openClass, nameKey;
  if (tab === 'quotes') { keys = ['createdAt', 'fullName', 'email', 'phone', 'service', 'status']; openClass = 'quote-open'; nameKey = 'fullName'; }
  else if (tab === 'registrations') { keys = ['createdAt', 'fullName', 'email', 'phone', 'propertyAddress', 'serviceRequired', 'status']; openClass = 'registration-open'; nameKey = 'fullName'; }
  else { keys = ['createdAt', 'fullName', 'email', 'phone', 'workType', 'availabilitySummary', 'hasCv', 'status']; openClass = 'application-open'; nameKey = 'fullName'; }
  for (const key of keys) {
    const td = document.createElement('td');
    if (key === nameKey) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = openClass;
      button.textContent = item[nameKey] || (tab === 'quotes' ? 'Open quote' : tab === 'registrations' ? 'Open registration' : 'Open application');
      button.addEventListener('click', () => details(tab, item.id));
      td.append(button);
    } else if (key === 'hasCv') td.textContent = item.hasCv ? 'Yes' : 'No';
    else td.textContent = key === 'createdAt' ? date(item[key]) : (item[key] || '—');
    tr.append(td);
  }
  bodies[tab].append(tr);
}

async function list(append = false, tab = currentTab) {
  const current = generation, more = moreButtons[tab], tbody = bodies[tab];
  if (!more || !tbody) return;
  more.disabled = true;
  message(loadingMessages[tab]);
  try {
    const data = await api(tab, append && nextCursor[tab] ? '?cursor=' + encodeURIComponent(nextCursor[tab]) : '');
    if (current !== generation || !auth.currentUser) return;
    if (!append) tbody.replaceChildren();
    const rows = tab === 'quotes' ? data.quotes : tab === 'registrations' ? data.registrations : data.applications;
    for (const item of rows) appendRow(tab, item);
    nextCursor[tab] = data.nextCursor;
    more.hidden = !nextCursor[tab];
    panel.hidden = false;
    message(tbody.children.length ? '' : emptyMessages[tab]);
  } catch (e) { if (current === generation) await failure(e, tab); }
  finally { more.disabled = false; }
}

document.querySelectorAll('.admin-nav [data-tab]').forEach(button => {
  button.addEventListener('click', () => setTab(button.dataset.tab));
});
document.querySelector('#load-more')?.addEventListener('click', () => list(true, 'quotes'));
document.querySelector('#load-more-registrations')?.addEventListener('click', () => list(true, 'registrations'));
document.querySelector('#load-more-applications')?.addEventListener('click', () => list(true, 'applications'));
document.querySelector('#refresh')?.addEventListener('click', () => { generation++; detailBoxes.quotes.replaceChildren(); nextCursor.quotes = null; list(false, 'quotes'); });
document.querySelector('#refresh-registrations')?.addEventListener('click', () => { generation++; detailBoxes.registrations.replaceChildren(); nextCursor.registrations = null; list(false, 'registrations'); });
document.querySelector('#refresh-applications')?.addEventListener('click', () => { generation++; detailBoxes.applications.replaceChildren(); nextCursor.applications = null; list(false, 'applications'); });

async function start() {
  if (!adminConfig.firebase.apiKey) { message('Admin access is not configured yet.'); return; }
  auth = getAuth(initializeApp(adminConfig.firebase, 'alpine-admin'));
  if (location.origin === 'http://127.0.0.1:5520' && adminConfig.firebase.projectId === 'demo-alpine-shine') connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await setPersistence(auth, browserSessionPersistence);
  if (login) {
    login.addEventListener('submit', async event => {
      event.preventDefault();
      const button = login.querySelector('button');
      if (button.disabled) return;
      button.disabled = true;
      message('Signing in…');
      try {
        await signInWithEmailAndPassword(auth, login.elements.email.value.trim(), login.elements.password.value);
        login.elements.password.value = '';
        await api('quotes', '?check=1');
        location.replace('admin.html');
      } catch (_) {
        await signOut(auth);
        login.elements.password.value = '';
        message('Unable to sign in. Check your details and admin access.');
      } finally { button.disabled = false; }
    });
    login.querySelector('button').disabled = false;
    message('');
  } else onAuthStateChanged(auth, user => { clearPrivate(); if (!user) loginPage(); else { currentTab = 'quotes'; setTab('quotes'); } });
}
start().catch(() => { clearPrivate(); message('Unable to start admin login. Please try again.'); });
