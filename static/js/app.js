/* ── State ── */
const state = {
  step: 1,
  receiptFile: null,
  audioBlob: null,
  draftData: null,
  draftFlags: [],
  confirmedData: null,
  gstPercent: 0,
  svcPercent: 0,
};

const HISTORY_KEY = "daytally_history";
const EVENTS_KEY = "daytally_events";
const MAX_HISTORY = 20;

/* ── DOM refs ── */
const viewNew = document.getElementById("view-new");
const viewHistory = document.getElementById("view-history");
const viewCalendar = document.getElementById("view-calendar");
const viewChat = document.getElementById("view-chat");
const navNew = document.getElementById("nav-new");
const navHistory = document.getElementById("nav-history");
const navCalendar = document.getElementById("nav-calendar");
const navChat = document.getElementById("nav-chat");
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
const splitEvent = document.getElementById("split-event");
const splitPeople = document.getElementById("split-people");
const splitShared = document.getElementById("split-shared");
const btnAddPerson = document.getElementById("btn-add-person");
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
const reviewFlags = document.getElementById("review-flags");
const editParticipants = document.getElementById("edit-participants");
const btnBackVoice = document.getElementById("btn-back-voice");
const btnConfirm = document.getElementById("btn-confirm");

const btnCopyAll = document.getElementById("btn-copy-all");
const btnShareNative = document.getElementById("btn-share-native");
const shareToast = document.getElementById("share-toast");
const btnNewSplit = document.getElementById("btn-new-split");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const calendarBindStatus = document.getElementById("calendar-bind-status");
const btnOpenCalendar = document.getElementById("btn-open-calendar");
const eventList = document.getElementById("event-list");
const eventEmpty = document.getElementById("event-empty");
const eventCreateForm = document.getElementById("event-create-form");
const eventTitleInput = document.getElementById("event-title-input");
const eventDateInput = document.getElementById("event-date-input");
const eventNotesInput = document.getElementById("event-notes-input");
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatChips = document.getElementById("chat-chips");

state.lastHistoryId = null;
state.lastEventId = null;

/* ── Recorder ── */
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = null;
let recordInterval = null;
let isRecording = false;

