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
  selectedPaymentId: "",
  settleProfiles: [],
  settleFriend: null,
};

const HISTORY_KEY = "daytally_history";
const EVENTS_KEY = "daytally_events";
const SESSION_KEY = "daytally_session_v2";
const MAX_HISTORY = 20;

/* ── DOM refs ── */
const viewNew = document.getElementById("view-new");
const viewHistory = document.getElementById("view-history");
const viewCalendar = document.getElementById("view-calendar");
const viewChat = document.getElementById("view-chat");
const viewProfile = document.getElementById("view-profile");
const navNew = document.getElementById("nav-new");
const navHistory = document.getElementById("nav-history");
const navCalendar = document.getElementById("nav-calendar");
const navChat = document.getElementById("nav-chat");
const navProfile = document.getElementById("nav-profile");
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
const appShell = document.getElementById("app-shell");
const authScreen = document.getElementById("auth-screen");
const authTabLogin = document.getElementById("auth-tab-login");
const authTabRegister = document.getElementById("auth-tab-register");
const authLoginForm = document.getElementById("auth-login-form");
const authRegisterForm = document.getElementById("auth-register-form");
const authError = document.getElementById("auth-error");
const userChipName = document.getElementById("user-chip-name");
const btnLogout = document.getElementById("btn-logout");
const btnGoogle = document.getElementById("btn-google");
const editPayer = document.getElementById("edit-payer");
const payerBanner = document.getElementById("payer-banner");
const profileForm = document.getElementById("profile-form");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const paymentProfilesList = document.getElementById("payment-profiles-list");
const btnAddPayment = document.getElementById("btn-add-payment");
const profileError = document.getElementById("profile-error");
const profileSaved = document.getElementById("profile-saved");
const sharePayField = document.getElementById("share-pay-field");
const sharePaymentProfile = document.getElementById("share-payment-profile");
const settleSource = document.getElementById("settle-source");
const settleFriendRow = document.getElementById("settle-friend-row");
const settleFriendEmail = document.getElementById("settle-friend-email");
const btnLookupFriendPay = document.getElementById("btn-lookup-friend-pay");
const settleFriendStatus = document.getElementById("settle-friend-status");
const settleMethodField = document.getElementById("settle-method-field");
const settleMethodSelect = document.getElementById("settle-method-select");
const settleManual = document.getElementById("settle-manual");
const settleLabel = document.getElementById("settle-label");
const settleMethod = document.getElementById("settle-method");
const settleHandle = document.getElementById("settle-handle");
const settleBank = document.getElementById("settle-bank");
const settleAccount = document.getElementById("settle-account");
const settleNote = document.getElementById("settle-note");

state.lastHistoryId = null;
state.lastEventId = null;
state.currentUser = null;

/* ── Recorder ── */
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = null;
let recordInterval = null;
let isRecording = false;
let recordIntent = false; // true while finger/mouse is held (survives async mic permission)

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
  if (viewProfile) viewProfile.classList.toggle("hidden", view !== "profile");
  navNew.classList.toggle("active", view === "new");
  navHistory.classList.toggle("active", view === "history");
  navCalendar.classList.toggle("active", view === "calendar");
  navChat.classList.toggle("active", view === "chat");
  if (navProfile) navProfile.classList.toggle("active", view === "profile");
  if (view === "history") renderHistory();
  if (view === "calendar") renderCalendar();
  if (view === "chat") ensureChatWelcome();
  if (view === "profile") fillProfileForm();
}

navNew.addEventListener("click", () => switchView("new"));
navHistory.addEventListener("click", () => switchView("history"));
navCalendar.addEventListener("click", () => switchView("calendar"));
navChat.addEventListener("click", () => switchView("chat"));
if (navProfile) navProfile.addEventListener("click", () => switchView("profile"));
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
function clearRecordTimer() {
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
}

function setRecordIdleUI() {
  recordBtn.classList.remove("recording");
  recordIcon.textContent = "🎙️";
  recordLabel.textContent = "Hold to record";
  recordWave.classList.add("hidden");
}

async function startRecording(e) {
  if (e) {
    e.preventDefault();
  }
  if (recordIntent || isRecording) return;
  recordIntent = true;
  hideError();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // User already released while waiting for mic permission.
    if (!recordIntent) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) audioChunks.push(ev.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearRecordTimer();
      const blob = new Blob(audioChunks, { type: mimeType });
      if (blob.size > 0) {
        state.audioBlob = blob;
        audioPlayback.src = URL.createObjectURL(blob);
        audioPreview.classList.remove("hidden");
      }
      setRecordIdleUI();
      updateProcessButton();
    };

    mediaRecorder.start();
    isRecording = true;
    recordStartTime = Date.now();
    recordBtn.classList.add("recording");
    recordIcon.textContent = "⏺";
    recordLabel.textContent = "Recording…";
    recordWave.classList.remove("hidden");
    recordTimer.textContent = "0:00";

    clearRecordTimer();
    recordInterval = setInterval(() => {
      if (!recordIntent || !isRecording) {
        clearRecordTimer();
        return;
      }
      const secs = Math.floor((Date.now() - recordStartTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      recordTimer.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    }, 200);

    // Stop arrived during setup after permission but before start finished.
    if (!recordIntent) {
      stopRecording();
    }
  } catch {
    recordIntent = false;
    isRecording = false;
    clearRecordTimer();
    setRecordIdleUI();
    showError("Microphone access denied. Type who had what above instead.");
  }
}

