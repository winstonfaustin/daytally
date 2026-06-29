/* ── State ── */
const state = {
  step: 1,
  receiptFile: null,
  audioBlob: null,
  draftData: null,
  confirmedData: null,
  gstPercent: 0,
  svcPercent: 0,
};

const HISTORY_KEY = "daytally_history";
const MAX_HISTORY = 20;

/* ── DOM refs ── */
const viewNew = document.getElementById("view-new");
const viewHistory = document.getElementById("view-history");
const navNew = document.getElementById("nav-new");
const navHistory = document.getElementById("nav-history");
const wizardSteps = document.querySelectorAll(".wizard-step");

const stepReceipt = document.getElementById("step-receipt");
const stepVoice = document.getElementById("step-voice");
const stepReview = document.getElementById("step-review");
const stepResults = document.getElementById("step-results");

const receiptInput = document.getElementById("receipt");
const receiptDropzone = document.getElementById("receipt-dropzone");
const receiptPreview = document.getElementById("receipt-preview");
const receiptPlaceholder = document.getElementById("receipt-placeholder");
const receiptName = document.getElementById("receipt-name");
const btnToVoice = document.getElementById("btn-to-voice");

const recordBtn = document.getElementById("record-btn");
const recordIcon = document.getElementById("record-icon");
const recordLabel = document.getElementById("record-label");
const recordTimer = document.getElementById("record-timer");
const recordWave = document.getElementById("record-wave");
const audioPreview = document.getElementById("audio-preview");
const audioPlayback = document.getElementById("audio-playback");
const btnRerecord = document.getElementById("btn-rerecord");
const voiceTextFallback = document.getElementById("voice-text-fallback");
const btnBackReceipt = document.getElementById("btn-back-receipt");
const btnProcess = document.getElementById("btn-process");
const btnLabel = btnProcess.querySelector(".btn-label");
const spinner = document.getElementById("spinner");
const processingSteps = document.getElementById("processing-steps");
const errorBanner = document.getElementById("error-banner");

const editTitle = document.getElementById("edit-title");
const editDate = document.getElementById("edit-date");
const editCurrency = document.getElementById("edit-currency");
const editSubtotal = document.getElementById("edit-subtotal");
const editGstPercent = document.getElementById("edit-gst-percent");
const editSvcPercent = document.getElementById("edit-svc-percent");
const editTaxAmount = document.getElementById("edit-tax-amount");
const editTipAmount = document.getElementById("edit-tip-amount");
const editGrandTotal = document.getElementById("edit-grand-total");
const reviewSummary = document.getElementById("review-summary");
const editParticipants = document.getElementById("edit-participants");
const btnBackVoice = document.getElementById("btn-back-voice");
const btnConfirm = document.getElementById("btn-confirm");

const btnCopyAll = document.getElementById("btn-copy-all");
const btnShareNative = document.getElementById("btn-share-native");
const shareToast = document.getElementById("share-toast");
const btnNewSplit = document.getElementById("btn-new-split");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

/* ── Recorder ── */
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = null;
let recordInterval = null;
let isRecording = false;

/* ── Utilities ── */
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function formatMoney(amount, currency) {
  const value = Number(amount);
  if (Number.isNaN(value)) return "-";

  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currency || "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
  errorBanner.textContent = "";
}

