// Shared admin detail layout only. Submitted values are always assigned with textContent.
export const REGISTRATION_LABELS = Object.freeze({
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
});

export const REGISTRATION_SECTION_KEYS = Object.freeze([
  ['Contact Details', ['full-name', 'email', 'phone']],
  ['Property Details', ['property-address', 'property-type', 'property-type-details', 'bedrooms', 'bathrooms', 'property-notes']],
  ['Cleaning & Linen', ['service-required', 'service-details', 'linen-hire', 'cleaning-frequency', 'frequency-details']],
  ['Property Access', ['property-access', 'parking-instructions', 'lockbox-code']],
  ['Invoice / Billing Details', ['billing-details']],
  ['Referral', ['referral-source', 'referral-name', 'referral-agency-name', 'referral-source-details']],
  ['Permissions / Consent', ['marketing-consent', 'photo-permission']],
]);

const APPLICATION_SECTION_KEYS = Object.freeze([
  ['Personal Details', ['full-name', 'phone', 'email', 'current-area']],
  ['Work Rights / Transport', ['work-rights', 'visa-type', 'visa-expiry', 'visa-restrictions', 'driver-licence', 'own-car']],
  ['Work Preferences', ['work-type', 'earliest-start', 'hours-per-week', 'weekends', 'public-holidays', 'short-notice', 'planned-unavailability', 'planned-unavailability-details', 'stay-in-wanaka']],
  ['Availability', [
    'avail-monday-morning', 'avail-monday-afternoon', 'avail-monday-evening',
    'avail-tuesday-morning', 'avail-tuesday-afternoon', 'avail-tuesday-evening',
    'avail-wednesday-morning', 'avail-wednesday-afternoon', 'avail-wednesday-evening',
    'avail-thursday-morning', 'avail-thursday-afternoon', 'avail-thursday-evening',
    'avail-friday-morning', 'avail-friday-afternoon', 'avail-friday-evening',
    'avail-saturday-morning', 'avail-saturday-afternoon', 'avail-saturday-evening',
    'avail-sunday-morning', 'avail-sunday-afternoon', 'avail-sunday-evening',
  ]],
  ['Experience / Suitability', ['cleaning-experience', 'experience-details', 'airbnb-experience', 'independent', 'chemicals', 'physical-ability']],
  ['Referee', ['has-referee', 'reference-name', 'reference-contact']],
  ['Notes', ['why-alpine-shine', 'anything-else']],
  ['Consents', ['info-accurate', 'contact-consent']],
]);

const REGISTRATION_WIDE = new Set([
  'property-type-details', 'service-details', 'frequency-details', 'property-access',
  'parking-instructions', 'lockbox-code', 'billing-details', 'property-notes', 'referral-source-details',
]);
const APPLICATION_WIDE = new Set([
  'visa-restrictions', 'planned-unavailability-details', 'stay-in-wanaka', 'experience-details',
  'why-alpine-shine', 'anything-else',
]);