function stopRecording(e) {
  if (e) e.preventDefault();
  recordIntent = false;
  clearRecordTimer();

  if (!isRecording || !mediaRecorder) {
    setRecordIdleUI();
    return;
  }

  isRecording = false;
  try {
    if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    else setRecordIdleUI();
  } catch {
    setRecordIdleUI();
  }
}

function resetRecording() {
  recordIntent = false;
  clearRecordTimer();
  if (isRecording && mediaRecorder && mediaRecorder.state !== "inactive") {
    try {
      mediaRecorder.stop();
    } catch {
      /* ignore */
    }
  }
  isRecording = false;
  state.audioBlob = null;
  audioPreview.classList.add("hidden");
  audioPlayback.src = "";
  recordTimer.textContent = "0:00";
  setRecordIdleUI();
  updateProcessButton();
}

recordBtn.addEventListener("pointerdown", startRecording);
recordBtn.addEventListener("pointerup", stopRecording);
recordBtn.addEventListener("pointercancel", stopRecording);
recordBtn.addEventListener("pointerleave", (e) => {
  if (recordIntent || isRecording) stopRecording(e);
});
// Older Safari fallbacks
recordBtn.addEventListener("touchstart", startRecording, { passive: false });
recordBtn.addEventListener("touchend", stopRecording, { passive: false });
recordBtn.addEventListener("touchcancel", stopRecording, { passive: false });

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
  fillPayerSelect(data);

  editParticipants.innerHTML = "";
  data.participants.forEach((person, pIdx) => {
    editParticipants.appendChild(buildEditParticipantCard(data, person, pIdx));
  });
}