function setWizardStep(step) {
  state.step = step;
  wizardSteps.forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
  });

  stepReceipt.classList.toggle("hidden", step !== 1);
  stepVoice.classList.toggle("hidden", step !== 2);
  stepReview.classList.toggle("hidden", step !== 3);
  stepResults.classList.toggle("hidden", step !== 4);

  if (step === 4) {
    stepResults.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function canProcess() {
  const hasAudio = !!state.audioBlob;
  const hasText = voiceTextFallback.value.trim().length > 0;
  return hasAudio || hasText;
}

function updateProcessButton() {
  btnProcess.disabled = !canProcess();
}

/* ── Navigation ── */
function switchView(view) {
  const isNew = view === "new";
  viewNew.classList.toggle("hidden", !isNew);
  viewHistory.classList.toggle("hidden", isNew);
  navNew.classList.toggle("active", isNew);
  navHistory.classList.toggle("active", !isNew);
  if (!isNew) renderHistory();
}

navNew.addEventListener("click", () => switchView("new"));
navHistory.addEventListener("click", () => switchView("history"));

/* ── Receipt step ── */
function setReceiptFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  state.receiptFile = file;
  receiptName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    receiptPreview.src = e.target.result;
    receiptPreview.classList.remove("hidden");
    receiptPlaceholder.classList.add("hidden");
  };
  reader.readAsDataURL(file);
  btnToVoice.disabled = false;
}

receiptInput.addEventListener("change", () => {
  if (receiptInput.files[0]) setReceiptFile(receiptInput.files[0]);
});

["dragenter", "dragover"].forEach((evt) => {
  receiptDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    receiptDropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  receiptDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    receiptDropzone.classList.remove("dragover");
  });
});

receiptDropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setReceiptFile(file);
});

btnToVoice.addEventListener("click", () => setWizardStep(2));

/* ── Voice recording ── */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunks, { type: mimeType });
      state.audioBlob = blob;
      audioPlayback.src = URL.createObjectURL(blob);
      audioPreview.classList.remove("hidden");
      recordBtn.classList.remove("recording");
      recordIcon.textContent = "🎙️";
      recordLabel.textContent = "Hold to record";
      recordWave.classList.add("hidden");
      updateProcessButton();
    };

    mediaRecorder.start();
    isRecording = true;
    recordStartTime = Date.now();
    recordBtn.classList.add("recording");
    recordIcon.textContent = "⏺";
    recordLabel.textContent = "Recording…";
    recordWave.classList.remove("hidden");

    recordInterval = setInterval(() => {
      const secs = Math.floor((Date.now() - recordStartTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      recordTimer.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    }, 200);
  } catch {
    showError("Microphone access denied. Use the text box below instead.");
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;
  isRecording = false;
  clearInterval(recordInterval);
  mediaRecorder.stop();
}

function resetRecording() {
  state.audioBlob = null;
  audioPreview.classList.add("hidden");
  audioPlayback.src = "";
  recordTimer.textContent = "0:00";
  updateProcessButton();
}

recordBtn.addEventListener("mousedown", startRecording);
recordBtn.addEventListener("mouseup", stopRecording);
recordBtn.addEventListener("mouseleave", stopRecording);
recordBtn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startRecording();
});
recordBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  stopRecording();
});

btnRerecord.addEventListener("click", resetRecording);
voiceTextFallback.addEventListener("input", updateProcessButton);

btnBackReceipt.addEventListener("click", () => setWizardStep(1));

/* ── Processing ── */
function setProcStep(name, status) {
  const el = processingSteps.querySelector(`[data-proc="${name}"]`);
  if (!el) return;
  el.classList.remove("active", "done", "error");
  if (status) el.classList.add(status);
}

async function showProcessing() {
  processingSteps.classList.remove("hidden");
  setProcStep("split", "active");
}

function setLoading(isLoading) {
  btnProcess.disabled = isLoading || !canProcess();
  btnLabel.textContent = isLoading ? "Processing…" : "Calculate split";
  spinner.classList.toggle("hidden", !isLoading);
  recordBtn.disabled = isLoading;
}

btnProcess.addEventListener("click", async () => {
  if (!state.receiptFile) {
    showError("Please upload a receipt first.");
    return;
  }
  if (!canProcess()) {
    showError("Record a voice note or type your instructions.");
    return;
  }

  hideError();
  setLoading(true);
  showProcessing();

  const formData = new FormData();
  formData.append("receipt", state.receiptFile);

  if (state.audioBlob) {
    formData.append("audio", state.audioBlob, "voice-note.webm");
  }

  if (voiceTextFallback.value.trim()) {
    formData.append("voice_text", voiceTextFallback.value.trim());
  }

  try {
    const response = await fetch("/api/process", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.error || "Something went wrong.");

    setProcStep("split", "done");
    state.draftData = payload.data;
    syncPercentFromAmounts(state.draftData);
    renderReview(state.draftData);
    setWizardStep(3);
  } catch (err) {
    setProcStep("split", "error");
    showError(err.message);
  } finally {
    setLoading(false);
    processingSteps.classList.add("hidden");
    setProcStep("split", "");
  }
});

