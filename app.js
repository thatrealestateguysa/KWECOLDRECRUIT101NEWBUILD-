// ===== CONFIG =====
const API_BASE = 'https://script.google.com/macros/s/AKfycby_7tljR5bveYFaG0-EwugxTJJxr0cH6RcJ6haMbuQIAsvwnlzZtVDtYtg3XsFq-jubmw/exec';

let sources = [];
let statuses = [];
let leads = [];
let activeStatusFilter = 'All';

const apiStatusEl = document.getElementById('apiStatus');
const leadCountEl = document.getElementById('leadCount');
const leadsBodyEl = document.getElementById('leadsBody');
const refreshBtn = document.getElementById('refreshBtn');
const sendEmailBtn = document.getElementById('sendEmailBtn');
const selectAllEl = document.getElementById('selectAll');
const statusTabsEl = document.getElementById('statusTabs');

async function apiGet(action) {
  const url = API_BASE + '?action=' + encodeURIComponent(action);
  setApiStatus('Loading ' + action + '…');
  const res = await fetch(url, { method: 'GET', redirect: 'follow' });
  if (!res.ok) {
    throw new Error('GET ' + action + ' failed: ' + res.status);
  }
  const data = await res.json();
  setApiStatus('Connected', 'ok');
  return data;
}

async function apiPost(payload) {
  setApiStatus('Saving…');
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error('POST failed: ' + res.status);
  }
  const data = await res.json();
  setApiStatus('Connected', 'ok');
  return data;
}

function setApiStatus(text, state) {
  apiStatusEl.textContent = text;
  apiStatusEl.classList.remove('ok', 'error');
  if (state) apiStatusEl.classList.add(state);
}

async function initialise() {
  try {
    const lists = await apiGet('lists');
    sources = lists.sources || [];
    statuses = lists.statuses || [];

    const leadData = await apiGet('leads');
    leads = leadData.leads || [];
    renderStatusTabs();
    renderLeads();
  } catch (err) {
    console.error(err);
    setApiStatus('Error: ' + err.message, 'error');
  }
}