function namesMatch(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function fillPayerSelect(data) {
  const current = data.paid_by || "";
  const me = getCurrentUser()?.name || "";
  editPayer.innerHTML = '<option value="">Select who fronted the money</option>';
  data.participants.forEach((person) => {
    const opt = document.createElement("option");
    opt.value = person.name;
    opt.textContent = person.name + (me && namesMatch(person.name, me) ? " (you)" : "");
    editPayer.appendChild(opt);
  });
  // Prefer an already-set payer (from draft); never auto-force "you".
  const matched = current
    ? data.participants.find((p) => namesMatch(p.name, current))
    : null;
  if (matched) {
    editPayer.value = matched.name;
    data.paid_by = matched.name;
  } else {
    editPayer.value = "";
    data.paid_by = "";
  }
  syncSettlePayUI();
}

function fillSettleMethodSelect(profiles, preferredId) {
  if (!settleMethodSelect) return;
  const list = Array.isArray(profiles) ? profiles : [];
  settleMethodSelect.innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label || p.method || "Payment")}</option>`
        )
        .join("")
    : '<option value="">No saved methods</option>';
  if (preferredId && list.some((p) => p.id === preferredId)) {
    settleMethodSelect.value = preferredId;
  } else if (list[0]) {
    settleMethodSelect.value = list[0].id;
  }
}

function syncSettlePayUI() {
  if (!settleSource) return;
  const source = settleSource.value;
  const me = getCurrentUser();
  const payerIsMe =
    !!editPayer?.value && !!me?.name && namesMatch(editPayer.value, me.name);

  if (settleFriendRow) settleFriendRow.classList.toggle("hidden", source !== "friend");
  if (settleManual) settleManual.classList.toggle("hidden", source !== "manual");

  if (source === "self") {
    state.settleProfiles = Array.isArray(me?.payment_profiles) ? me.payment_profiles : [];
    state.settleFriend = me
      ? { name: me.name, email: me.email || "" }
      : null;
    fillSettleMethodSelect(state.settleProfiles, me?.default_payment_id);
    if (settleMethodField) settleMethodField.classList.toggle("hidden", !state.settleProfiles.length);
    if (!state.settleProfiles.length && settleFriendStatus) {
      settleFriendStatus.textContent = "Save payment methods under Profile first.";
    } else if (settleFriendStatus && payerIsMe) {
      settleFriendStatus.textContent = "";
    }
  } else if (source === "friend") {
    const profiles = state.settleProfiles || [];
    fillSettleMethodSelect(profiles, state.settleFriend?.default_payment_id);
    if (settleMethodField) settleMethodField.classList.toggle("hidden", !profiles.length);
  } else if (source === "manual") {
    if (settleMethodField) settleMethodField.classList.add("hidden");
  } else {
    if (settleMethodField) settleMethodField.classList.add("hidden");
    if (settleFriendStatus) settleFriendStatus.textContent = "";
  }
}

function collectSettlePayment() {
  const source = settleSource?.value || "none";
  if (source === "none") return null;
  const payer = editPayer?.value || "";

  if (source === "manual") {
    const method = settleMethod?.value || "";
    const needsBank = methodNeedsBank(method);
    const snap = {
      source: "manual",
      owner_name: payer,
      owner_email: "",
      label: (settleLabel?.value || "").trim(),
      method,
      handle: (settleHandle?.value || "").trim(),
      bank_name: needsBank ? (settleBank?.value || "").trim() : "",
      account_number: needsBank ? (settleAccount?.value || "").trim() : "",
      note: (settleNote?.value || "").trim(),
    };
    if (!snap.method && !snap.handle && !snap.bank_name && !snap.account_number && !snap.note && !snap.label) {
      return null;
    }
    return snap;
  }

  const profiles = state.settleProfiles || [];
  const selectedId = settleMethodSelect?.value || "";
  const profile = profiles.find((p) => p.id === selectedId) || profiles[0];
  if (!profile) return null;
  return {
    source,
    owner_name: state.settleFriend?.name || payer,
    owner_email: state.settleFriend?.email || "",
    id: profile.id,
    label: profile.label || "",
    method: profile.method || "",
    handle: profile.handle || "",
    bank_name: profile.bank_name || "",
    account_number: profile.account_number || "",
    note: profile.note || "",
  };
}

async function lookupFriendPaymentMethods() {
  if (!settleFriendStatus) return;
  settleFriendStatus.textContent = "Looking up…";
  const email = (settleFriendEmail?.value || "").trim().toLowerCase();
  try {
    const res = await fetch(
      `/api/users/payment-methods?email=${encodeURIComponent(email)}`,
      { headers: authHeaders() }
    );
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Lookup failed.");
    state.settleFriend = {
      name: payload.name,
      email: payload.email,
      default_payment_id: payload.default_payment_id || "",
    };
    state.settleProfiles = Array.isArray(payload.payment_profiles)
      ? payload.payment_profiles
      : [];
    fillSettleMethodSelect(state.settleProfiles, state.settleFriend.default_payment_id);
    if (settleMethodField) {
      settleMethodField.classList.toggle("hidden", !state.settleProfiles.length);
    }
    if (!state.settleProfiles.length) {
      settleFriendStatus.textContent = `Found ${payload.name}, but they have no saved payment methods yet. Use manual entry or ask them to add methods in Profile.`;
    } else {
      settleFriendStatus.textContent = `Found ${payload.name} · ${state.settleProfiles.length} payment method(s).`;
    }
  } catch (err) {
    state.settleProfiles = [];
    state.settleFriend = null;
    if (settleMethodField) settleMethodField.classList.add("hidden");
    settleFriendStatus.textContent = err.message || "Lookup failed.";
  }
}

if (settleSource) {
  settleSource.addEventListener("change", () => {
    if (settleSource.value !== "friend") {
      state.settleProfiles = [];
      state.settleFriend = null;
      if (settleFriendStatus) settleFriendStatus.textContent = "";
    }
    syncSettlePayUI();
  });
}
if (btnLookupFriendPay) {
  btnLookupFriendPay.addEventListener("click", () => lookupFriendPaymentMethods());
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
    const oldName = data.participants[pIdx].name;
    const newName = e.target.value;
    const payerWasThis =
      (data.paid_by && namesMatch(data.paid_by, oldName)) ||
      (editPayer?.value && namesMatch(editPayer.value, oldName));
    data.participants[pIdx].name = newName;
    if (payerWasThis) data.paid_by = newName;
    fillPayerSelect(data);
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
  if (!editPayer.value) {
    alert("Select who paid the bill first before confirming.");
    return;
  }
  state.draftData.event_details.title = editTitle.value;
  state.draftData.event_details.date = editDate.value;
  state.draftData.event_details.currency = editCurrency.value;
  state.draftData.paid_by = editPayer.value;
  const settle = collectSettlePayment();
  if (settle) state.draftData.settle_payment = settle;
  else delete state.draftData.settle_payment;
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

editPayer.addEventListener("change", () => {
  if (state.draftData) state.draftData.paid_by = editPayer.value;
  const me = getCurrentUser();
  if (
    settleSource &&
    settleSource.value === "none" &&
    me?.name &&
    editPayer.value &&
    namesMatch(editPayer.value, me.name) &&
    Array.isArray(me.payment_profiles) &&
    me.payment_profiles.length
  ) {
    settleSource.value = "self";
  }
  syncSettlePayUI();
});

/* ── Results ── */
function renderResults(data) {
  const { event_details: event, receipt_summary: summary, participants } = data;
  const currency = event.currency;
  const payer = data.paid_by || "";
  syncSharePaymentSelect(data);

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

  if (payerBanner) {
    if (payer) {
      payerBanner.textContent = `${payer} paid the bill first. Everyone else should repay ${payer} their share.`;
      payerBanner.classList.remove("hidden");
    } else {
      payerBanner.textContent = "";
      payerBanner.classList.add("hidden");
    }
  }

  const grid = document.getElementById("participants-grid");
  grid.innerHTML = "";

  participants.forEach((person) => {
    const card = document.createElement("article");
    card.className = "participant-card";
    const isPayer = payer && namesMatch(person.name, payer);

    const itemsHtml = person.items_consumed
      .map(
        (item) =>
          `<li><span>${escapeHtml(item.item_name)}</span><span>${formatMoney(item.item_cost, currency)}</span></li>`
      )
      .join("");

    const settleLine = isPayer
      ? `<div class="settle-line payer">Paid the bill · others repay you</div>`
      : payer
        ? `<div class="settle-line">Repay ${escapeHtml(payer)}: ${formatMoney(person.total_owed, currency)}</div>`
        : "";

    card.innerHTML = `
      <div class="participant-header">
        <h4 class="participant-name">${escapeHtml(person.name)}${isPayer ? ' <span class="payer-tag">Paid first</span>' : ""}</h4>
        <span class="participant-total">${formatMoney(person.total_owed, currency)}</span>
      </div>
      ${settleLine}
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
  const payer = data.paid_by || "";
  let text = `DayTally: ${event.title}\n${event.date}\n\n`;
  text += `Grand total: ${formatMoney(summary.grand_total, c)}\n`;
  if (payer) text += `Paid first by: ${payer}\n`;
  text += `\nWho owes what:\n`;
  participants.forEach((p) => {
    const tag = payer && namesMatch(p.name, payer) ? " (paid the bill)" : payer ? ` → repay ${payer}` : "";
    text += `• ${p.name}: ${formatMoney(p.total_owed, c)}${tag}\n`;
    p.items_consumed.forEach((item) => {
      text += `  - ${item.item_name}: ${formatMoney(item.item_cost, c)}\n`;
    });
    text += `  (tax & service: ${formatMoney(p.tax_and_tip_share, c)})\n`;
  });
  const payBlock = formatSettlePaymentBlock(data);
  if (payBlock) text += `\n${payBlock}`;
  return text.trim();
}