/* ── Utilities ── */
function isIdr(currency) {
  return String(currency || "").toUpperCase() === "IDR";
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function roundMoney(n, currency) {
  if (isIdr(currency)) return Math.round(Number(n) || 0);
  return round2(n);
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

function addPersonRow(name = "", item = "") {
  const row = document.createElement("div");
  row.className = "split-person";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "split-name";
  nameInput.placeholder = "Name";
  nameInput.autocomplete = "name";
  nameInput.maxLength = 40;
  nameInput.value = name;

  const itemInput = document.createElement("input");
  itemInput.type = "text";
  itemInput.className = "split-item";
  itemInput.placeholder = "What they had";
  itemInput.autocomplete = "off";
  itemInput.maxLength = 80;
  itemInput.value = item;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-text split-remove";
  removeBtn.setAttribute("aria-label", "Remove person");
  removeBtn.textContent = "Remove";

  row.append(nameInput, itemInput, removeBtn);
  splitPeople.appendChild(row);
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const rows = splitPeople.querySelectorAll(".split-person");
  rows.forEach((row) => {
    const btn = row.querySelector(".split-remove");
    btn.disabled = rows.length <= 1;
  });
}

function resetSplitForm() {
  splitEvent.value = "";
  splitShared.value = "";
  splitPeople.innerHTML = "";
  addPersonRow();
  addPersonRow();
  updateProcessButton();
}

function composeSplitText() {
  const lines = [];
  const eventName = splitEvent.value.trim();
  if (eventName) lines.push(`${eventName}.`);

  splitPeople.querySelectorAll(".split-person").forEach((row) => {
    const name = row.querySelector(".split-name").value.trim();
    const item = row.querySelector(".split-item").value.trim();
    if (name && item) lines.push(`${name} had ${item}.`);
  });

  const shared = splitShared.value.trim();
  if (shared) lines.push(`We all shared ${shared}.`);

  return lines.join(" ");
}

function canProcess() {
  const hasAudio = !!state.audioBlob;
  const hasPerson = [...splitPeople.querySelectorAll(".split-person")].some((row) => {
    const name = row.querySelector(".split-name").value.trim();
    const item = row.querySelector(".split-item").value.trim();
    return name && item;
  });
  return hasAudio || hasPerson;
}

function updateProcessButton() {
  btnProcess.disabled = !canProcess();
}

/* ── Navigation ── */
function switchView(view) {
  viewNew.classList.toggle("hidden", view !== "new");
  viewHistory.classList.toggle("hidden", view !== "history");
  viewCalendar.classList.toggle("hidden", view !== "calendar");
  viewChat.classList.toggle("hidden", view !== "chat");
  navNew.classList.toggle("active", view === "new");
  navHistory.classList.toggle("active", view === "history");
  navCalendar.classList.toggle("active", view === "calendar");
  navChat.classList.toggle("active", view === "chat");
  if (view === "history") renderHistory();
  if (view === "calendar") renderCalendar();
  if (view === "chat") ensureChatWelcome();
}

navNew.addEventListener("click", () => switchView("new"));
navHistory.addEventListener("click", () => switchView("history"));
navCalendar.addEventListener("click", () => switchView("calendar"));
navChat.addEventListener("click", () => switchView("chat"));
btnOpenCalendar.addEventListener("click", () => switchView("calendar"));

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
    showError("Microphone access denied. Type who had what above instead.");
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

resetSplitForm();
splitEvent.addEventListener("input", updateProcessButton);
splitShared.addEventListener("input", updateProcessButton);
splitPeople.addEventListener("input", updateProcessButton);
splitPeople.addEventListener("click", (e) => {
  const btn = e.target.closest(".split-remove");
  if (!btn || btn.disabled) return;
  btn.closest(".split-person").remove();
  updateRemoveButtons();
  updateProcessButton();
});
btnAddPerson.addEventListener("click", () => {
  addPersonRow();
  updateProcessButton();
});

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
    showError("Add at least one person and what they had, or record a voice note.");
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

  const splitText = composeSplitText();
  if (splitText) {
    formData.append("voice_text", splitText);
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
    state.draftFlags = payload.flags || payload.debug?.flags || [];
    syncPercentFromAmounts(state.draftData);
    renderReview(state.draftData);
    renderReviewFlags(state.draftFlags);
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

function renderReviewFlags(flags) {
  if (!reviewFlags) return;
  if (!flags || !flags.length) {
    reviewFlags.classList.add("hidden");
    reviewFlags.innerHTML = "";
    return;
  }
  const items = flags
    .map((flag) => `<li>${flag.message}</li>`)
    .join("");
  reviewFlags.innerHTML = `<strong>Check these before confirming</strong><ul>${items}</ul>`;
  reviewFlags.classList.remove("hidden");
}

/* ── Review & edit ── */
function participantItemsTotal(person) {
  return person.items_consumed.reduce(
    (sum, item) => sum + Number(item.item_cost || 0),
    0
  );
}

function recalcParticipant(person, currency) {
  const itemsTotal = participantItemsTotal(person);
  const code = currency || state.draftData?.event_details?.currency;
  person.total_owed = roundMoney(
    itemsTotal + Number(person.tax_and_tip_share || 0),
    code
  );
}

function itemsSubtotalFromParticipants(data) {
  const sum = data.participants.reduce(
    (total, person) => total + participantItemsTotal(person),
    0
  );
  return roundMoney(sum, data.event_details?.currency);
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
  const currency = data.event_details?.currency;
  summary.subtotal = subtotal;
  summary.tax = roundMoney(subtotal * (state.gstPercent / 100), currency);
  summary.tip = roundMoney(subtotal * (state.svcPercent / 100), currency);
  summary.grand_total = roundMoney(subtotal + summary.tax + summary.tip, currency);
}

function recalcFromPercentages(data) {
  applyPercentToAmounts(data);
  recalcProportionalTaxTip(data);
}

function allocatePool(pool, weights, currency) {
  if (!weights.length) return [];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    const even = roundMoney(pool / weights.length, currency);
    const shares = weights.map(() => even);
    shares[shares.length - 1] = roundMoney(pool - even * (weights.length - 1), currency);
    return shares;
  }
  let assigned = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return roundMoney(pool - assigned, currency);
    }
    const share = roundMoney((pool * weight) / weightSum, currency);
    assigned += share;
    return share;
  });
}