/* ── Review & edit ── */
function participantItemsTotal(person) {
  return person.items_consumed.reduce(
    (sum, item) => sum + Number(item.item_cost || 0),
    0
  );
}

function recalcParticipant(person) {
  const itemsTotal = participantItemsTotal(person);
  person.total_owed = round2(itemsTotal + Number(person.tax_and_tip_share || 0));
}

function itemsSubtotalFromParticipants(data) {
  return round2(data.participants.reduce((sum, person) => sum + participantItemsTotal(person), 0));
}

function syncPercentFromAmounts(data) {
  const subtotal = itemsSubtotalFromParticipants(data);
  const summary = data.receipt_summary;
  if (subtotal > 0) {
    state.gstPercent = round2((Number(summary.tax) / subtotal) * 100);
    state.svcPercent = round2((Number(summary.tip) / subtotal) * 100);
  }
}

function applyPercentToAmounts(data) {
  const subtotal = itemsSubtotalFromParticipants(data);
  const summary = data.receipt_summary;
  summary.subtotal = subtotal;
  summary.tax = round2(subtotal * (state.gstPercent / 100));
  summary.tip = round2(subtotal * (state.svcPercent / 100));
  summary.grand_total = round2(subtotal + summary.tax + summary.tip);
}

function recalcFromPercentages(data) {
  applyPercentToAmounts(data);
  recalcProportionalTaxTip(data);
}

function allocatePool(pool, weights) {
  if (!weights.length) return [];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    const even = round2(pool / weights.length);
    const shares = weights.map(() => even);
    shares[shares.length - 1] = round2(pool - even * (weights.length - 1));
    return shares;
  }
  let assigned = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return round2(pool - assigned);
    }
    const share = round2((pool * weight) / weightSum);
    assigned += share;
    return share;
  });
}

function recalcProportionalTaxTip(data) {
  const participants = data.participants;
  const summary = data.receipt_summary;
  const tax = Number(summary.tax) || 0;
  const tip = Number(summary.tip) || 0;

  const itemTotals = participants.map(participantItemsTotal);
  const itemsSubtotal = round2(itemTotals.reduce((a, b) => a + b, 0));

  summary.subtotal = itemsSubtotal;
  summary.grand_total = round2(itemsSubtotal + tax + tip);

  if (!participants.length) return;

  if (itemsSubtotal <= 0) {
    const serviceShares = allocatePool(tip, itemTotals);
    const gstShares = allocatePool(tax, itemTotals);
    participants.forEach((person, index) => {
      person.tax_and_tip_share = round2(serviceShares[index] + gstShares[index]);
      recalcParticipant(person);
    });
    return;
  }

  const serviceShares = allocatePool(tip, itemTotals);
  const gstBases = itemTotals.map((food, index) => food + serviceShares[index]);
  const gstShares = allocatePool(tax, gstBases);

  participants.forEach((person, index) => {
    person.tax_and_tip_share = round2(serviceShares[index] + gstShares[index]);
    recalcParticipant(person);
  });
}

function recalcAll(data) {
  recalcFromPercentages(data);
}

function updateReviewSummaryFields(data) {
  const c = data.event_details.currency;
  const s = data.receipt_summary;
  editSubtotal.value = formatMoney(s.subtotal, c);
  editGstPercent.value = state.gstPercent;
  editSvcPercent.value = state.svcPercent;
  editTaxAmount.textContent = `= ${formatMoney(s.tax, c)}`;
  editTipAmount.textContent = `= ${formatMoney(s.tip, c)}`;
  editGrandTotal.value = formatMoney(s.grand_total, c);
}