function buildPersonMessage(data, person) {
  const c = data.event_details.currency;
  const payer = data.paid_by || "";
  let text = `Hey ${person.name}! For ${data.event_details.title} (${data.event_details.date}), your share is ${formatMoney(person.total_owed, c)}.`;
  if (payer && !namesMatch(person.name, payer)) {
    text += ` Please repay ${payer}.`;
  } else if (payer && namesMatch(person.name, payer)) {
    text += ` You paid the bill first.`;
  }
  text += `\n\nBreakdown:\n`;
  person.items_consumed.forEach((item) => {
    text += `• ${item.item_name}: ${formatMoney(item.item_cost, c)}\n`;
  });
  text += `• Tax & service: ${formatMoney(person.tax_and_tip_share, c)}`;
  if (payer && !namesMatch(person.name, payer)) {
    const payBlock = formatSettlePaymentBlock(data);
    if (payBlock) text += `\n\n${payBlock}`;
  }
  return text;
}

function formatSettlePaymentBlock(data) {
  const payer = data?.paid_by || "";
  if (!payer) return "";
  let pay = data.settle_payment || null;
  if (!pay) {
    const user = getCurrentUser();
    if (user?.name && namesMatch(user.name, payer)) {
      pay = getSelectedPaymentProfile();
      if (pay) pay = { ...pay, owner_name: user.name };
    }
  }
  if (!pay) return "";
  const owner = pay.owner_name || payer;
  const lines = [];
  if (pay.method) lines.push(`Pay via: ${pay.method}`);
  if (pay.label) lines.push(`Account name: ${pay.label}`);
  if (pay.handle) lines.push(`Phone: ${pay.handle}`);
  if (methodNeedsBank(pay.method) && pay.bank_name) lines.push(`Bank: ${pay.bank_name}`);
  if (methodNeedsBank(pay.method) && pay.account_number) {
    lines.push(`Account number: ${pay.account_number}`);
  }
  if (pay.note) lines.push(pay.note);
  if (!lines.length) return "";
  return `How to pay ${owner}:\n${lines.map((l) => `• ${l}`).join("\n")}`;
}

function getSelectedPaymentProfile() {
  const user = getCurrentUser();
  const profiles = Array.isArray(user?.payment_profiles) ? user.payment_profiles : [];
  if (!profiles.length) return null;
  const id = state.selectedPaymentId || user.default_payment_id || profiles[0].id;
  return profiles.find((p) => p.id === id) || profiles[0];
}

function paymentDetailsBlock(payer) {
  // Back-compat wrapper; prefer formatSettlePaymentBlock(data).
  return formatSettlePaymentBlock({ paid_by: payer, settle_payment: null });
}

function syncSharePaymentSelect(data) {
  if (!sharePayField || !sharePaymentProfile) return;
  if (data?.settle_payment) {
    sharePayField.classList.add("hidden");
    return;
  }
  const user = getCurrentUser();
  const profiles = Array.isArray(user?.payment_profiles) ? user.payment_profiles : [];
  const show =
    !!data?.paid_by &&
    !!user?.name &&
    namesMatch(data.paid_by, user.name) &&
    profiles.length > 0;
  sharePayField.classList.toggle("hidden", !show);
  if (!show) return;
  const selected =
    state.selectedPaymentId ||
    user.default_payment_id ||
    profiles[0]?.id ||
    "";
  state.selectedPaymentId = selected;
  sharePaymentProfile.innerHTML = profiles
    .map(
      (p) =>
        `<option value="${escapeHtml(p.id)}"${p.id === selected ? " selected" : ""}>${escapeHtml(
          p.label || p.method || "Payment"
        )}</option>`
    )
    .join("");
}