function recalcProportionalTaxTip(data) {
  const participants = data.participants;
  const summary = data.receipt_summary;
  const currency = data.event_details?.currency;
  const tax = Number(summary.tax) || 0;
  const tip = Number(summary.tip) || 0;

  const itemTotals = participants.map(participantItemsTotal);
  const itemsSubtotal = roundMoney(
    itemTotals.reduce((a, b) => a + b, 0),
    currency
  );

  summary.subtotal = itemsSubtotal;
  summary.grand_total = roundMoney(itemsSubtotal + tax + tip, currency);

  if (!participants.length) return;

  if (itemsSubtotal <= 0) {
    const serviceShares = allocatePool(tip, itemTotals, currency);
    const gstShares = allocatePool(tax, itemTotals, currency);
    participants.forEach((person, index) => {
      person.tax_and_tip_share = roundMoney(
        serviceShares[index] + gstShares[index],
        currency
      );
      recalcParticipant(person);
    });
    return;
  }

  const serviceShares = allocatePool(tip, itemTotals, currency);
  const gstBases = itemTotals.map((food, index) => food + serviceShares[index]);
  const gstShares = allocatePool(tax, gstBases, currency);

  participants.forEach((person, index) => {
    person.tax_and_tip_share = roundMoney(
      serviceShares[index] + gstShares[index],
      currency
    );
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
        <input type="number" class="edit-item-cost" value="${item.item_cost}" step="${isIdr(currency) ? "1" : "0.01"}" min="0" data-field="cost">
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
        <input type="number" class="edit-tax-share" value="${person.tax_and_tip_share}" step="${isIdr(currency) ? "1" : "0.01"}" min="0" data-p="${pIdx}">
      </label>
      <button type="button" class="btn-text btn-add-item" data-p="${pIdx}">+ Add item</button>
    </div>
  `;

  card.querySelector(".edit-participant-name").addEventListener("input", (e) => {
    data.participants[pIdx].name = e.target.value;
  });

  card.querySelector(".edit-tax-share").addEventListener("input", (e) => {
      data.participants[pIdx].tax_and_tip_share = roundMoney(e.target.value, currency);
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
      data.participants[pi].items_consumed[ii].item_cost = roundMoney(
        e.target.value,
        currency
      );
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
function restoreIdrThousandsOnClient(data) {
  const amounts = [data.receipt_summary.subtotal, data.receipt_summary.grand_total];
  data.participants.forEach((person) => {
    amounts.push(person.total_owed);
    person.items_consumed.forEach((item) => amounts.push(item.item_cost));
  });
  const positives = amounts.filter((n) => Number(n) > 0);
  if (!positives.length || Math.max(...positives) >= 1000) return false;
  const scale = 1000;
  data.receipt_summary.subtotal *= scale;
  data.receipt_summary.tax *= scale;
  data.receipt_summary.tip *= scale;
  data.receipt_summary.grand_total *= scale;
  data.participants.forEach((person) => {
    person.tax_and_tip_share *= scale;
    person.total_owed *= scale;
    person.items_consumed.forEach((item) => {
      item.item_cost *= scale;
    });
  });
  return true;
}

editCurrency.addEventListener("change", () => {
  if (state.draftData) {
    state.draftData.event_details.currency = editCurrency.value;
    if (editCurrency.value === "IDR") {
      restoreIdrThousandsOnClient(state.draftData);
    }
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
  const saved = saveToHistory(state.confirmedData);
  state.lastHistoryId = saved.id;
  const linked = linkSplitToCalendar(saved);
  state.lastEventId = linked.id;
  if (calendarBindStatus) {
    calendarBindStatus.textContent = `Linked to calendar event “${linked.title}” (${linked.date || "no date"}).`;
  }
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
  state.draftFlags = [];
  renderReviewFlags([]);
  state.confirmedData = null;
  receiptInput.value = "";
  receiptPreview.classList.add("hidden");
  receiptPreview.src = "";
  receiptPlaceholder.classList.remove("hidden");
  receiptName.textContent = "";
  btnToVoice.disabled = true;
  resetRecording();
  resetSplitForm();
  hideError();
  setWizardStep(1);
  switchView("new");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── History (localStorage) ── */
function saveToHistory(data) {
  const history = loadHistory();
  const entry = {
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
    eventId: null,
    data: deepClone(data),
  };
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  return entry;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

function normalizeEventDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return text;
}

function linkSplitToCalendar(historyEntry) {
  const data = historyEntry.data;
  const title = (data.event_details.title || "Bill split").trim();
  const date = normalizeEventDate(data.event_details.date);
  const events = loadEvents();
  let event = events.find(
    (e) => e.title.toLowerCase() === title.toLowerCase() && e.date === date
  );
  if (!event) {
    event = {
      id: `evt_${Date.now()}`,
      title,
      date,
      notes: "",
      splitIds: [],
      createdAt: new Date().toISOString(),
    };
    events.unshift(event);
  }
  if (!event.splitIds.includes(historyEntry.id)) {
    event.splitIds.push(historyEntry.id);
  }
  saveEvents(events);

  const history = loadHistory();
  const idx = history.findIndex((h) => h.id === historyEntry.id);
  if (idx >= 0) {
    history[idx].eventId = event.id;
    saveHistory(history);
  }
  return event;
}

function getSplitsForEvent(event) {
  const history = loadHistory();
  return (event.splitIds || [])
    .map((id) => history.find((h) => h.id === id))
    .filter(Boolean);
}

function renderCalendar() {
  const events = loadEvents().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  eventList.innerHTML = "";
  eventEmpty.classList.toggle("hidden", events.length > 0);

  events.forEach((event) => {
    const splits = getSplitsForEvent(event);
    const el = document.createElement("div");
    el.className = "event-item";

    const splitsHtml = splits.length
      ? splits
          .map((split) => {
            const c = split.data.event_details.currency;
            return `<li><strong>${escapeHtml(split.data.event_details.title)}</strong> · ${formatMoney(split.data.receipt_summary.grand_total, c)}</li>`;
          })
          .join("")
      : "<li class=\"muted\">No bill linked yet</li>";

    el.innerHTML = `
      <div class="event-item-main">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(event.date)}</span>
        ${event.notes ? `<span class="event-notes">${escapeHtml(event.notes)}</span>` : ""}
        <ul class="event-splits">${splitsHtml}</ul>
      </div>
      <div class="history-item-actions">
        ${splits[0] ? '<button type="button" class="btn-text btn-view-event-split">View bill</button>' : ""}
        <button type="button" class="btn-text btn-delete-event danger">Delete</button>
      </div>
    `;

    const viewBtn = el.querySelector(".btn-view-event-split");
    if (viewBtn && splits[0]) {
      viewBtn.addEventListener("click", () => {
        state.confirmedData = deepClone(splits[0].data);
        renderResults(state.confirmedData);
        if (calendarBindStatus) {
          calendarBindStatus.textContent = `Linked to calendar event “${event.title}” (${event.date}).`;
        }
        switchView("new");
        setWizardStep(4);
      });
    }

    el.querySelector(".btn-delete-event").addEventListener("click", () => {
      saveEvents(loadEvents().filter((e) => e.id !== event.id));
      const history = loadHistory().map((h) => {
        if (h.eventId === event.id) return { ...h, eventId: null };
        return h;
      });
      saveHistory(history);
      renderCalendar();
    });

    eventList.appendChild(el);
  });
}

eventCreateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = eventTitleInput.value.trim();
  const date = eventDateInput.value;
  if (!title || !date) return;
  const events = loadEvents();
  events.unshift({
    id: `evt_${Date.now()}`,
    title,
    date,
    notes: eventNotesInput.value.trim(),
    splitIds: [],
    createdAt: new Date().toISOString(),
  });
  saveEvents(events);
  eventCreateForm.reset();
  renderCalendar();
});

/* ── Grounded chatbot (stored totals only) ── */
function ensureChatWelcome() {
  if (chatLog.dataset.ready === "1") return;
  chatLog.dataset.ready = "1";
  appendChatBubble(
    "bot",
    "Ask about your saved splits and events. Examples: “How much have I spent?”, “What do I owe Mevan?”, “List my recent events.”"
  );
}

function appendChatBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function monthKey(isoOrDate) {
  const raw = String(isoOrDate || "");
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function answerChat(question) {
  const q = question.toLowerCase().trim();
  const history = loadHistory();
  const events = loadEvents();

  if (!history.length && !events.length) {
    return "I do not have any saved splits or events yet. Confirm a bill first, then ask again.";
  }

  if (/list.*(event|calendar)|recent events|my events/.test(q)) {
    if (!events.length) return "No calendar events saved yet.";
    return events
      .slice(0, 8)
      .map((e) => {
        const n = (e.splitIds || []).length;
        return `• ${e.title} (${e.date}) — ${n} linked bill${n === 1 ? "" : "s"}`;
      })
      .join("\n");
  }

  if (/last split|most recent|latest bill/.test(q)) {
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const d = last.data;
    const c = d.event_details.currency;
    const people = d.participants.map((p) => `${p.name} ${formatMoney(p.total_owed, c)}`).join(", ");
    return `Last split: ${d.event_details.title} on ${d.event_details.date}. Grand total ${formatMoney(d.receipt_summary.grand_total, c)}. ${people}.`;
  }

  if (/how much.*(spend|spent|total)|total spend|grand total|spent in total/.test(q)) {
    const byCurrency = {};
    history.forEach((h) => {
      const c = h.data.event_details.currency || "SGD";
      byCurrency[c] = (byCurrency[c] || 0) + Number(h.data.receipt_summary.grand_total || 0);
    });
    const thisMonth = monthKey(new Date().toISOString());
    const monthTotals = {};
    history.forEach((h) => {
      const key = monthKey(h.data.event_details.date || h.savedAt);
      if (key !== thisMonth) return;
      const c = h.data.event_details.currency || "SGD";
      monthTotals[c] = (monthTotals[c] || 0) + Number(h.data.receipt_summary.grand_total || 0);
    });
    const allLine = Object.entries(byCurrency)
      .map(([c, n]) => formatMoney(n, c))
      .join(" + ");
    const monthLine = Object.keys(monthTotals).length
      ? Object.entries(monthTotals)
          .map(([c, n]) => formatMoney(n, c))
          .join(" + ")
      : "0 (no splits dated this month)";
    return `Across ${history.length} saved split(s): ${allLine}. This calendar month (${thisMonth}): ${monthLine}. These numbers are summed from stored grand totals only.`;
  }

  const oweMatch = q.match(/(?:owe|owes|owed)\s+([a-z][a-z\-']+)/i) || q.match(/what does\s+([a-z][a-z\-']+)\s+owe/i);
  if (oweMatch || /what do i (still )?owe|who owes what|balances?/.test(q)) {
    const nameFilter = oweMatch ? oweMatch[1] : null;
    const rows = [];
    history.forEach((h) => {
      h.data.participants.forEach((p) => {
        if (nameFilter && !p.name.toLowerCase().includes(nameFilter.toLowerCase())) return;
        rows.push({
          person: p.name,
          amount: p.total_owed,
          currency: h.data.event_details.currency,
          event: h.data.event_details.title,
          date: h.data.event_details.date,
        });
      });
    });
    if (!rows.length) {
      return nameFilter
        ? `I found no stored totals for anyone matching “${nameFilter}”. Names come only from confirmed splits.`
        : "I could not find participant totals in saved splits.";
    }
    if (nameFilter) {
      const byCurrency = {};
      rows.forEach((r) => {
        byCurrency[r.currency] = (byCurrency[r.currency] || 0) + Number(r.amount || 0);
      });
      const sumLine = Object.entries(byCurrency)
        .map(([c, n]) => formatMoney(n, c))
        .join(" + ");
      const detail = rows
        .slice(0, 6)
        .map((r) => `• ${r.event} (${r.date}): ${formatMoney(r.amount, r.currency)}`)
        .join("\n");
      return `From saved splits, totals for names matching “${nameFilter}”: ${sumLine}.\n${detail}`;
    }
    return rows
      .slice(0, 10)
      .map((r) => `• ${r.person} owes ${formatMoney(r.amount, r.currency)} for ${r.event}`)
      .join("\n");
  }

  return "I can answer total spend, what someone owes from saved splits, recent events, or your last split. Money always comes from stored confirmations — I will not invent amounts.";
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const question = chatInput.value.trim();
  if (!question) return;
  appendChatBubble("user", question);
  appendChatBubble("bot", answerChat(question));
  chatInput.value = "";
});

chatChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const question = chip.dataset.q;
  appendChatBubble("user", question);
  appendChatBubble("bot", answerChat(question));
});

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";
  historyEmpty.classList.toggle("hidden", history.length > 0);

  history.forEach((entry) => {
    const { data } = entry;
    const c = data.event_details.currency;
    const linked = entry.eventId
      ? loadEvents().find((ev) => ev.id === entry.eventId)
      : null;
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="history-item-main">
        <strong>${escapeHtml(data.event_details.title)}</strong>
        <span>${escapeHtml(data.event_details.date)}</span>
        <span class="history-total">${formatMoney(data.receipt_summary.grand_total, c)}</span>
        ${linked ? `<span class="history-link">📅 ${escapeHtml(linked.title)}</span>` : ""}
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
      saveHistory(updated);
      if (entry.eventId) {
        const events = loadEvents().map((ev) => {
          if (ev.id !== entry.eventId) return ev;
          return { ...ev, splitIds: (ev.splitIds || []).filter((id) => id !== entry.id) };
        });
        saveEvents(events);
      }
      renderHistory();
    });

    historyList.appendChild(el);
  });
}