function renderReview(data, { skipTaxRecalc = false, keepPercent = false } = {}) {
  if (!keepPercent) {
    syncPercentFromAmounts(data);
  }
  if (!skipTaxRecalc) {
    recalcFromPercentages(data);
  }

  editTitle.value = data.event_details.title;
  editDate.value = data.event_details.date;
  editCurrency.value = data.event_details.currency;
  updateReviewSummaryFields(data);

  editParticipants.innerHTML = "";
  data.participants.forEach((person, pIdx) => {
    editParticipants.appendChild(buildEditParticipantCard(data, person, pIdx));
  });
}

function buildEditParticipantCard(data, person, pIdx) {
  const card = document.createElement("div");
  card.className = "edit-participant-card";
  const currency = data.event_details.currency;

  const itemsHtml = person.items_consumed
    .map(
      (item, iIdx) => `
      <div class="edit-item-row" data-p="${pIdx}" data-i="${iIdx}">
        <input type="text" class="edit-item-name" value="${escapeHtml(item.item_name)}" data-field="name">
        <input type="number" class="edit-item-cost" value="${item.item_cost}" step="0.01" min="0" data-field="cost">
        <button type="button" class="btn-icon btn-delete-item" title="Remove item">✕</button>
      </div>`
    )
    .join("");

  card.innerHTML = `
    <div class="edit-participant-header">
      <input type="text" class="edit-participant-name" value="${escapeHtml(person.name)}" data-p="${pIdx}">
      <span class="edit-participant-total" data-p="${pIdx}">${formatMoney(person.total_owed, currency)}</span>
    </div>
    <div class="edit-items">${itemsHtml}</div>
    <div class="edit-participant-footer">
      <label class="auto-split-label">Tax & service share
        <input type="number" class="edit-tax-share" value="${person.tax_and_tip_share}" step="0.01" min="0" data-p="${pIdx}">
      </label>
      <button type="button" class="btn-text btn-add-item" data-p="${pIdx}">+ Add item</button>
    </div>
  `;

  card.querySelector(".edit-participant-name").addEventListener("input", (e) => {
    data.participants[pIdx].name = e.target.value;
  });

  card.querySelector(".edit-tax-share").addEventListener("input", (e) => {
    data.participants[pIdx].tax_and_tip_share = round2(e.target.value);
    recalcParticipant(data.participants[pIdx]);
    card.querySelector(".edit-participant-total").textContent = formatMoney(
      data.participants[pIdx].total_owed,
      currency
    );
  });

  card.querySelectorAll(".edit-item-row").forEach((row) => {
    const pi = Number(row.dataset.p);
    const ii = Number(row.dataset.i);

    row.querySelector(".edit-item-name").addEventListener("input", (e) => {
      data.participants[pi].items_consumed[ii].item_name = e.target.value;
    });

    row.querySelector(".edit-item-cost").addEventListener("input", (e) => {
      data.participants[pi].items_consumed[ii].item_cost = round2(e.target.value);
      recalcFromPercentages(data);
      updateReviewSummaryFields(data);
      refreshParticipantCards(data);
    });

    row.querySelector(".btn-delete-item").addEventListener("click", () => {
      data.participants[pi].items_consumed.splice(ii, 1);
      renderReview(data);
    });
  });

  card.querySelector(".btn-add-item").addEventListener("click", () => {
    data.participants[pIdx].items_consumed.push({ item_name: "New item", item_cost: 0 });
    renderReview(data);
  });

  return card;
}