if (sharePaymentProfile) {
  sharePaymentProfile.addEventListener("change", () => {
    state.selectedPaymentId = sharePaymentProfile.value;
  });
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

/* ── Auth (Supabase via Flask API) ── */
function authHeaders() {
  const session = getSession();
  if (!session?.access_token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function getCurrentUser() {
  if (state.currentUser) return state.currentUser;
  const session = getSession();
  state.currentUser = session?.user || null;
  return state.currentUser;
}

function setSession(payload) {
  if (!payload) {
    state.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    if (userChipName) userChipName.textContent = "Guest";
    return;
  }
  const session = {
    user: payload.user,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || "",
  };
  state.currentUser = session.user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  if (userChipName) userChipName.textContent = session.user.name || session.user.email || "User";
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.toggle("hidden", !msg);
}

async function showApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  await refreshProfileFromCloud();
  const user = getCurrentUser();
  if (userChipName) userChipName.textContent = user ? user.name || user.email : "Guest";
  await refreshCloudData();
}

function showAuth() {
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
  showAuthError("");
}

function fillProfileForm() {
  const user = getCurrentUser() || {};
  if (profileName) profileName.value = user.name || "";
  if (profileEmail) profileEmail.value = user.email || "";
  renderPaymentProfileEditors(
    Array.isArray(user.payment_profiles) ? user.payment_profiles : [],
    user.default_payment_id || ""
  );
  if (profileError) {
    profileError.textContent = "";
    profileError.classList.add("hidden");
  }
  if (profileSaved) profileSaved.classList.add("hidden");
}

function newPaymentId() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const PAYMENT_METHODS = ["PayNow", "Bank transfer", "E-money (OVO / GoPay)"];

function methodNeedsBank(method) {
  return String(method || "") === "Bank transfer";
}

function syncPayCardBankFields(card) {
  const method = card.querySelector(".pay-method")?.value || "";
  const bankRow = card.querySelector(".pay-bank-row");
  if (bankRow) bankRow.classList.toggle("hidden", !methodNeedsBank(method));
  const handleLabel = card.querySelector(".pay-handle-label");
  if (handleLabel) {
    handleLabel.textContent = methodNeedsBank(method)
      ? "Phone (optional)"
      : "Phone number";
  }
}

function syncSettleManualBankFields() {
  const bankRow = document.getElementById("settle-bank-row");
  if (!bankRow || !settleMethod) return;
  bankRow.classList.toggle("hidden", !methodNeedsBank(settleMethod.value));
}

if (settleMethod) {
  settleMethod.addEventListener("change", syncSettleManualBankFields);
  syncSettleManualBankFields();
}

function emptyPaymentProfile() {
  return {
    id: newPaymentId(),
    label: "",
    method: "PayNow",
    handle: "",
    bank_name: "",
    account_number: "",
    note: "",
  };
}

function renderPaymentProfileEditors(profiles, defaultId) {
  if (!paymentProfilesList) return;
  const list = profiles.length ? profiles : [emptyPaymentProfile()];
  const def = defaultId || list[0]?.id || "";
  paymentProfilesList.innerHTML = "";
  list.forEach((p) => {
    // Map old methods to the simplified set when editing.
    if (p.method && !PAYMENT_METHODS.includes(p.method)) {
      if (/ovo|gopay|go pay|e-?money|qris/i.test(p.method)) {
        p = { ...p, method: "E-money (OVO / GoPay)" };
      } else if (/bank/i.test(p.method)) {
        p = { ...p, method: "Bank transfer" };
      } else {
        p = { ...p, method: "PayNow" };
      }
    }
    paymentProfilesList.appendChild(buildPaymentProfileCard(p, p.id === def));
  });
}

function buildPaymentProfileCard(profile, isDefault) {
  const card = document.createElement("div");
  card.className = "payment-profile-card";
  card.dataset.id = profile.id;
  const method = PAYMENT_METHODS.includes(profile.method)
    ? profile.method
    : "PayNow";
  card.innerHTML = `
    <div class="profile-pay-top">
      <label class="default-pay-label">
        <input type="radio" name="default-payment" class="pay-default" ${isDefault ? "checked" : ""}>
        Default
      </label>
      <button type="button" class="btn-text btn-remove-pay">Remove</button>
    </div>
    <div class="edit-field">
      <label>Method</label>
      <select class="pay-method">
        ${PAYMENT_METHODS.map(
          (m) =>
            `<option value="${m}"${method === m ? " selected" : ""}>${m}</option>`
        ).join("")}
      </select>
    </div>
    <div class="edit-field">
      <label>Account name</label>
      <input type="text" class="pay-label" maxlength="40" placeholder="Name on the account" value="${escapeHtml(profile.label || "")}">
    </div>
    <div class="edit-field">
      <label class="pay-handle-label">Phone number</label>
      <input type="text" class="pay-handle" maxlength="80" placeholder="+65… / +62…" value="${escapeHtml(profile.handle || "")}">
    </div>
    <div class="edit-row pay-bank-row">
      <div class="edit-field">
        <label>Bank name</label>
        <input type="text" class="pay-bank" maxlength="80" placeholder="DBS / BCA…" value="${escapeHtml(profile.bank_name || "")}">
      </div>
      <div class="edit-field">
        <label>Account number</label>
        <input type="text" class="pay-account" maxlength="80" value="${escapeHtml(profile.account_number || "")}">
      </div>
    </div>
    <div class="edit-field">
      <label>Note</label>
      <textarea class="pay-note" maxlength="200" rows="2" placeholder="Optional">${escapeHtml(profile.note || "")}</textarea>
    </div>
  `;
  card.querySelector(".pay-method").addEventListener("change", () => syncPayCardBankFields(card));
  syncPayCardBankFields(card);
  card.querySelector(".btn-remove-pay").addEventListener("click", () => {
    const cards = paymentProfilesList.querySelectorAll(".payment-profile-card");
    if (cards.length <= 1) {
      renderPaymentProfileEditors([emptyPaymentProfile()], "");
      return;
    }
    const wasDefault = card.querySelector(".pay-default")?.checked;
    card.remove();
    if (wasDefault) {
      const first = paymentProfilesList.querySelector(".pay-default");
      if (first) first.checked = true;
    }
  });
  return card;
}

function collectPaymentProfilesFromForm() {
  if (!paymentProfilesList) return { payment_profiles: [], default_payment_id: "" };
  const cards = [...paymentProfilesList.querySelectorAll(".payment-profile-card")];
  const payment_profiles = cards
    .map((card) => {
      const method = card.querySelector(".pay-method")?.value || "";
      const needsBank = methodNeedsBank(method);
      return {
        id: card.dataset.id || newPaymentId(),
        label: card.querySelector(".pay-label")?.value.trim() || "",
        method,
        handle: card.querySelector(".pay-handle")?.value.trim() || "",
        bank_name: needsBank ? card.querySelector(".pay-bank")?.value.trim() || "" : "",
        account_number: needsBank
          ? card.querySelector(".pay-account")?.value.trim() || ""
          : "",
        note: card.querySelector(".pay-note")?.value.trim() || "",
      };
    })
    .filter((p) => p.label || p.method || p.handle || p.bank_name || p.account_number || p.note);
  let default_payment_id = "";
  const checked = paymentProfilesList.querySelector(".pay-default:checked");
  if (checked) {
    default_payment_id = checked.closest(".payment-profile-card")?.dataset.id || "";
  }
  if (!default_payment_id && payment_profiles[0]) default_payment_id = payment_profiles[0].id;
  return { payment_profiles, default_payment_id };
}

if (btnAddPayment) {
  btnAddPayment.addEventListener("click", () => {
    if (!paymentProfilesList) return;
    if (paymentProfilesList.querySelectorAll(".payment-profile-card").length >= 8) {
      showToast("Max 8 payment methods.");
      return;
    }
    paymentProfilesList.appendChild(buildPaymentProfileCard(emptyPaymentProfile(), false));
  });
}

async function refreshProfileFromCloud() {
  if (!getSession()?.access_token) return;
  try {
    const res = await fetch("/api/auth/profile", { headers: authHeaders() });
    const payload = await res.json();
    if (!res.ok || !payload.user) return;
    const session = getSession();
    if (!session) return;
    session.user = payload.user;
    setSession(session);
    if (!state.selectedPaymentId && payload.user.default_payment_id) {
      state.selectedPaymentId = payload.user.default_payment_id;
    }
  } catch {
    /* keep local session */
  }
}

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (profileError) {
      profileError.textContent = "";
      profileError.classList.add("hidden");
    }
    if (profileSaved) profileSaved.classList.add("hidden");
    const pay = collectPaymentProfilesFromForm();
    const body = {
      name: (profileName?.value || "").trim(),
      payment_profiles: pay.payment_profiles,
      default_payment_id: pay.default_payment_id,
    };
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not save profile.");
      const session = getSession();
      setSession({
        user: payload.user,
        access_token: session?.access_token,
        refresh_token: session?.refresh_token || "",
      });
      state.selectedPaymentId = payload.user.default_payment_id || state.selectedPaymentId;
      fillProfileForm();
      if (profileSaved) profileSaved.classList.remove("hidden");
      showToast("Profile saved!");
    } catch (err) {
      if (profileError) {
        profileError.textContent = err.message || "Could not save profile.";
        profileError.classList.remove("hidden");
      }
    }
  });
}