export function fieldLabel(key, labels = {}) {
  if (labels[key]) return labels[key];
  return key.replace(/^avail-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function registrationSectionKeys() {
  return REGISTRATION_SECTION_KEYS.flatMap(([, keys]) => keys);
}

export function applicationSectionKeys() {
  return APPLICATION_SECTION_KEYS.flatMap(([, keys]) => keys);
}

function appendPair(dl, { label, value, sensitive, wide }) {
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = sensitive ? `${label} (sensitive)` : label;
  dd.textContent = value;
  if (sensitive) {
    dt.className = [dt.className, 'sensitive'].filter(Boolean).join(' ');
    dd.className = [dd.className, 'sensitive'].filter(Boolean).join(' ');
  }
  if (wide) {
    dt.className = [dt.className, 'detail-wide'].filter(Boolean).join(' ');
    dd.className = [dd.className, 'detail-wide'].filter(Boolean).join(' ');
  }
  dl.append(dt, dd);
}

export function renderDetailHeading(box, title) {
  const heading = document.createElement('h3');
  heading.className = 'detail-title';
  heading.textContent = title;
  box.append(heading);
}

export function renderDetailSections(box, sections) {
  for (const section of sections) {
    const wrap = document.createElement('section');
    wrap.className = 'detail-section';
    const heading = document.createElement('h4');
    heading.className = 'detail-section-title';
    heading.textContent = section.title;
    const dl = document.createElement('dl');
    dl.className = 'detail-fields';
    for (const row of section.rows) appendPair(dl, row);
    wrap.append(heading, dl);
    box.append(wrap);
  }
}

export function quoteDetailSections(quote, format) {
  return [
    { title: 'Contact', rows: [
      { label: 'Full name', value: format.text(quote.fullName) },
      { label: 'Email', value: format.text(quote.email) },
      { label: 'Phone', value: format.text(quote.phone) },
    ] },
    { title: 'Property / Service', rows: [
      { label: 'Property address', value: format.text(quote.propertyAddress) },
      { label: 'Service', value: format.text(quote.service) },
      { label: 'Status', value: format.text(quote.status) },
    ] },
    { title: 'Message', rows: [
      { label: 'Message', value: format.text(quote.message), wide: true },
    ] },
    { title: 'Record', rows: [
      { label: 'Created at', value: format.date(quote.createdAt) },
    ] },
  ];
}

export function registrationDetailSections(item, format) {
  const form = item.formData || {};
  const used = new Set();
  const sections = REGISTRATION_SECTION_KEYS.map(([title, keys]) => {
    const rows = keys.map(key => {
      used.add(key);
      return {
        label: REGISTRATION_LABELS[key],
        value: format.text(form[key]),
        sensitive: key === 'lockbox-code',
        wide: REGISTRATION_WIDE.has(key),
      };
    });
    return { title, rows };
  });
  const extra = Object.keys(form).filter(key => !used.has(key));
  if (extra.length) {
    sections.push({
      title: 'Other submitted fields',
      rows: extra.map(key => ({ label: fieldLabel(key, REGISTRATION_LABELS), value: format.text(form[key]), wide: true })),
    });
  }
  sections.push({
    title: 'Status',
    rows: [
      { label: 'Status', value: format.text(item.status) },
      { label: 'Source', value: format.text(item.source) },
      { label: 'Created at', value: format.date(item.createdAt) },
    ],
  });
  return sections;
}

export function applicationDetailSections(item, format) {
  const form = item.formData || {};
  const used = new Set();
  const sections = APPLICATION_SECTION_KEYS.map(([title, keys]) => {
    const rows = keys.map(key => {
      used.add(key);
      return {
        label: fieldLabel(key, {}),
        value: format.text(form[key]),
        wide: APPLICATION_WIDE.has(key),
      };
    });
    return { title, rows };
  });
  const extra = Object.keys(form).filter(key => !used.has(key));
  if (extra.length) {
    const notes = sections.find(section => section.title === 'Notes');
    notes.rows.push(...extra.map(key => ({ label: fieldLabel(key, {}), value: format.text(form[key]), wide: true })));
  }
  const cvRows = [{ label: 'CV uploaded', value: item.hasCv ? 'Yes' : 'No' }];
  if (item.hasCv && item.cv && typeof item.cv === 'object') {
    cvRows.push(
      { label: 'File type', value: format.text(item.cv.contentType) },
      { label: 'Size', value: format.fileSize(item.cv.sizeBytes) },
      { label: 'Scan status', value: format.text(item.cv.scanStatus) },
    );
  }
  const consents = sections.findIndex(section => section.title === 'Consents');
  sections.splice(consents, 0, { title: 'CV', rows: cvRows });
  sections.push({
    title: 'Status',
    rows: [
      { label: 'Status', value: format.text(item.status) },
      { label: 'Source', value: format.text(item.source) },
      { label: 'Created at', value: format.date(item.createdAt) },
    ],
  });
  return sections;
}