function refreshParticipantCards(data) {
  const currency = data.event_details.currency;
  data.participants.forEach((person, pIdx) => {
    const card = editParticipants.querySelector(`.edit-participant-card:nth-child(${pIdx + 1})`);
    if (!card) return;
    card.querySelector(".edit-participant-total").textContent = formatMoney(person.total_owed, currency);
    const taxInput = card.querySelector(".edit-tax-share");
    if (taxInput && document.activeElement !== taxInput) {
      taxInput.value = person.tax_and_tip_share;
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

editTitle.addEventListener("input", () => {
  if (state.draftData) state.draftData.event_details.title = editTitle.value;
});
editDate.addEventListener("input", () => {
  if (state.draftData) state.draftData.event_details.date = editDate.value;
});
editCurrency.addEventListener("change", () => {
  if (state.draftData) {
    state.draftData.event_details.currency = editCurrency.value;
    renderReview(state.draftData, { skipTaxRecalc: true });
  }
});

function bindSummaryEditors() {
  editGstPercent.addEventListener("input", () => {
    if (!state.draftData) return;
    state.gstPercent = round2(editGstPercent.value);
    recalcFromPercentages(state.draftData);
    updateReviewSummaryFields(state.draftData);
    refreshParticipantCards(state.draftData);
  });

  editSvcPercent.addEventListener("input", () => {
    if (!state.draftData) return;
    state.svcPercent = round2(editSvcPercent.value);
    recalcFromPercentages(state.draftData);
    updateReviewSummaryFields(state.draftData);
    refreshParticipantCards(state.draftData);
  });
}

bindSummaryEditors();

btnBackVoice.addEventListener("click", () => setWizardStep(2));

btnConfirm.addEventListener("click", () => {
  if (!state.draftData) return;
  state.draftData.event_details.title = editTitle.value;
  state.draftData.event_details.date = editDate.value;
  state.draftData.event_details.currency = editCurrency.value;
  recalcAll(state.draftData);
  state.confirmedData = deepClone(state.draftData);
  saveToHistory(state.confirmedData);
  renderResults(state.confirmedData);
  setWizardStep(4);
});

/* ── Results ── */
function renderResults(data) {
  const { event_details: event, receipt_summary: summary, participants } = data;
  const currency = event.currency;

  document.getElementById("event-title").textContent = event.title;
  document.getElementById("event-date").textContent = event.date;
  document.getElementById("event-currency").textContent = currency;
  document.getElementById("grand-total").textContent = formatMoney(summary.grand_total, currency);
  document.getElementById("subtotal").textContent = formatMoney(summary.subtotal, currency);
  const gstPct = summary.subtotal > 0 ? round2((summary.tax / summary.subtotal) * 100) : 0;
  const svcPct = summary.subtotal > 0 ? round2((summary.tip / summary.subtotal) * 100) : 0;
  document.getElementById("tax-label").textContent = `GST (${gstPct}%)`;
  document.getElementById("tip-label").textContent = `Service (${svcPct}%)`;
  document.getElementById("tax").textContent = formatMoney(summary.tax, currency);
  document.getElementById("tip").textContent = formatMoney(summary.tip, currency);

  const grid = document.getElementById("participants-grid");
  grid.innerHTML = "";

  participants.forEach((person) => {
    const card = document.createElement("article");
    card.className = "participant-card";

    const itemsHtml = person.items_consumed
      .map(
        (item) =>
          `<li><span>${escapeHtml(item.item_name)}</span><span>${formatMoney(item.item_cost, currency)}</span></li>`
      )
      .join("");

    card.innerHTML = `
      <div class="participant-header">
        <h4 class="participant-name">${escapeHtml(person.name)}</h4>
        <span class="participant-total">${formatMoney(person.total_owed, currency)}</span>
      </div>
      <ul class="items-list">${itemsHtml}</ul>
      <div class="participant-card-bottom">
        <div class="participant-footer">
          <span>Tax & service</span>
          <strong>${formatMoney(person.tax_and_tip_share, currency)}</strong>
        </div>
        <button type="button" class="btn-text btn-copy-person">Copy for ${escapeHtml(person.name)}</button>
      </div>
    `;

    card.querySelector(".btn-copy-person").addEventListener("click", () => {
      const msg = buildPersonMessage(data, person);
      copyText(msg);
    });

    grid.appendChild(card);
  });
}

function buildSummaryText(data) {
  const { event_details: event, receipt_summary: summary, participants } = data;
  const c = event.currency;
  let text = `DayTally: ${event.title}\n${event.date}\n\n`;
  text += `Grand total: ${formatMoney(summary.grand_total, c)}\n\n`;
  text += `Who owes what:\n`;
  participants.forEach((p) => {
    text += `• ${p.name}: ${formatMoney(p.total_owed, c)}\n`;
    p.items_consumed.forEach((item) => {
      text += `  - ${item.item_name}: ${formatMoney(item.item_cost, c)}\n`;
    });
    text += `  (tax & service: ${formatMoney(p.tax_and_tip_share, c)})\n`;
  });
  return text.trim();
}

function buildPersonMessage(data, person) {
  const c = data.event_details.currency;
  let text = `Hey ${person.name}! For ${data.event_details.title} (${data.event_details.date}), you owe ${formatMoney(person.total_owed, c)}.\n\nBreakdown:\n`;
  person.items_consumed.forEach((item) => {
    text += `• ${item.item_name}: ${formatMoney(item.item_cost, c)}\n`;
  });
  text += `• Tax & service: ${formatMoney(person.tax_and_tip_share, c)}`;
  return text;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
  } catch {
    showToast("Could not copy. Try again.");
  }
}

function showToast(msg) {
  shareToast.textContent = msg;
  shareToast.classList.remove("hidden");
  setTimeout(() => shareToast.classList.add("hidden"), 2500);
}

btnCopyAll.addEventListener("click", () => {
  if (state.confirmedData) copyText(buildSummaryText(state.confirmedData));
});

btnShareNative.addEventListener("click", async () => {
  if (!state.confirmedData) return;
  const text = buildSummaryText(state.confirmedData);
  if (navigator.share) {
    try {
      await navigator.share({
        title: `DayTally: ${state.confirmedData.event_details.title}`,
        text,
      });
    } catch {
      /* user cancelled */
    }
  } else {
    copyText(text);
  }
});

btnNewSplit.addEventListener("click", () => {
  state.receiptFile = null;
  state.audioBlob = null;
  state.draftData = null;
  state.confirmedData = null;
  receiptInput.value = "";
  receiptPreview.classList.add("hidden");
  receiptPreview.src = "";
  receiptPlaceholder.classList.remove("hidden");
  receiptName.textContent = "";
  btnToVoice.disabled = true;
  resetRecording();
  voiceTextFallback.value = "";
  hideError();
  setWizardStep(1);
  switchView("new");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── History (localStorage) ── */
function saveToHistory(data) {
  const history = loadHistory();
  history.unshift({
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
    data: deepClone(data),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";
  historyEmpty.classList.toggle("hidden", history.length > 0);

  history.forEach((entry) => {
    const { data } = entry;
    const c = data.event_details.currency;
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="history-item-main">
        <strong>${escapeHtml(data.event_details.title)}</strong>
        <span>${escapeHtml(data.event_details.date)}</span>
        <span class="history-total">${formatMoney(data.receipt_summary.grand_total, c)}</span>
      </div>
      <div class="history-item-actions">
        <button type="button" class="btn-text btn-view-history">View</button>
        <button type="button" class="btn-text btn-copy-history">Copy</button>
        <button type="button" class="btn-text btn-delete-history danger">Delete</button>
      </div>
    `;

    el.querySelector(".btn-view-history").addEventListener("click", () => {
      state.confirmedData = deepClone(data);
      renderResults(state.confirmedData);
      switchView("new");
      setWizardStep(4);
    });

    el.querySelector(".btn-copy-history").addEventListener("click", () => {
      copyText(buildSummaryText(data));
    });

    el.querySelector(".btn-delete-history").addEventListener("click", () => {
      const updated = loadHistory().filter((h) => h.id !== entry.id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      renderHistory();
    });

    historyList.appendChild(el);
  });
}