async function refreshCloudData() {
  if (!getSession()?.access_token) return;
  try {
    const [splitsRes, eventsRes] = await Promise.all([
      fetch("/api/splits", { headers: authHeaders() }),
      fetch("/api/events", { headers: authHeaders() }),
    ]);
    const splitsJson = await splitsRes.json();
    const eventsJson = await eventsRes.json();
    if (splitsRes.ok && Array.isArray(splitsJson.splits)) {
      const mapped = splitsJson.splits.map((s) => ({
        id: s.id,
        userId: s.userId,
        savedAt: s.savedAt,
        eventId: s.eventId || null,
        data: s.data,
        cloud: true,
      }));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(mapped));
    }
    if (eventsRes.ok && Array.isArray(eventsJson.events)) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(eventsJson.events));
    }
    rebuildCalendarLinks();
  } catch {
    /* keep local cache if offline */
  }
}

authTabLogin.addEventListener("click", () => {
  authTabLogin.classList.add("active");
  authTabRegister.classList.remove("active");
  authLoginForm.classList.remove("hidden");
  authRegisterForm.classList.add("hidden");
  showAuthError("");
});

authTabRegister.addEventListener("click", () => {
  authTabRegister.classList.add("active");
  authTabLogin.classList.remove("active");
  authRegisterForm.classList.remove("hidden");
  authLoginForm.classList.add("hidden");
  showAuthError("");
});

authRegisterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const display_name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-pass").value;
  showAuthError("");
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Could not create profile.");
    if (payload.needs_email_confirmation || !payload.access_token) {
      showAuthError(payload.message || "Account created. Please confirm your email, then log in.");
      authTabLogin.click();
      const loginEmail = document.getElementById("login-email");
      if (loginEmail) loginEmail.value = email;
      return;
    }
    setSession(payload);
    await showApp();
  } catch (err) {
    showAuthError(err.message || "Could not create profile.");
  }
});

authLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;
  showAuthError("");
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Could not log in.");
    setSession(payload);
    await showApp();
  } catch (err) {
    showAuthError(err.message || "Could not log in.");
  }
});

btnLogout.addEventListener("click", () => {
  setSession(null);
  chatLog.innerHTML = "";
  chatLog.dataset.ready = "";
  showAuth();
});

if (btnGoogle) {
  btnGoogle.addEventListener("click", async () => {
    showAuthError("");
    try {
      const redirectTo = `${window.location.origin}/`;
      const res = await fetch(`/api/auth/google?redirect_to=${encodeURIComponent(redirectTo)}`);
      const payload = await res.json();
      if (!res.ok || !payload.url) throw new Error(payload.error || "Could not start Google sign-in.");
      window.location.href = payload.url;
    } catch (err) {
      showAuthError(err.message || "Could not start Google sign-in.");
    }
  });
}

async function completeOAuthFromUrl() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") || "";
  if (!accessToken) return false;
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }),
  });
  const payload = await res.json();
  history.replaceState({}, document.title, window.location.pathname + window.location.search);
  if (!res.ok) throw new Error(payload.error || "Google sign-in failed.");
  setSession(payload);
  await showApp();
  return true;
}

/* ── History (local cache + Supabase) ── */
function remapSplitIdInEvents(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const events = loadEvents();
  let changed = false;
  events.forEach((e) => {
    if (!Array.isArray(e.splitIds)) return;
    const idx = e.splitIds.indexOf(oldId);
    if (idx < 0) return;
    e.splitIds[idx] = newId;
    changed = true;
    syncEventToCloud(e);
  });
  if (changed) saveEvents(events);
}