function buildStatusCounts() {
  const counts = {};
  leads.forEach(lead => {
    const st = lead.status || 'Unassigned';
    counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

function renderStatusTabs() {
  statusTabsEl.innerHTML = '';
  const counts = buildStatusCounts();
  const allCount = leads.length;

  const allTab = createStatusTabElement('All', allCount);
  if (activeStatusFilter === 'All') allTab.classList.add('active');
  statusTabsEl.appendChild(allTab);

  const keys = Object.keys(counts).sort();
  keys.forEach(key => {
    const tab = createStatusTabElement(key, counts[key]);
    if (activeStatusFilter === key) tab.classList.add('active');
    statusTabsEl.appendChild(tab);
  });
}

function createStatusTabElement(label, count) {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'status-tab';
  tab.dataset.status = label;
  tab.innerHTML = '<span class="label">' + label + '</span><span class="count">(' + count + ')</span>';
  tab.addEventListener('click', () => {
    activeStatusFilter = label;
    renderStatusTabs();
    renderLeads();
  });
  return tab;
}

function getFilteredLeads() {
  if (activeStatusFilter === 'All') return leads;
  return leads.filter(lead => (lead.status || 'Unassigned') === activeStatusFilter);
}

function renderLeads() {
  leadsBodyEl.innerHTML = '';
  const filtered = getFilteredLeads();
  leadCountEl.textContent = (filtered.length || 0) + ' leads';

  if (!filtered.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 11;
    td.textContent = 'No leads found.';
    tr.appendChild(td);
    leadsBodyEl.appendChild(tr);
    return;
  }

  filtered.forEach((lead) => {
    const tr = document.createElement('tr');

    const selTd = document.createElement('td');
    selTd.className = 'checkbox-cell';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.row = lead.row;
    selTd.appendChild(cb);
    tr.appendChild(selTd);

    const sourceTd = document.createElement('td');
    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'source-pill';
    sourceSpan.textContent = lead.source || '—';
    sourceTd.appendChild(sourceSpan);
    tr.appendChild(sourceTd);

    const statusTd = document.createElement('td');
    const statusSel = document.createElement('select');
    statusSel.className = 'status-select';
    statusSel.dataset.row = lead.row;

    const blankOpt = document.createElement('option');
    blankOpt.value = '';
    blankOpt.textContent = '—';
    statusSel.appendChild(blankOpt);

    statuses.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      if (lead.status === st) opt.selected = true;
      statusSel.appendChild(opt);
    });

    statusSel.addEventListener('change', async () => {
      const newStatus = statusSel.value;
      try {
        await apiPost({ action: 'updateStatus', row: lead.row, status: newStatus });
        // update local lead
        const idx = leads.findIndex(l => l.row === lead.row);
        if (idx !== -1) {
          leads[idx].status = newStatus;
        }
        renderStatusTabs();
        renderLeads();
      } catch (err) {
        console.error(err);
        setApiStatus('Error updating status', 'error');
      }
    });

    statusTd.appendChild(statusSel);
    tr.appendChild(statusTd);

    const waTd = document.createElement('td');
    if (lead.whatsapp) {
      const waBtn = document.createElement('button');
      waBtn.textContent = 'Open WhatsApp';
      waBtn.className = 'whatsapp-btn';
      waBtn.addEventListener('click', () => {
        window.open(lead.whatsapp, '_blank');
      });
      waTd.appendChild(waBtn);
    } else {
      waTd.textContent = '—';
    }
    tr.appendChild(waTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = lead.name || '';
    tr.appendChild(nameTd);

    const surnameTd = document.createElement('td');
    surnameTd.textContent = lead.surname || '';
    tr.appendChild(surnameTd);

    const mobileTd = document.createElement('td');
    mobileTd.textContent = lead.mobile || '';
    tr.appendChild(mobileTd);

    const emailTd = document.createElement('td');
    emailTd.textContent = lead.email || '';
    tr.appendChild(emailTd);

    const agencyTd = document.createElement('td');
    agencyTd.textContent = lead.agency || '';
    tr.appendChild(agencyTd);

    const regionTd = document.createElement('td');
    regionTd.textContent = lead.region || '';
    tr.appendChild(regionTd);

    const notesTd = document.createElement('td');
    notesTd.className = 'notes-cell';

    const notesArea = document.createElement('textarea');
    notesArea.className = 'notes-input';
    notesArea.value = lead.notes || '';
    notesArea.rows = 2;
    notesTd.appendChild(notesArea);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'row-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      const newNotes = notesArea.value;
      try {
        await apiPost({ action: 'updateNotes', row: lead.row, notes: newNotes });
        const idx = leads.findIndex(l => l.row === lead.row);
        if (idx !== -1) {
          leads[idx].notes = newNotes;
        }
      } catch (err) {
        console.error(err);
        setApiStatus('Error saving notes', 'error');
      }
    });
    actionsDiv.appendChild(saveBtn);
    notesTd.appendChild(actionsDiv);

    tr.appendChild(notesTd);

    leadsBodyEl.appendChild(tr);
  });
}

async function handleSendEmails() {
  const selectedRows = Array.from(
    leadsBodyEl.querySelectorAll('input[type="checkbox"]:checked')
  ).map(cb => Number(cb.dataset.row));

  if (!selectedRows.length) {
    setApiStatus('No rows selected', 'error');
    return;
  }

  try {
    const result = await apiPost({
      action: 'sendEmails',
      rows: selectedRows,
      dryRun: false
    });
    const count = result.sentCount || 0;
    setApiStatus('Emails sent: ' + count, 'ok');
  } catch (err) {
    console.error(err);
    setApiStatus('Error sending emails', 'error');
  }
}

function handleSelectAll() {
  const checked = selectAllEl.checked;
  const checkboxes = leadsBodyEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => { cb.checked = checked; });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshBtn.addEventListener('click', initialise);
  sendEmailBtn.addEventListener('click', handleSendEmails);
  selectAllEl.addEventListener('change', handleSelectAll);
  initialise();
});