function remapHistoryEventId(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const history = loadHistory();
  let changed = false;
  history.forEach((h) => {
    if (h.eventId === oldId) {
      h.eventId = newId;
      changed = true;
    }
  });
  if (changed) saveHistory(history);
}

function rebuildCalendarLinks() {
  const history = loadHistory();
  const events = loadEvents();
  let changedH = false;
  let changedE = false;

  history.forEach((h) => {
    const title = (h.data?.event_details?.title || "").trim().toLowerCase();
    const date = normalizeEventDate(h.data?.event_details?.date);
    let event = h.eventId ? events.find((e) => e.id === h.eventId) : null;
    if (!event && title) {
      event = events.find(
        (e) => String(e.title || "").toLowerCase() === title && e.date === date
      );
    }
    if (!event) return;
    if (h.eventId !== event.id) {
      h.eventId = event.id;
      changedH = true;
    }
    if (!Array.isArray(event.splitIds)) event.splitIds = [];
    if (!event.splitIds.includes(h.id)) {
      event.splitIds.push(h.id);
      changedE = true;
    }
  });

  events.forEach((e) => {
    if (!Array.isArray(e.splitIds)) e.splitIds = [];
    const before = e.splitIds.slice();
    const ids = new Set(e.splitIds.filter((id) => history.some((h) => h.id === id)));
    history.forEach((h) => {
      if (h.eventId === e.id) ids.add(h.id);
    });
    e.splitIds = [...ids];
    if (e.splitIds.length !== before.length || e.splitIds.some((id, i) => id !== before[i])) {
      changedE = true;
    }
  });

  if (changedH) saveHistory(history);
  if (changedE) saveEvents(events);
}

function saveToHistory(data) {
  const history = loadHistory();
  const user = getCurrentUser();
  const entry = {
    id: Date.now().toString(),
    userId: user?.id || null,
    savedAt: new Date().toISOString(),
    eventId: null,
    data: deepClone(data),
    cloud: false,
  };
  history.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));

  const token = getSession()?.access_token;
  if (token) {
    const localId = entry.id;
    fetch("/api/splits", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ data, local_id: localId }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok || !j.split) return;
        const newId = j.split.id;
        const all = loadHistory();
        const idx = all.findIndex((h) => h.id === localId || h.id === newId);
        if (idx >= 0) {
          all[idx].id = newId;
          all[idx].cloud = true;
          all[idx].savedAt = j.split.savedAt || all[idx].savedAt;
          localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        }
        entry.id = newId;
        entry.cloud = true;
        remapSplitIdInEvents(localId, newId);
        rebuildCalendarLinks();
      })
      .catch(() => {});
  }
  return entry;
}

function loadHistory() {
  try {
    const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const user = getCurrentUser();
    if (!user) return all;
    return all.filter((h) => !h.userId || h.userId === user.id);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function loadEvents() {
  try {
    const all = JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
    const user = getCurrentUser();
    if (!user) return all;
    return all.filter((e) => !e.userId || e.userId === user.id);
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
      userId: getCurrentUser()?.id || null,
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
  syncEventToCloud(event);

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
  const byId = new Map();
  (event.splitIds || []).forEach((id) => {
    const hit = history.find((h) => h.id === id);
    if (hit) byId.set(hit.id, hit);
  });
  history.forEach((h) => {
    if (h.eventId === event.id) byId.set(h.id, h);
  });
  const title = String(event.title || "")
    .trim()
    .toLowerCase();
  const date = event.date;
  if (title && date) {
    history.forEach((h) => {
      const hTitle = (h.data?.event_details?.title || "").trim().toLowerCase();
      const hDate = normalizeEventDate(h.data?.event_details?.date);
      if (hTitle === title && hDate === date) byId.set(h.id, h);
    });
  }
  return [...byId.values()];
}

function renderCalendar() {
  rebuildCalendarLinks();
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
    userId: getCurrentUser()?.id || null,
    title,
    date,
    notes: eventNotesInput.value.trim(),
    splitIds: [],
    createdAt: new Date().toISOString(),
  });
  saveEvents(events);
  syncEventToCloud(events[0]);
  eventCreateForm.reset();
  renderCalendar();
});

function syncEventToCloud(event) {
  if (!getSession()?.access_token) return;
  const localId = event.id;
  fetch("/api/events", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ event }),
  })
    .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
    .then(({ ok, j }) => {
      if (!ok || !j.event) return;
      const all = loadEvents();
      const idx = all.findIndex(
        (e) => e.id === localId || (e.title === j.event.title && e.date === j.event.date)
      );
      if (idx >= 0) {
        const mergedSplitIds = [
          ...new Set([...(all[idx].splitIds || []), ...(j.event.splitIds || []), ...(event.splitIds || [])]),
        ];
        all[idx] = { ...all[idx], ...j.event, splitIds: mergedSplitIds };
        saveEvents(all);
      }
      remapHistoryEventId(localId, j.event.id);
      rebuildCalendarLinks();
    })
    .catch(() => {});
}

/* ── Grounded chatbot (stored totals only) ── */
function ensureChatWelcome() {
  if (chatLog.dataset.ready === "1") return;
  chatLog.dataset.ready = "1";
  const me = getCurrentUser()?.name || "you";
  appendChatBubble(
    "bot",
    `Hi ${me}. Ask about your saved splits and events. Try “What do I still owe?” — that uses your profile name and who paid first on each bill.`
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
  const me = getCurrentUser()?.name || "";

  if (!history.length && !events.length) {
    return "I do not have any saved splits or events yet. Confirm a bill first, then ask again.";
  }

  if (/list.*(event|calendar)|recent events|my events/.test(q)) {
    if (!events.length) return "No calendar events saved yet.";
    return events
      .slice(0, 8)
      .map((e) => {
        const n = getSplitsForEvent(e).length;
        return `• ${e.title} (${e.date}) — ${n} linked bill${n === 1 ? "" : "s"}`;
      })
      .join("\n");
  }

  if (/who paid|paid first|who fronted/.test(q)) {
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const payer = last.data.paid_by || "";
    if (!payer) {
      return `Your latest split “${last.data.event_details.title}” has no payer set. Open it from History, or make a new split and choose “Who paid first” on Review before confirming.`;
    }
    return `On “${last.data.event_details.title}” (${last.data.event_details.date}), ${payer} was marked as who paid first. The chatbot cannot change that — edit “Who paid first” on Review before you confirm, or delete and re-confirm the split.`;
  }

  if (/last split|most recent|latest bill/.test(q)) {
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const d = last.data;
    const c = d.event_details.currency;
    const payer = d.paid_by ? ` Paid first by ${d.paid_by}.` : "";
    const people = d.participants.map((p) => `${p.name} ${formatMoney(p.total_owed, c)}`).join(", ");
    return `Last split: ${d.event_details.title} on ${d.event_details.date}. Grand total ${formatMoney(d.receipt_summary.grand_total, c)}.${payer} ${people}.`;
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

  const askingMyOwe = /what do i (still )?owe|how much do i (still )?owe|what do i need to (pay|repay)/.test(q);
  const oweMatch =
    q.match(/(?:owe|owes|owed)\s+([a-z][a-z\-']+)/i) ||
    q.match(/what does\s+([a-z][a-z\-']+)\s+owe/i);
  if (askingMyOwe || oweMatch || /who owes what|balances?/.test(q)) {
    if (askingMyOwe) {
      if (!me) return "Log in with your profile name first so I know who “I” is.";
      const debts = [];
      history.forEach((h) => {
        const d = h.data;
        const payer = d.paid_by || "";
        const meRow = d.participants.find((p) => namesMatch(p.name, me));
        if (!meRow) return;
        if (payer && namesMatch(payer, me)) return;
        debts.push({
          to: payer || "the group (payer not set)",
          amount: meRow.total_owed,
          currency: d.event_details.currency,
          event: d.event_details.title,
          date: d.event_details.date,
        });
      });
      if (!debts.length) {
        const asPayer = history.filter(
          (h) => h.data.paid_by && namesMatch(h.data.paid_by, me)
        );
        if (asPayer.length) {
          const samples = asPayer
            .slice(0, 3)
            .map((h) => `“${h.data.event_details.title}”`)
            .join(", ");
          return `You (${me}) were marked as who paid first on ${asPayer.length} bill(s), so you do not owe anyone on those (e.g. ${samples}). If someone else paid (e.g. Jovan), set “Who paid first” to them on the Review step before confirming — the chatbot cannot change an already saved payer.`;
        }
        return `I found no open shares for ${me}. You may not be listed as a participant on saved bills, or payer was not set. Check History and your display name under Profile.`;
      }
      const byPayee = {};
      debts.forEach((row) => {
        const key = `${row.to}|${row.currency}`;
        byPayee[key] = byPayee[key] || { to: row.to, currency: row.currency, amount: 0, lines: [] };
        byPayee[key].amount += Number(row.amount || 0);
        byPayee[key].lines.push(
          `• ${row.event} (${row.date}): ${formatMoney(row.amount, row.currency)} → ${row.to}`
        );
      });
      const summary = Object.values(byPayee)
        .map((g) => `${formatMoney(g.amount, g.currency)} to ${g.to}`)
        .join("; ");
      const detail = Object.values(byPayee)
        .flatMap((g) => g.lines)
        .slice(0, 8)
        .join("\n");
      return `As ${me}, you still owe: ${summary}.\n${detail}`;
    }

    const nameFilter = oweMatch ? oweMatch[1] : null;
    const rows = [];
    history.forEach((h) => {
      const payer = h.data.paid_by || "";
      h.data.participants.forEach((p) => {
        if (nameFilter && !p.name.toLowerCase().includes(nameFilter.toLowerCase())) return;
        if (payer && namesMatch(p.name, payer)) return;
        rows.push({
          person: p.name,
          amount: p.total_owed,
          currency: h.data.event_details.currency,
          event: h.data.event_details.title,
          date: h.data.event_details.date,
          to: payer || "payer unset",
        });
      });
    });
    if (!rows.length) {
      return nameFilter
        ? `I found no stored repay amounts for anyone matching “${nameFilter}”.`
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
        .map((r) => `• ${r.event} (${r.date}): ${formatMoney(r.amount, r.currency)} → ${r.to}`)
        .join("\n");
      return `From saved splits, “${nameFilter}” should repay: ${sumLine}.\n${detail}`;
    }
    return rows
      .slice(0, 10)
      .map((r) => `• ${r.person} owes ${formatMoney(r.amount, r.currency)} to ${r.to} (${r.event})`)
      .join("\n");
  }

  return "I can answer total spend, what you owe (using your profile + who paid first), recent events, or your last split. Money always comes from stored confirmations.";
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

/* ── Boot ── */
(async function boot() {
  try {
    if (await completeOAuthFromUrl()) return;
  } catch (err) {
    showAuth();
    showAuthError(err.message || "Google sign-in failed.");
    return;
  }
  if (getSession()?.access_token && getCurrentUser()) {
    await showApp();
  } else {
    showAuth();
  }
})();
