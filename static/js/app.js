/* ── State ── */
const state = {
  step: 1,
  receiptFile: null,
  audioBlob: null,
  draftData: null,
  draftFlags: [],
  confirmedData: null,
  gstPercent: 0,
  gstBase: "food",
  svcPercent: 0,
  selectedPaymentId: "",
  settleProfiles: [],
  settleFriend: null,
  view: "new",
  friends: [],
  whoMode: "type",
};

const THEME_KEY = "daytally_theme";
const NOTES_SEEN_KEY = "daytally_notes_seen";
const HISTORY_KEY = "daytally_history";
const EVENTS_KEY = "daytally_events";
const SESSION_KEY = "daytally_session_v2";
const MAX_HISTORY = 20;

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  const showingLight = next === "dark";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.setAttribute("aria-pressed", showingLight ? "false" : "true");
    btn.setAttribute("aria-label", showingLight ? "Switch to light mode" : "Switch to dark mode");
  });
}

applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
document.querySelectorAll(".theme-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
  });
});

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
const whoType = document.getElementById("who-type");
const whoSpeak = document.getElementById("who-speak");
const whoChoiceType = document.getElementById("who-choice-type");
const whoChoiceSpeak = document.getElementById("who-choice-speak");
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
const settleFriendSelect = document.getElementById("settle-friend-select");
const settleFriendStatus = document.getElementById("settle-friend-status");
const friendRequests = document.getElementById("friend-requests");
const friendList = document.getElementById("friend-list");
const friendAddForm = document.getElementById("friend-add-form");
const friendEmail = document.getElementById("friend-email");
const friendStatus = document.getElementById("friend-status");
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

function matchingWholeRate(base, tax, currency) {
  if (!(base > 0)) return null;
  const raw = (Number(tax) / base) * 100;
  const seen = new Set();
  for (const rate of [Math.floor(raw), Math.round(raw), Math.ceil(raw)]) {
    if (seen.has(rate) || rate < 0 || rate > 30) continue;
    seen.add(rate);
    if (Math.abs(roundMoney(base * (rate / 100), currency) - roundMoney(tax, currency)) < 0.001) {
      return rate;
    }
  }
  return null;
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

function setWizardStep(step, options) {
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

  if (step === 4) showStudyCard(!!(options && options.feedback));
  syncFriendPolling();
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
  itemInput.placeholder = "Dishes they had";
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

function setWhoMode(mode) {
  state.whoMode = mode === "speak" ? "speak" : "type";
  if (whoType) whoType.classList.toggle("hidden", state.whoMode !== "type");
  if (whoSpeak) whoSpeak.classList.toggle("hidden", state.whoMode !== "speak");
  if (whoChoiceType) {
    whoChoiceType.classList.toggle("active", state.whoMode === "type");
    whoChoiceType.setAttribute("aria-pressed", state.whoMode === "type" ? "true" : "false");
  }
  if (whoChoiceSpeak) {
    whoChoiceSpeak.classList.toggle("active", state.whoMode === "speak");
    whoChoiceSpeak.setAttribute("aria-pressed", state.whoMode === "speak" ? "true" : "false");
  }
  updateProcessButton();
}

function canProcess() {
  if (state.whoMode === "speak") return !!state.audioBlob;
  return [...splitPeople.querySelectorAll(".split-person")].some((row) => {
    const name = row.querySelector(".split-name").value.trim();
    const item = row.querySelector(".split-item").value.trim();
    return name && item;
  });
}

function updateProcessButton() {
  btnProcess.disabled = !canProcess();
}

/* ── Navigation ── */
function switchView(view) {
  if (state.view === "new" && view !== "new" && state.step === 4) {
    resetWizard();
  }
  state.view = view;
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
  if (view === "profile") {
    fillProfileForm();
    loadFriends();
  }
  syncFriendPolling();
}

navNew.addEventListener("click", () => switchView("new"));
navHistory.addEventListener("click", () => switchView("history"));
navCalendar.addEventListener("click", () => switchView("calendar"));
navChat.addEventListener("click", () => switchView("chat"));
if (navProfile) navProfile.addEventListener("click", () => switchView("profile"));
btnOpenCalendar.addEventListener("click", () => switchView("calendar"));

/* ── Receipt step ── */
function shrinkReceipt(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const edge = Math.max(img.width, img.height);
      if (edge <= 1600) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const scale = 1600 / edge;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function setReceiptFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  state.receiptFile = file;
  receiptName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    receiptPreview.src = e.target.result;
    receiptPreview.classList.remove("hidden");
    receiptPlaceholder.classList.add("hidden");
    document.querySelectorAll(".who-receipt-frame").forEach((frame) => {
      const img = frame.querySelector(".who-receipt");
      img.src = e.target.result;
      img.style.width = "100%";
      frame.dataset.scale = "1";
      frame.classList.remove("hidden");
    });
  };
  reader.readAsDataURL(file);
  btnToVoice.disabled = false;
  document.getElementById("continue-hint")?.classList.add("hidden");
}

receiptInput.addEventListener("change", () => {
  if (receiptInput.files[0]) setReceiptFile(receiptInput.files[0]);
});

document.querySelectorAll(".who-receipt-frame").forEach((frame) => {
  const img = frame.querySelector(".who-receipt");
  const applyZoom = (next) => {
    const scale = Math.min(3, Math.max(1, next));
    frame.dataset.scale = String(scale);
    img.style.width = `${Math.round(scale * 100)}%`;
  };
  frame.querySelector("[data-zoom='in']").addEventListener("click", () => {
    applyZoom(Number(frame.dataset.scale || 1) + 0.5);
  });
  frame.querySelector("[data-zoom='out']").addEventListener("click", () => {
    applyZoom(Number(frame.dataset.scale || 1) - 0.5);
  });
  let pinchStart = 0;
  let pinchScale = 1;
  frame.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 2) return;
    pinchStart = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchScale = Number(frame.dataset.scale || 1);
  }, { passive: true });
  frame.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 2 || !pinchStart) return;
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    applyZoom(pinchScale * (dist / pinchStart));
  }, { passive: true });
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
if (whoChoiceType) whoChoiceType.addEventListener("click", () => setWhoMode("type"));
if (whoChoiceSpeak) whoChoiceSpeak.addEventListener("click", () => setWhoMode("speak"));
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
    showError(
      state.whoMode === "speak"
        ? "Record who had what before calculating."
        : "Add at least one person and what they had."
    );
    return;
  }

  hideError();
  setLoading(true);
  showProcessing();

  const formData = new FormData();
  formData.append("receipt", await shrinkReceipt(state.receiptFile));

  if (state.whoMode === "speak") {
    if (state.audioBlob) formData.append("audio", state.audioBlob, "voice-note.webm");
  } else {
    const splitText = composeSplitText();
    if (splitText) formData.append("voice_text", splitText);
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
    state.lastDebug = payload.debug || null;
    state.nodeLine = modelLine(payload.debug);
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

function modelLine(debug) {
  const nodes = debug && debug.node_models;
  if (!nodes) return "";
  const speech = nodes.speech === "typed_text" ? "typed text, Whisper not used" : nodes.speech;
  const split = nodes.fusion === "local_match" ? "matched in code, Gemini not called" : nodes.fusion;
  const t = debug.timings || {};
  const timing = ` Time: receipt ${t.ocr_s || 0}s, voice ${t.transcribe_s || 0}s, split ${t.fusion_s || 0}s.`;
  const heard = nodes.speech !== "typed_text" && debug.transcript ? ` Heard: ${debug.transcript}` : "";
  return `Receipt: ${nodes.ocr}. Voice: ${speech}. Split: ${split}.${timing}${heard}`;
}

function renderReviewFlags(flags) {
  if (!reviewFlags) return;
  const items = (flags || []).map((flag) => `<li>${escapeHtml(flag.message)}</li>`).join("");
  if (!items) {
    reviewFlags.classList.add("hidden");
    reviewFlags.innerHTML = "";
    return;
  }
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
  const tax = Number(summary.tax) || 0;
  const service = Number(summary.tip) || 0;
  if (subtotal > 0) {
    const currency = data.event_details?.currency;
    const withService = subtotal + service;
    const foodRate = matchingWholeRate(subtotal, tax, currency);
    const bothRate = matchingWholeRate(withService, tax, currency);
    if (bothRate != null && foodRate == null) {
      state.gstPercent = bothRate;
      state.gstBase = "food-and-service";
    } else {
      state.gstPercent = foodRate != null ? foodRate : round2((tax / subtotal) * 100);
      state.gstBase = "food";
    }
    state.svcPercent = round2((service / subtotal) * 100);
  }
}

function applyPercentToAmounts(data) {
  const subtotal = itemsSubtotalFromParticipants(data);
  const summary = data.receipt_summary;
  const currency = data.event_details?.currency;
  summary.subtotal = subtotal;
  summary.tip = roundMoney(subtotal * (state.svcPercent / 100), currency);
  const gstBase = state.gstBase === "food-and-service" ? subtotal + summary.tip : subtotal;
  summary.tax = roundMoney(gstBase * (state.gstPercent / 100), currency);
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
  const gstHint = document.getElementById("gst-base-hint");
  if (gstHint) {
    const onService = state.gstBase === "food-and-service";
    gstHint.textContent = onService
      ? "This GST is a percent of the food plus the service charge."
      : "";
    gstHint.classList.toggle("hidden", !onService);
  }
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
  if (document.activeElement !== editDate) {
    const shownDate = formatDisplayDate(data.event_details.date);
    editDate.value = shownDate;
    if (shownDate) data.event_details.date = shownDate;
  }
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
  const list = (Array.isArray(profiles) ? profiles : []).filter(paymentHasDestination);
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
    const accepted = (state.friends || []).filter((friend) => friend.status === "accepted");
    const previousFriend = settleFriendSelect?.value || "";
    const previousMethod = settleMethodSelect?.value || "";
    if (settleFriendSelect) {
      settleFriendSelect.innerHTML = accepted.length
        ? accepted
            .map((friend) => {
              const label = friend.name || friend.email;
              const missing = friendHasPayment(friend) ? "" : " (no payment method)";
              return `<option value="${escapeHtml(friend.id)}">${escapeHtml(label + missing)}</option>`;
            })
            .join("")
        : '<option value="">No accepted friends yet</option>';
      if (previousFriend && accepted.some((friend) => friend.id === previousFriend)) {
        settleFriendSelect.value = previousFriend;
      }
    }
    const chosen =
      accepted.find((friend) => friend.id === settleFriendSelect?.value) || accepted[0] || null;
    if (!chosen) {
      state.settleFriend = null;
      state.settleProfiles = [];
      if (settleMethodField) settleMethodField.classList.add("hidden");
      if (settleFriendStatus) {
        settleFriendStatus.textContent =
          "Add them under Profile. Their number stays hidden until they accept.";
      }
    } else {
      state.settleFriend = {
        name: chosen.name,
        email: chosen.email,
        default_payment_id: chosen.default_payment_id || "",
      };
      state.settleProfiles = Array.isArray(chosen.payment_profiles) ? chosen.payment_profiles : [];
      fillSettleMethodSelect(state.settleProfiles, chosen.default_payment_id);
      if (
        previousMethod &&
        state.settleProfiles.some((profile) => profile.id === previousMethod && paymentHasDestination(profile))
      ) {
        settleMethodSelect.value = previousMethod;
      }
      const usable = state.settleProfiles.some(paymentHasDestination);
      if (settleMethodField) settleMethodField.classList.toggle("hidden", !usable);
      if (settleFriendStatus) {
        settleFriendStatus.textContent = usable
          ? ""
          : `${chosen.name || "This friend"} has no saved payment method. Choose Use my saved details or Type the details.`;
      }
    }
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
    if (!paymentHasDestination(snap)) return null;
    return snap;
  }

  const profiles = state.settleProfiles || [];
  const selectedId = settleMethodSelect?.value || "";
  const profile = profiles.find((p) => p.id === selectedId) || profiles[0];
  if (!profile || !paymentHasDestination(profile)) return null;
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

function friendHasPayment(friend) {
  return (friend?.payment_profiles || []).some(paymentHasDestination);
}

function friendRow(friend, actions, options) {
  const row = document.createElement("div");
  row.className = "friend-row" + (options?.kind ? ` ${options.kind}` : "");
  const text = document.createElement("div");
  text.className = "friend-copy";
  const title = document.createElement("strong");
  title.textContent = friend.name || friend.email;
  const detail = document.createElement("p");
  detail.className = "field-hint";
  detail.textContent = friend.email || "";
  text.append(title, detail);
  if (options?.status) {
    const status = document.createElement("p");
    status.className = "friend-status-line";
    status.textContent = options.status;
    text.append(status);
  }
  const buttons = document.createElement("div");
  buttons.className = "friend-actions";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.danger ? "btn-text danger" : "btn-secondary";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    buttons.appendChild(button);
  });
  row.append(text, buttons);
  return row;
}

let friendPollTimer = null;

function friendWatchIsOpen() {
  if (!getSession()?.access_token) return false;
  if (state.view === "profile") return true;
  return state.view === "new" && state.step === 3 && settleSource?.value === "friend";
}

function syncFriendPolling() {
  if (friendWatchIsOpen()) {
    if (!friendPollTimer) {
      friendPollTimer = setInterval(() => {
        if (!friendWatchIsOpen()) {
          clearInterval(friendPollTimer);
          friendPollTimer = null;
          return;
        }
        loadFriends({ quiet: true });
      }, 3000);
    }
    return;
  }
  if (friendPollTimer) {
    clearInterval(friendPollTimer);
    friendPollTimer = null;
  }
}

let friendLoadGen = 0;

async function loadFriends(options) {
  const quiet = !!(options && options.quiet);
  if (!getSession()?.access_token) return;
  const gen = ++friendLoadGen;
  try {
    const response = await fetch("/api/friends", { headers: authHeaders() });
    const payload = await response.json();
    if (gen !== friendLoadGen) return;
    if (!response.ok) throw new Error(payload.error || "Could not load friends.");
    const incoming = Array.isArray(payload.friends) ? payload.friends : [];
    const same = JSON.stringify(incoming) === JSON.stringify(state.friends);
    state.friends = incoming;
    if (quiet && same) return;
  } catch (err) {
    if (gen !== friendLoadGen) return;
    if (quiet) return;
    state.friends = [];
    if (friendStatus) friendStatus.textContent = err.message || "Could not load friends.";
  }
  renderFriends();
  if (settleSource?.value === "friend") syncSettlePayUI();
}

function showFriends(next) {
  friendLoadGen += 1;
  state.friends = next;
  renderFriends();
  if (settleSource?.value === "friend") syncSettlePayUI();
}

function renderFriends() {
  if (!friendRequests || !friendList) return;
  friendRequests.innerHTML = "";
  friendList.innerHTML = "";
  const incoming = state.friends.filter((friend) => friend.role === "incoming" && friend.status === "pending");
  const outgoing = state.friends.filter((friend) => friend.role === "outgoing" && friend.status === "pending");
  const accepted = state.friends.filter((friend) => friend.status === "accepted");
  if (incoming.length) {
    const heading = document.createElement("p");
    heading.className = "friend-group-label";
    heading.textContent = "Incoming requests";
    friendRequests.appendChild(heading);
  }
  incoming.forEach((friend) => {
    friendRequests.appendChild(
      friendRow(
        friend,
        [
          { label: "Accept", onClick: () => respondToFriend(friend.id, "accept") },
          { label: "Decline", danger: true, onClick: () => respondToFriend(friend.id, "delete") },
        ],
        { kind: "is-request" }
      )
    );
  });
  if (accepted.length) {
    const heading = document.createElement("p");
    heading.className = "friend-group-label";
    heading.textContent = "Friends";
    friendList.appendChild(heading);
  }
  accepted.forEach((friend) => {
    friendList.appendChild(
      friendRow(
        friend,
        [{ label: "Remove", danger: true, onClick: () => respondToFriend(friend.id, "delete") }],
        {
          kind: "is-accepted",
          status: friendHasPayment(friend) ? "" : "No payment method saved",
        }
      )
    );
  });
  if (outgoing.length) {
    const heading = document.createElement("p");
    heading.className = "friend-group-label";
    heading.textContent = "Requested";
    friendList.appendChild(heading);
  }
  outgoing.forEach((friend) => {
    friendList.appendChild(
      friendRow(
        friend,
        [{ label: "Cancel", danger: true, onClick: () => respondToFriend(friend.id, "delete") }],
        { kind: "is-waiting", status: "Waiting for them to accept" }
      )
    );
  });
}

const friendBusy = new Set();

async function respondToFriend(id, action) {
  if (friendBusy.has(id)) return;
  friendBusy.add(id);
  const previous = state.friends.map((row) => ({ ...row }));
  if (friendStatus) friendStatus.textContent = "";
  if (action === "delete") {
    showFriends(state.friends.filter((row) => row.id !== id));
  } else {
    showFriends(
      state.friends.map((row) => (row.id === id ? { ...row, status: "accepted" } : row))
    );
  }
  const path = action === "accept" ? `/api/friends/${id}/accept` : `/api/friends/${id}`;
  const method = action === "accept" ? "POST" : "DELETE";
  try {
    const response = await fetch(path, { method, headers: authHeaders() });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not update that friend.");
    loadFriends({ quiet: true });
  } catch (err) {
    showFriends(previous);
    if (friendStatus) friendStatus.textContent = err.message || "Could not update that friend.";
  } finally {
    friendBusy.delete(id);
  }
}

async function addFriend(email) {
  const pendingId = `pending_${Date.now()}`;
  const previous = state.friends.map((row) => ({ ...row }));
  showFriends([
    {
      id: pendingId,
      email,
      name: email,
      status: "pending",
      role: "outgoing",
    },
    ...state.friends.filter((row) => String(row.email || "").toLowerCase() !== email),
  ]);
  if (friendEmail) friendEmail.value = "";
  if (friendStatus) friendStatus.textContent = "Sending request…";
  const submit = friendAddForm?.querySelector("button[type=submit]");
  if (submit) submit.disabled = true;
  try {
    const response = await fetch("/api/friends", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not add that friend.");
    const friend = payload.friend;
    showFriends([
      friend,
      ...state.friends.filter((row) => row.id !== pendingId && row.id !== friend?.id),
    ].filter(Boolean));
    if (friendStatus) {
      friendStatus.textContent =
        friend?.status === "accepted"
          ? "You are now friends."
          : "Request sent. Their number stays hidden until they accept.";
    }
    loadFriends({ quiet: true });
  } catch (err) {
    showFriends(previous);
    if (friendEmail) friendEmail.value = email;
    throw err;
  } finally {
    if (submit) submit.disabled = false;
  }
}

if (settleSource) {
  settleSource.addEventListener("change", () => {
    if (settleSource.value === "friend") {
      loadFriends();
      syncFriendPolling();
      return;
    }
    state.settleProfiles = [];
    state.settleFriend = null;
    if (settleFriendStatus) settleFriendStatus.textContent = "";
    syncSettlePayUI();
    syncFriendPolling();
  });
}
if (settleFriendSelect) {
  settleFriendSelect.addEventListener("change", () => syncSettlePayUI());
}
if (friendAddForm) {
  friendAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await addFriend((friendEmail?.value || "").trim().toLowerCase());
    } catch (err) {
      if (friendStatus) friendStatus.textContent = err.message || "Could not add that friend.";
    }
  });
}

function buildEditParticipantCard(data, person, pIdx) {
  const card = document.createElement("div");
  card.className = "edit-participant-card";
  const currency = data.event_details.currency;

  person.items_consumed.forEach((item) => {
    const shown = displayItemName(item.item_name);
    if (shown) item.item_name = shown;
  });

  const itemsHtml = person.items_consumed
    .map(
      (item, iIdx) => `
      <div class="edit-item-row" data-p="${pIdx}" data-i="${iIdx}">
        <input type="text" class="edit-item-name" value="${escapeHtml(displayItemName(item.item_name))}" data-field="name">
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

function displayItemName(name) {
  let text = String(name || "").trim();
  const original = text;
  text = text.replace(/^\d{2,3}[Il|]\s*(?=[A-Za-z])/, "");
  text = text.replace(/^\d{2,4}(?=[A-Za-z])/, "");
  text = text.replace(/^\d{3}\s+(?=[A-Za-z])/, "");
  if (!text) text = original;
  text = text.replace(/--+/g, "-");
  text = text.replace(/\b(with|and)(?=[A-Za-z])/gi, "$1 ");
  text = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  text = text.replace(/([A-Za-z])([\u4e00-\u9fff])/g, "$1 $2");
  text = text.replace(/\s+/g, " ").trim();
  return text || original;
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
  setWizardStep(4, { feedback: true });
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
  document.getElementById("event-date").textContent = formatDisplayDate(event.date) || event.date;
  document.getElementById("event-currency").textContent = currency;
  document.getElementById("grand-total").textContent = formatMoney(summary.grand_total, currency);
  document.getElementById("subtotal").textContent = formatMoney(summary.subtotal, currency);
  const gstPct = summary.subtotal > 0 ? round2((summary.tax / summary.subtotal) * 100) : 0;
  const svcPct = summary.subtotal > 0 ? round2((summary.tip / summary.subtotal) * 100) : 0;
  const gstCurrency = data.event_details?.currency;
  const foodRate = matchingWholeRate(summary.subtotal, summary.tax, gstCurrency);
  const bothRate = matchingWholeRate(
    Number(summary.subtotal) + Number(summary.tip || 0),
    summary.tax,
    gstCurrency
  );
  const gstOnBoth = bothRate != null && foodRate == null;
  const gstShown = gstOnBoth ? bothRate : foodRate != null ? foodRate : gstPct;
  document.getElementById("tax-label").textContent = gstOnBoth
    ? `GST (${gstShown}% of food and service)`
    : `GST (${gstShown}%)`;
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

    const itemsHtml = (person.items_consumed || [])
      .map(
        (item) =>
          `<li><span>${escapeHtml(displayItemName(item.item_name))}</span><span>${formatMoney(item.item_cost, currency)}</span></li>`
      )
      .join("");

    const settleLine = isPayer
      ? `<div class="settle-line payer">Paid the bill · others repay you</div>`
      : payer
        ? `<div class="settle-line">Repay ${escapeHtml(payer)}: ${formatMoney(person.total_owed, currency)}</div>`
        : "";

    const paidBtn = isPayer
      ? ""
      : `<button type="button" class="paid-back-btn${person.repaid ? " is-paid" : ""}">${person.repaid ? "Paid back" : "Mark as paid back"}</button>`;
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
      ${paidBtn}
    `;

    const paidButton = card.querySelector(".paid-back-btn");
    if (paidButton) {
      paidButton.addEventListener("click", () => {
        person.repaid = !person.repaid;
        paidButton.classList.toggle("is-paid", person.repaid);
        paidButton.textContent = person.repaid ? "Paid back" : "Mark as paid back";
        if (state.confirmedData) {
          const match = (state.confirmedData.participants || []).find((p) => namesMatch(p.name, person.name));
          if (match) match.repaid = person.repaid;
        }
        if (state.lastHistoryId) {
          patchHistory(state.lastHistoryId, (saved) => {
            const match = (saved.data.participants || []).find((p) => namesMatch(p.name, person.name));
            if (match) match.repaid = person.repaid;
          });
        }
      });
    }
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
    const tag = payer && namesMatch(p.name, payer) ? " (paid the bill)" : payer ? ` (repay ${payer})` : "";
    text += `${p.name}: ${formatMoney(p.total_owed, c)}${tag}\n`;
    p.items_consumed.forEach((item) => {
      text += `${displayItemName(item.item_name)}: ${formatMoney(item.item_cost, c)}\n`;
    });
    text += `Tax & service: ${formatMoney(p.tax_and_tip_share, c)}\n\n`;
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
    text += `• ${displayItemName(item.item_name)}: ${formatMoney(item.item_cost, c)}\n`;
  });
  text += `• Tax & service: ${formatMoney(person.tax_and_tip_share, c)}`;
  if (payer && !namesMatch(person.name, payer)) {
    const payBlock = formatSettlePaymentBlock(data);
    if (payBlock) text += `\n\n${payBlock}`;
  }
  return text;
}

function paymentHasDestination(pay) {
  if (!pay) return false;
  const phone = String(pay.handle || "").trim();
  const account = String(pay.account_number || "").trim();
  return !!(phone || account);
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
  if (!paymentHasDestination(pay)) return "";
  const owner = pay.owner_name || payer;
  const lines = [];
  if (pay.method) lines.push(`Pay via: ${pay.method}`);
  if (pay.label) lines.push(`Account name: ${pay.label}`);
  const phone = String(pay.handle || "").trim();
  if (phone) lines.push(`Phone: ${phone}`);
  if (methodNeedsBank(pay.method) && pay.bank_name) lines.push(`Bank: ${pay.bank_name}`);
  const account = String(pay.account_number || "").trim();
  if (methodNeedsBank(pay.method) && account) {
    lines.push(`Account number: ${account}`);
  }
  if (pay.note) lines.push(pay.note);
  if (!lines.length) return "";
  return `How to pay ${owner}:\n${lines.map((l) => `• ${l}`).join("\n")}`;
}

function getSelectedPaymentProfile() {
  const user = getCurrentUser();
  const profiles = (Array.isArray(user?.payment_profiles) ? user.payment_profiles : []).filter(
    paymentHasDestination
  );
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
  const profiles = (Array.isArray(user?.payment_profiles) ? user.payment_profiles : []).filter(
    paymentHasDestination
  );
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

const STUDY_QUESTIONS = [
  ["q1", "I understood what to do at each wizard step."],
  ["q2", "The Who-had-what form was easier than typing a full paragraph."],
  ["q3", "The split amounts looked fair for what each person ordered."],
  ["q4", "I could correct mistakes on Review without re-entering the whole bill."],
  ["q5", "Waiting for Calculate split was acceptable for this task."],
  ["q6", "I would use this with friends after a real meal."],
];

function renderStudyForm() {
  const host = document.getElementById("study-scores");
  if (!host || host.dataset.ready) return;
  host.dataset.ready = "1";
  host.innerHTML = STUDY_QUESTIONS.map(([id, text]) => `
    <fieldset class="study-q">
      <legend>${text}</legend>
      <div class="study-scale">
        ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${id}" value="${n}"><span>${n}</span></label>`).join("")}
      </div>
      <div class="study-ends"><span>Disagree</span><span>Agree</span></div>
    </fieldset>
  `).join("");
}

function lockStudyCard(message) {
  const card = document.getElementById("study-card");
  if (!card) return;
  card.classList.add("study-locked");
  const thanks = document.getElementById("study-thanks");
  if (thanks) {
    thanks.textContent = message;
    thanks.classList.remove("hidden");
  }
  document.getElementById("btn-study-submit")?.classList.add("hidden");
}

function showStudyCard(on) {
  const card = document.getElementById("study-card");
  if (!card) return;
  renderStudyForm();
  card.classList.toggle("hidden", !on);
  if (!on) return;
  card.classList.remove("study-locked");
  card.querySelectorAll("input[type=radio]").forEach((input) => {
    input.checked = false;
  });
  const confusing = document.getElementById("study-confusing");
  const change = document.getElementById("study-change");
  const trust = document.getElementById("study-trust");
  if (confusing) confusing.value = "";
  if (change) change.value = "";
  if (trust) trust.value = "";
  const thanks = document.getElementById("study-thanks");
  if (thanks) {
    thanks.textContent = "Saved. Thank you. One response per person.";
    thanks.classList.add("hidden");
  }
  document.getElementById("btn-study-submit")?.classList.remove("hidden");
  document.getElementById("study-error")?.classList.add("hidden");
  fetch("/api/feedback/mine", { headers: authHeaders() })
    .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
    .then(({ ok, payload }) => {
      if (ok && payload.submitted) lockStudyCard("You already sent feedback. One response per person.");
    })
    .catch(() => {});
}

document.getElementById("btn-study-submit")?.addEventListener("click", async () => {
  const error = document.getElementById("study-error");
  const scores = {};
  for (const [id] of STUDY_QUESTIONS) {
    const picked = document.querySelector(`input[name="${id}"]:checked`);
    if (!picked) {
      if (error) {
        error.textContent = "Choose a score from 1 to 5 on every line.";
        error.classList.remove("hidden");
      }
      return;
    }
    scores[id] = Number(picked.value);
  }
  const debug = state.lastDebug || {};
  const speech = debug.node_models && debug.node_models.speech;
  const path = speech && speech !== "typed_text" ? "voice" : "who_form";
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        scores,
        confusing: document.getElementById("study-confusing")?.value || "",
        change: document.getElementById("study-change")?.value || "",
        trust: document.getElementById("study-trust")?.value || "",
        path,
        timings: debug.timings || {},
        heard: debug.transcript || "",
      }),
    });
    const payload = await response.json();
    if (response.status === 409) {
      lockStudyCard(payload.error || "You already sent feedback. One response per person.");
      return;
    }
    if (!response.ok) throw new Error(payload.error || "Could not save feedback.");
    lockStudyCard("Saved. Thank you. One response per person.");
    if (error) error.classList.add("hidden");
  } catch (err) {
    if (error) {
      error.textContent = err.message || "Could not save feedback.";
      error.classList.remove("hidden");
    }
  }
});

function resetWizard() {
  state.receiptFile = null;
  state.audioBlob = null;
  state.draftData = null;
  state.draftFlags = [];
  renderReviewFlags([]);
  state.confirmedData = null;
  state.lastHistoryId = null;
  receiptInput.value = "";
  receiptPreview.classList.add("hidden");
  receiptPreview.src = "";
  receiptPlaceholder.classList.remove("hidden");
  document.querySelectorAll(".who-receipt-frame").forEach((frame) => {
    const img = frame.querySelector(".who-receipt");
    img.style.width = "100%";
    frame.dataset.scale = "1";
    img.removeAttribute("src");
    frame.classList.add("hidden");
  });
  receiptName.textContent = "";
  btnToVoice.disabled = true;
  document.getElementById("continue-hint")?.classList.remove("hidden");
  resetRecording();
  resetSplitForm();
  setWhoMode("type");
  hideError();
  setWizardStep(1);
  showStudyCard(false);
}

btnNewSplit.addEventListener("click", () => {
  resetWizard();
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

function tokenExpired(accessToken) {
  try {
    const part = String(accessToken || "").split(".")[1];
    if (!part) return true;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
    const json = JSON.parse(atob(padded));
    if (!json.exp) return false;
    return Number(json.exp) * 1000 <= Date.now() + 60000;
  } catch {
    return true;
  }
}

const SIGN_IN_AGAIN = "Your sign-in expired. Sign in again to load your bills.";
let sessionRefresh = null;

function expireSignIn() {
  setSession(null);
  showAuth();
  showAuthError(SIGN_IN_AGAIN);
}

async function ensureFreshSession(force) {
  const session = getSession();
  if (!session?.access_token) return false;
  if (!force && !tokenExpired(session.access_token)) return true;
  if (!session.refresh_token) {
    expireSignIn();
    return false;
  }
  if (!sessionRefresh) {
    sessionRefresh = fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok || !payload.access_token) throw new Error(payload.error || SIGN_IN_AGAIN);
        setSession(payload);
        return true;
      })
      .catch(() => {
        expireSignIn();
        return false;
      })
      .finally(() => {
        sessionRefresh = null;
      });
  }
  return sessionRefresh;
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

function showNotes(on) {
  document.getElementById("notes-overlay")?.classList.toggle("hidden", !on);
}

function dismissNotes() {
  showNotes(false);
  localStorage.setItem(NOTES_SEEN_KEY, "1");
}

async function showApp(options) {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  if (options && options.notes && !localStorage.getItem(NOTES_SEEN_KEY)) showNotes(true);
  await refreshProfileFromCloud();
  const user = getCurrentUser();
  if (userChipName) userChipName.textContent = user ? user.name || user.email : "Guest";
  await refreshCloudData();
}

document.getElementById("btn-notes-close")?.addEventListener("click", () => dismissNotes());
document.getElementById("notes-overlay")?.addEventListener("click", (event) => {
  if (event.target.id === "notes-overlay") dismissNotes();
});

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
  const list = (profiles || []).filter(paymentHasDestination);
  paymentProfilesList.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "field-hint pay-empty";
    empty.textContent = "No payment method saved.";
    paymentProfilesList.appendChild(empty);
    return;
  }
  const def = defaultId || list[0]?.id || "";
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
      renderPaymentProfileEditors([], "");
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
    .filter((p) => paymentHasDestination(p));
  let default_payment_id = "";
  const checked = paymentProfilesList.querySelector(".pay-default:checked");
  if (checked) {
    default_payment_id = checked.closest(".payment-profile-card")?.dataset.id || "";
  }
  if (!payment_profiles.some((p) => p.id === default_payment_id)) {
    default_payment_id = payment_profiles[0] ? payment_profiles[0].id : "";
  }
  return { payment_profiles, default_payment_id };
}

if (btnAddPayment) {
  btnAddPayment.addEventListener("click", () => {
    if (!paymentProfilesList) return;
    if (paymentProfilesList.querySelectorAll(".payment-profile-card").length >= 8) {
      showToast("Max 8 payment methods.");
      return;
    }
    paymentProfilesList.querySelector(".pay-empty")?.remove();
    const isFirst = paymentProfilesList.querySelectorAll(".payment-profile-card").length === 0;
    paymentProfilesList.appendChild(buildPaymentProfileCard(emptyPaymentProfile(), isFirst));
  });
}

async function refreshProfileFromCloud() {
  if (!(await ensureFreshSession())) return;
  try {
    let res = await fetch("/api/auth/profile", { headers: authHeaders() });
    if (res.status === 401) {
      if (!(await ensureFreshSession(true))) return;
      res = await fetch("/api/auth/profile", { headers: authHeaders() });
    }
    const payload = await res.json();
    if (res.status === 401) {
      expireSignIn();
      return;
    }
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
  if (!(await ensureFreshSession())) return;
  try {
    let [splitsRes, eventsRes] = await Promise.all([
      fetch("/api/splits", { headers: authHeaders() }),
      fetch("/api/events", { headers: authHeaders() }),
    ]);
    if (splitsRes.status === 401 || eventsRes.status === 401) {
      if (!(await ensureFreshSession(true))) return;
      [splitsRes, eventsRes] = await Promise.all([
        fetch("/api/splits", { headers: authHeaders() }),
        fetch("/api/events", { headers: authHeaders() }),
      ]);
    }
    if (splitsRes.status === 401 || eventsRes.status === 401) {
      expireSignIn();
      return;
    }
    const splitsJson = await splitsRes.json();
    const eventsJson = await eventsRes.json();
    if (splitsRes.ok && Array.isArray(splitsJson.splits)) {
      const local = loadHistory();
      const byId = new Map(local.map((h) => [String(h.id), h]));
      splitsJson.splits.forEach((s) => {
        let data = s.data;
        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch {
            data = null;
          }
        }
        if (!data || !data.event_details) return;
        const row = {
          id: s.id,
          userId: s.userId,
          savedAt: s.savedAt,
          eventId: s.eventId || null,
          data,
          cloud: true,
        };
        const existing = byId.get(String(s.id));
        byId.set(String(s.id), existing ? { ...existing, ...row, data } : row);
      });
      saveHistory([...byId.values()]);
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
    await showApp({ notes: true });
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
    await showApp({ notes: true });
  } catch (err) {
    showAuthError(err.message || "Could not log in.");
  }
});

btnLogout.addEventListener("click", () => {
  setSession(null);
  chatLog.innerHTML = "";
  chatLog.dataset.ready = "";
  showNotes(false);
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
  await showApp({ notes: true });
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

  const dateFixed = [];
  events.forEach((event) => {
    const linked = history.filter(
      (h) => h.eventId === event.id || (event.splitIds || []).includes(h.id)
    );
    const dates = [
      ...new Set(
        linked
          .map((h) => normalizeEventDate(h.data?.event_details?.date))
          .filter(Boolean)
      ),
    ];
    if (dates.length === 1 && event.date !== dates[0]) {
      event.date = dates[0];
      changedE = true;
      dateFixed.push(event);
    }
  });

  if (changedH) saveHistory(history);
  if (changedE) saveEvents(events);
  dateFixed.forEach((event) => syncEventToCloud(event));
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
  saveHistory(history);

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
          saveHistory(all);
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
  let all = [];
  try {
    all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    all = [];
  }
  const user = getCurrentUser();
  const others = user ? all.filter((h) => h.userId && h.userId !== user.id) : [];
  const mine = (history || []).slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...mine, ...others]));
}

function patchHistory(id, mutator) {
  let all = [];
  try {
    all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    all = [];
  }
  const next = all.map((entry) => {
    if (entry.id !== id) return entry;
    const copy = deepClone(entry);
    mutator(copy);
    return copy;
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
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

const DATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoFromParts(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeEventDate(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    const now = new Date();
    return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return isoFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (match) {
    const iso = isoFromParts(Number(match[3]), Number(match[2]), Number(match[1]));
    if (iso) return iso;
  }
  match = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
  if (match) {
    const month = DATE_MONTHS.findIndex(
      (name) => name.toLowerCase() === match[2].slice(0, 3).toLowerCase()
    );
    if (month >= 0) {
      const iso = isoFromParts(Number(match[3]), month + 1, Number(match[1]));
      if (iso) return iso;
    }
  }
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    return isoFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  return text;
}

function formatDisplayDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const iso = normalizeEventDate(text);
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text;
  return `${Number(match[3])} ${DATE_MONTHS[Number(match[2]) - 1]} ${match[1]}`;
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

function isCloudId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
}

async function deleteCloudRows(kind, ids) {
  const cloudIds = [...new Set(ids.map(String))].filter(isCloudId);
  if (!cloudIds.length || !getSession()?.access_token) return;
  for (const id of cloudIds) {
    const response = await fetch(`/api/${kind}/${id}`, { method: "DELETE", headers: authHeaders() });
    if (response.ok || response.status === 404) continue;
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Could not delete.");
  }
}

function eventForHistoryEntry(entry) {
  const events = loadEvents();
  if (entry.eventId) {
    const linked = events.find((ev) => ev.id === entry.eventId);
    if (linked) return linked;
  }
  const title = (entry.data?.event_details?.title || "").trim().toLowerCase();
  const date = normalizeEventDate(entry.data?.event_details?.date);
  if (!title) return null;
  return (
    events.find((ev) => String(ev.title || "").trim().toLowerCase() === title && ev.date === date) || null
  );
}

function discardOpenSplit(ids) {
  const drop = new Set(ids.map(String));
  if (!drop.has(String(state.lastHistoryId || ""))) return;
  btnNewSplit.click();
}

async function deleteHistoryAndCalendar(splitIds, eventIds) {
  const bills = [...new Set(splitIds.map(String))];
  const eventsToRemove = [...new Set(eventIds.map(String))];
  await deleteCloudRows("splits", bills);
  await deleteCloudRows("events", eventsToRemove);
  if (bills.length) {
    saveHistory(loadHistory().filter((h) => !bills.includes(String(h.id))));
  }
  if (eventsToRemove.length) {
    saveEvents(loadEvents().filter((ev) => !eventsToRemove.includes(String(ev.id))));
  }
  discardOpenSplit(bills);
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

    const billGroups = [];
    const billsByKey = new Map();
    splits.forEach((split) => {
      const key = billFingerprint(split);
      let group = billsByKey.get(key);
      if (!group) {
        group = { split, count: 0 };
        billsByKey.set(key, group);
        billGroups.push(group);
      }
      group.count += 1;
    });
    const splitsHtml = billGroups.length
      ? billGroups
          .map((group) => {
            const c = group.split.data.event_details.currency;
            const billTitle = String(group.split.data.event_details.title || "").trim();
            const sameTitle = billTitle.toLowerCase() === String(event.title || "").trim().toLowerCase();
            const label = sameTitle ? "" : `<strong>${escapeHtml(billTitle)}</strong> · `;
            const extra = group.count > 1 ? ` · saved ${group.count} times` : "";
            return `<li class="event-split-line"><span>${label}${formatMoney(group.split.data.receipt_summary.grand_total, c)}${extra}</span><button type="button" class="btn-text btn-view-event-split" data-split-id="${escapeHtml(String(group.split.id))}">View bill</button></li>`;
          })
          .join("")
      : "<li class=\"muted\">No bill linked yet</li>";

    el.innerHTML = `
      <div class="event-item-main">
        <strong>${escapeHtml(event.title)}</strong>
        <span>${escapeHtml(formatDisplayDate(event.date) || event.date)}</span>
        ${event.notes ? `<span class="event-notes">${escapeHtml(event.notes)}</span>` : ""}
        <ul class="event-splits">${splitsHtml}</ul>
      </div>
      <div class="history-item-actions">
        <button type="button" class="btn-text btn-delete-event danger">Delete</button>
      </div>
    `;

    el.querySelectorAll(".btn-view-event-split").forEach((viewBtn) => {
      viewBtn.addEventListener("click", () => {
        const split = splits.find((item) => String(item.id) === viewBtn.dataset.splitId);
        if (!split) return;
        state.confirmedData = deepClone(split.data);
        state.lastHistoryId = split.id;
        renderResults(state.confirmedData);
        if (calendarBindStatus) {
          calendarBindStatus.textContent = `Linked to calendar event “${event.title}” (${formatDisplayDate(event.date) || event.date}).`;
        }
        switchView("new");
        setWizardStep(4);
      });
    });

    el.querySelector(".btn-delete-event").addEventListener("click", async () => {
      const splits = getSplitsForEvent(event);
      const extra = loadHistory().filter((h) => h.eventId === event.id).map((h) => h.id);
      const billIds = [...new Set([...splits.map((s) => s.id), ...extra])];
      const title = event.title || "this event";
      const message = billIds.length
        ? `Delete “${title}” from the calendar and History? This cannot be undone.`
        : `Delete “${title}” from the calendar? This cannot be undone.`;
      if (!window.confirm(message)) return;
      try {
        await deleteHistoryAndCalendar(billIds, [event.id]);
      } catch (err) {
        showError(err.message || "Could not delete.");
        return;
      }
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
    `Hi ${me}. Ask about your saved splits and events. Try “What do I still owe?” That uses your profile name and who paid first on each bill.`
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
  const raw = String(isoOrDate || "").trim();
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

let lastChatFollow = "";

function answerChat(question, expanded) {
  const raw = question.toLowerCase().trim();
  if (!expanded && lastChatFollow) {
    const follow = raw.match(/^(?:what|how) about\s+([a-z][a-z'\-]+)(?:\s+then)?\??$/)
      || raw.match(/^(?:and|also)\s+([a-z][a-z'\-]+)\??$/)
      || raw.match(/^([a-z][a-z'\-]+)\??$/);
    if (follow) {
      const name = follow[1];
      const rewritten = lastChatFollow === "owes-me"
        ? `Does ${name} owe me`
        : lastChatFollow === "i-owe"
          ? `What do I owe ${name}`
          : lastChatFollow === "share"
            ? `What is ${name} share`
            : lastChatFollow === "did-pay"
              ? `Did ${name} pay`
              : "";
      if (rewritten) return answerChat(rewritten, true);
    }
  }
  const q = raw;
  const history = loadHistory();
  const events = loadEvents();
  const me = getCurrentUser()?.name || "";

  if (!history.length && !events.length) {
    return "I do not have any saved splits or events yet. Confirm a bill first, then ask again.";
  }

  if (/list.*(event|calendar)|recent events|my events/.test(q)) {
    lastChatFollow = "";
    if (!events.length) return "No calendar events saved yet.";
    return events
      .slice(0, 8)
      .map((e) => {
        const n = getSplitsForEvent(e).length;
        return `• ${e.title} (${formatDisplayDate(e.date) || e.date}): ${n} linked bill${n === 1 ? "" : "s"}`;
      })
      .join("\n");
  }

  if (/who paid|paid first|who fronted/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const payer = last.data.paid_by || "";
    if (!payer) {
      return `Your latest split “${last.data.event_details.title}” has no payer set. Open it from History, or make a new split and choose “Who paid first” on Review before confirming.`;
    }
    return `On “${last.data.event_details.title}” (${last.data.event_details.date}), ${payer} was marked as who paid first. The chatbot cannot change that. Edit “Who paid first” on Review before you confirm, or delete and re-confirm the split.`;
  }

  if (/last split|most recent|latest bill/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const d = last.data;
    const c = d.event_details.currency;
    const payer = d.paid_by ? ` Paid first by ${d.paid_by}.` : "";
    const people = d.participants.map((p) => `${p.name} ${formatMoney(p.total_owed, c)}`).join(", ");
    return `Last split: ${d.event_details.title} on ${d.event_details.date}. Grand total ${formatMoney(d.receipt_summary.grand_total, c)}.${payer} ${people}.`;
  }

  if (/how much is the bill|how much was the bill|what is the bill total|what was the total/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const d = last.data;
    return `The latest bill, ${d.event_details.title} (${d.event_details.date}), has a grand total of ${formatMoney(d.receipt_summary.grand_total, d.event_details.currency)}.`;
  }

  if (/how much.*(spend|spent|total)|total spend|grand total|spent in total/.test(q)) {
    lastChatFollow = "";
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

  const selfWord = /^(me|myself|i|you)$/;
  const stopName = /^(who|what|anyone|someone|everybody|everyone|money|people|they|them|somebody)$/;
  const doesNameOweMe = q.match(/(?:do|does|did)\s+([a-z][a-z\-']+)\s+ow(?:e|es|ed)?\s+(?:me|myself|i|you)\b/);
  const whatDoIOweName = q.match(/(?:what|how much) do i (?:still )?ow(?:e|es|ed)?\s+([a-z][a-z\-']+)/)
    || q.match(/\bdo i (?:still )?ow(?:e|es|ed)?\s+([a-z][a-z\-']+)/);
  const shouldPayMe = q.match(/(?:should|do|does|did)\s+([a-z][a-z\-']+)\s+(?:pay|repay|paid)\s+(?:me|you)\b/)
    || q.match(/how much should\s+([a-z][a-z\-']+)\s+(?:pay|repay)\s+(?:me|you)\b/);
  const askingMyOwe =
    !whatDoIOweName &&
    /what do i (still )?owe|how much do i (still )?owe|what do i need to (pay|repay)/.test(q);
  const oweMatch =
    q.match(/(?:what|how much) does\s+([a-z][a-z\-']+)\s+owe/i) ||
    q.match(/\b([a-z][a-z\-']+)\s+owe[sd]?\b/i);
  const nameToken = (match) => {
    const token = match && match[1] ? match[1].toLowerCase() : "";
    return token && !selfWord.test(token) && !stopName.test(token) ? token : "";
  };
  const sharesFor = (token) => {
    const hits = [];
    history.forEach((h) => {
      const d = h.data;
      const payer = d.paid_by || "";
      (d.participants || []).forEach((p) => {
        const person = String(p.name || "");
        const folded = person.toLowerCase();
        if (token && folded !== token && !folded.startsWith(token) && !folded.includes(token)) return;
        if (token && token.length < 3) return;
        hits.push({
          person,
          amount: Number(p.total_owed || 0),
          currency: d.event_details.currency,
          event: d.event_details.title,
          date: d.event_details.date,
          payer,
          userIsPayer: !!(payer && me && namesMatch(payer, me)),
          personIsPayer: !!(payer && namesMatch(payer, person)),
          repaid: !!p.repaid,
          userAmount: (() => {
            const row = (d.participants || []).find((item) => me && namesMatch(item.name, me));
            return row ? Number(row.total_owed || 0) : null;
          })(),
          userRepaid: !!(() => {
            const row = (d.participants || []).find((item) => me && namesMatch(item.name, me));
            return row && row.repaid;
          })(),
        });
      });
    });
    return hits;
  };

  const oweMeMatch = doesNameOweMe || shouldPayMe;
  if (oweMeMatch && !stopName.test(oweMeMatch[1].toLowerCase())) {
    lastChatFollow = "owes-me";
    const token = oweMeMatch[1].toLowerCase();
    if (selfWord.test(token)) {
      return "Ask with their name, for example “Does Mevan owe me?”";
    }
    const hits = sharesFor(token).filter((row) => row.person.toLowerCase().includes(token));
    if (!hits.length) return `I found no saved share for “${token}”.`;
    return hits
      .map((row) => {
        const money = formatMoney(row.amount, row.currency);
        if (row.personIsPayer && me && namesMatch(row.person, me)) {
          return `You paid first on ${row.event} (${row.date}), so you do not owe yourself.`;
        }
        if (row.personIsPayer) {
          if (row.userAmount == null) {
            return `${row.person} paid first on ${row.event} (${row.date}), so ${row.person} does not owe you.`;
          }
          return `${row.person} paid first on ${row.event} (${row.date}), so ${row.person} does not owe you. You owe ${row.person} ${formatMoney(row.userAmount, row.currency)}.`;
        }
        if (row.userIsPayer) {
          if (row.repaid) return `${row.person} has paid you back on ${row.event} (${row.date}). The ${money} is marked paid in History.`;
          return `${row.person} owes you ${money} on ${row.event} (${row.date}). Tick Paid back in History when you have it.`;
        }
        if (row.payer) {
          return `${row.person} owes ${money} to ${row.payer} on ${row.event} (${row.date}), not to you.`;
        }
        return `${row.person}'s share on ${row.event} (${row.date}) is ${money}. No payer was saved, so I cannot say they owe you.`;
      })
      .join("\n");
  }

  if (whatDoIOweName && !selfWord.test(whatDoIOweName[1])) {
    lastChatFollow = "i-owe";
    const token = whatDoIOweName[1].toLowerCase();
    const hits = sharesFor(token).filter((row) => row.person.toLowerCase().includes(token));
    if (!hits.length) return `I found no saved share for “${token}”.`;
    return hits
      .map((row) => {
        if (row.userIsPayer) {
          if (row.repaid) return `You paid first on ${row.event} (${row.date}). ${row.person} has paid you back. The ${formatMoney(row.amount, row.currency)} is marked paid in History.`;
          return `You paid first on ${row.event} (${row.date}), so you do not owe ${row.person}. ${row.person} still owes you ${formatMoney(row.amount, row.currency)}.`;
        }
        if (row.personIsPayer) {
          if (row.userAmount == null) {
            return `${row.person} paid first on ${row.event} (${row.date}). You are not listed on that bill.`;
          }
          if (row.userRepaid) return `You marked your ${formatMoney(row.userAmount, row.currency)} share as paid back to ${row.person} on ${row.event} (${row.date}).`;
          return `You owe ${row.person} ${formatMoney(row.userAmount, row.currency)} on ${row.event} (${row.date}). Tick Paid back next to your name in History when you have sent it.`;
        }
        if (row.payer) {
          return `On ${row.event} (${row.date}), ${row.payer} paid first. ${row.person} owes ${formatMoney(row.amount, row.currency)} to ${row.payer}.`;
        }
        return `On ${row.event} (${row.date}), ${row.person}'s share is ${formatMoney(row.amount, row.currency)}. No payer was saved.`;
      })
      .join("\n");
  }

  if (/who owes me\b|who owes money|does (?:anyone|someone|everybody|everyone) owe me/.test(q) || (me && new RegExp(`who owes ${me.toLowerCase()}\\b`).test(q))) {
    lastChatFollow = "owes-me";
    const lines = [];
    history.forEach((h) => {
      const d = h.data;
      const payer = d.paid_by || "";
      if (!payer || !namesMatch(payer, me)) return;
      (d.participants || []).forEach((p) => {
        if (namesMatch(p.name, payer)) return;
        const money = formatMoney(p.total_owed, d.event_details.currency);
        if (p.repaid) {
          lines.push(`${p.name} has paid you back on ${d.event_details.title} (${d.event_details.date}). The ${money} is marked paid in History.`);
        } else {
          lines.push(`${p.name} still owes you ${money} on ${d.event_details.title} (${d.event_details.date}).`);
        }
      });
    });
    if (!lines.length) return "Nobody owes you on the saved bills. Either you did not pay first, or no shares are stored.";
    return lines.join("\n");
  }

  const shareAsk = q.match(/(?:what is|how much is)\s+([a-z][a-z\-']+)\s+share/)
    || q.match(/([a-z][a-z\-']+)(?:'s|s)\s+share/);
  if (shareAsk && nameToken(shareAsk)) {
    lastChatFollow = "share";
    const token = nameToken(shareAsk);
    const hits = sharesFor(token).filter((row) => row.person.toLowerCase().includes(token));
    if (!hits.length) return `I found no saved share for “${token}”.`;
    return hits
      .map((row) => {
        const money = formatMoney(row.amount, row.currency);
        if (row.personIsPayer) return `${row.person} paid first on ${row.event} (${row.date}). Their own share is ${money}, so they do not repay it.`;
        if (row.userIsPayer) {
          return row.repaid
            ? `${row.person}'s share is ${money} on ${row.event} (${row.date}). You marked it paid in History.`
            : `${row.person}'s share is ${money} on ${row.event} (${row.date}). ${row.person} still owes you that amount.`;
        }
        if (row.payer) return `${row.person}'s share is ${money} on ${row.event} (${row.date}). ${row.person} owes ${row.payer}.`;
        return `${row.person}'s share is ${money} on ${row.event} (${row.date}). No payer was saved.`;
      })
      .join("\n");
  }

  const didPay = q.match(/(?:did|has|have)\s+([a-z][a-z\-']+)\s+(?:already\s+)?(?:pay|paid)(?:\s+(?:me|you)(?:\s+back)?|\s+back)?\b/);
  if (didPay && nameToken(didPay) && !/pay\s+(?:me|you)\b/.test(q)) {
    lastChatFollow = "did-pay";
    const token = nameToken(didPay);
    const hits = sharesFor(token).filter((row) => row.person.toLowerCase().includes(token));
    if (!hits.length) return `I found no saved share for “${token}”.`;
    return hits
      .map((row) => {
        if (row.personIsPayer) return `Yes. ${row.person} paid the restaurant first on ${row.event} (${row.date}).`;
        if (row.repaid) return `Yes. ${row.person} is marked paid in History for ${formatMoney(row.amount, row.currency)} on ${row.event} (${row.date}).`;
        return `Not yet. ${row.person} still owes ${formatMoney(row.amount, row.currency)}${row.userIsPayer ? " to you" : row.payer ? ` to ${row.payer}` : ""} on ${row.event} (${row.date}). Tick Paid back in History when you have it.`;
      })
      .join("\n");
  }

  if (askingMyOwe || nameToken(oweMatch) || /who owes what|balances?/.test(q)) {
    if (askingMyOwe) {
      lastChatFollow = "i-owe";
      if (!me) return "Log in with your profile name first so I know who “I” is.";
      const debts = [];
      history.forEach((h) => {
        const d = h.data;
        const payer = d.paid_by || "";
        const meRow = d.participants.find((p) => namesMatch(p.name, me));
        if (!meRow || meRow.repaid) return;
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
          return `You (${me}) were marked as who paid first on ${asPayer.length} bill${asPayer.length === 1 ? "" : "s"}, so you do not owe anyone on ${asPayer.length === 1 ? "that bill" : "those bills"} (for example ${samples}). If someone else paid, set “Who paid first” to them on the Review step before confirming. The chatbot cannot change an already saved payer.`;
        }
        const names = [
          ...new Set(
            history.flatMap((h) => (h.data.participants || []).map((p) => String(p.name || "").trim()).filter(Boolean))
          ),
        ];
        if (names.length) {
          return `Your profile name is ${me}. None of the saved bills use that name, so there is no share to add up. The bills use ${names.join(", ")}. Under Profile, set Display name to the spelling on the bill if one of those people is you.`;
        }
        return `I found no open shares for ${me}. You may not be listed as a participant on saved bills, or payer was not set. Check History and your display name under Profile.`;
      }
      const byPayee = {};
      debts.forEach((row) => {
        const key = `${row.to}|${row.currency}`;
        byPayee[key] = byPayee[key] || { to: row.to, currency: row.currency, amount: 0, lines: [] };
        byPayee[key].amount += Number(row.amount || 0);
        byPayee[key].lines.push(
          `• ${row.event} (${row.date}): ${formatMoney(row.amount, row.currency)} to ${row.to}`
        );
      });
      const summary = Object.values(byPayee)
        .map((g) => `${formatMoney(g.amount, g.currency)} to ${g.to}`)
        .join(". ");
      const detail = Object.values(byPayee)
        .flatMap((g) => g.lines)
        .slice(0, 8)
        .join("\n");
      return `As ${me}, you still owe: ${summary}.\n${detail}`;
    }

    const nameFilter = nameToken(oweMatch) || null;
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
          repaid: !!p.repaid,
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
        .map((r) => r.repaid
          ? `• ${r.person} paid ${formatMoney(r.amount, r.currency)} back to ${r.to} on ${r.event} (${r.date})`
          : `• ${r.person} owes ${formatMoney(r.amount, r.currency)} to ${r.to} on ${r.event} (${r.date})`)
        .join("\n");
      const who = rows[0].person;
      const toYou = rows.every((r) => me && namesMatch(r.to, me));
      const openRows = rows.filter((r) => !r.repaid);
      if (openRows.length && openRows.length !== rows.length) {
        const openByCurrency = {};
        openRows.forEach((r) => {
          openByCurrency[r.currency] = (openByCurrency[r.currency] || 0) + Number(r.amount || 0);
        });
        const openSum = Object.entries(openByCurrency).map(([c, n]) => formatMoney(n, c)).join(" + ");
        return toYou
          ? `${who} still owes you ${openSum}.\n${detail}`
          : `${who} still needs to repay ${openSum}.\n${detail}`;
      }
      if (!openRows.length) {
        return toYou
          ? `${who} has paid you back. Those shares are marked paid in History.\n${detail}`
          : `${who} is marked paid in History.\n${detail}`;
      }
      return toYou
        ? `${who} owes you ${sumLine}.\n${detail}`
        : `${who} should repay ${sumLine}.\n${detail}`;
    }
    return rows
      .slice(0, 10)
      .map((r) => r.repaid
        ? `• ${r.person} paid ${formatMoney(r.amount, r.currency)} back to ${r.to} (${r.event})`
        : `• ${r.person} owes ${formatMoney(r.amount, r.currency)} to ${r.to} (${r.event})`)
      .join("\n");
  }

  const ate = q.match(/(?:what did|what has|what does)\s+([a-z][a-z\-']+)\s+(?:have|had|eat|ate|order|ordered|get|got)\b/);
  if (ate && nameToken(ate)) {
    lastChatFollow = "share";
    const token = nameToken(ate);
    const lines = [];
    history.forEach((h) => {
      const d = h.data;
      (d.participants || []).forEach((p) => {
        if (!p.name.toLowerCase().includes(token)) return;
        const items = (p.items_consumed || []).map((item) => displayItemName(item.item_name)).filter(Boolean);
        lines.push(items.length
          ? `${p.name} on ${d.event_details.title} (${d.event_details.date}): ${items.join(", ")}.`
          : `${p.name} is on ${d.event_details.title} (${d.event_details.date}), but no dishes were saved.`);
      });
    });
    if (!lines.length) return `I found no saved dishes for “${token}”.`;
    return lines.slice(0, 6).join("\n");
  }

  if (/gst|service charge|how much (?:was|is) the tax|tax on the bill/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const d = last.data;
    const s = d.receipt_summary || {};
    const c = d.event_details.currency;
    return `On ${d.event_details.title} (${d.event_details.date}), GST is ${formatMoney(s.tax, c)} and service charge is ${formatMoney(s.tip, c)}. Grand total ${formatMoney(s.grand_total, c)}.`;
  }

  if (/how many people|who was there|who was on the bill|who is on the bill/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    const names = (last.data.participants || []).map((p) => p.name).filter(Boolean);
    return `${last.data.event_details.title} (${last.data.event_details.date}) has ${names.length} people: ${names.join(", ")}.`;
  }

  if (/when was|what date|what day/.test(q)) {
    lastChatFollow = "";
    const last = history[0];
    if (!last) return "No splits saved yet.";
    return `${last.data.event_details.title} is dated ${last.data.event_details.date}.`;
  }

  if (/who (?:has not|hasn't|havent|haven't) paid|who still owes|who has not paid me back|is the bill settled|has everyone paid/.test(q)) {
    lastChatFollow = "owes-me";
    const open = [];
    const done = [];
    history.forEach((h) => {
      const d = h.data;
      const payer = d.paid_by || "";
      (d.participants || []).forEach((p) => {
        if (payer && namesMatch(p.name, payer)) return;
        const line = `${p.name} ${formatMoney(p.total_owed, d.event_details.currency)} on ${d.event_details.title}`;
        if (p.repaid) done.push(line);
        else open.push(line);
      });
    });
    if (!open.length && !done.length) return "No shares are stored yet.";
    if (!open.length) return `Everyone is marked paid in History.${done.length ? ` Paid back: ${done.join(". ")}.` : ""}`;
    const waiting = open.join(". ");
    const finished = done.length ? ` Already marked paid: ${done.join(". ")}.` : "";
    return `Still waiting: ${waiting}.${finished}`;
  }

  return "I can answer total spend, what you owe, who has paid you back, recent events, or your last split. Money comes from stored confirmations. Tick Paid back in History when someone sends their share.";
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

function billFingerprint(entry) {
  let data = entry.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return String(entry.id);
    }
  }
  if (!data?.event_details) return String(entry.id);
  const people = (data.participants || [])
    .map((p) => [
      String(p.name || "").trim().toLowerCase(),
      Number(p.total_owed || 0).toFixed(2),
      p.repaid ? "1" : "0",
    ].join(":"))
    .sort()
    .join("|");
  return [
    String(data.event_details.title || "").trim().toLowerCase(),
    normalizeEventDate(data.event_details.date),
    Number(data.receipt_summary?.grand_total || 0).toFixed(2),
    String(data.paid_by || "").trim().toLowerCase(),
    people,
  ].join("::");
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";
  let shown = 0;
  const groups = [];
  const byKey = new Map();

  history.forEach((entry) => {
    let data = entry.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    if (!data?.event_details || !Array.isArray(data.participants)) return;
    const key = billFingerprint({ ...entry, data });
    let group = byKey.get(key);
    if (!group) {
      group = { data, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  });

  groups.forEach((group) => {
    const data = group.data;
    const entry = group.entries[0];
    const copies = group.entries.length;
    const c = data.event_details.currency;
    const linked = entry.eventId
      ? loadEvents().find((ev) => ev.id === entry.eventId)
      : null;
    const payer = data.paid_by || "";
    const owing = (data.participants || []).filter((p) => !payer || !namesMatch(p.name, payer));
    const paidRows = owing
      .map((p) => {
        const paid = !!p.repaid;
        return `<label class="history-check${paid ? " is-paid" : ""}">
          <input type="checkbox" data-name="${escapeHtml(p.name)}"${paid ? " checked" : ""}>
          <span class="history-check-name">${escapeHtml(p.name)}</span>
          <span class="history-check-amt">${formatMoney(p.total_owed, c)}</span>
        </label>`;
      })
      .join("");
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="history-item-main">
        <strong>${escapeHtml(data.event_details.title)}</strong>
        <span>${escapeHtml(formatDisplayDate(data.event_details.date) || data.event_details.date)}</span>
        <span class="history-total">${formatMoney(data.receipt_summary.grand_total, c)}</span>
        ${payer ? `<span>Paid first by ${escapeHtml(payer)}</span>` : ""}
        ${copies > 1 ? `<span class="history-link">Saved ${copies} times</span>` : ""}
        ${linked ? `<span class="history-link">📅 ${escapeHtml(linked.title)}</span>` : ""}
        ${paidRows ? `<div class="history-paid"><span class="history-paid-label">Paid back</span>${paidRows}</div>` : ""}
      </div>
      <div class="history-item-actions">
        <button type="button" class="btn-text btn-view-history">View</button>
        <button type="button" class="btn-text btn-copy-history">Copy</button>
        <button type="button" class="btn-text btn-delete-history danger">Delete</button>
      </div>
    `;

    el.querySelectorAll(".history-check input").forEach((box) => {
      box.addEventListener("change", () => {
        const personName = box.getAttribute("data-name");
        group.entries.forEach((savedEntry) => {
          patchHistory(savedEntry.id, (saved) => {
            const person = (saved.data.participants || []).find((p) => namesMatch(p.name, personName));
            if (person) person.repaid = box.checked;
          });
        });
        box.closest(".history-check")?.classList.toggle("is-paid", box.checked);
      });
    });

    el.querySelector(".btn-view-history").addEventListener("click", () => {
      showNotes(false);
      state.lastHistoryId = entry.id;
      state.confirmedData = deepClone(data);
      switchView("new");
      try {
        renderResults(state.confirmedData);
      } catch (err) {
        showError(err.message || "Could not open this split.");
        return;
      }
      setWizardStep(4);
    });

    el.querySelector(".btn-copy-history").addEventListener("click", () => {
      copyText(buildSummaryText(data));
    });

    el.querySelector(".btn-delete-history").addEventListener("click", async () => {
      const title = data.event_details.title || "this split";
      const ids = group.entries.map((savedEntry) => savedEntry.id);
      const idSet = new Set(ids.map(String));
      const event = eventForHistoryEntry(entry);
      const siblings = event ? getSplitsForEvent(event).filter((s) => !idSet.has(String(s.id))) : [];
      const copiesNote = copies > 1 ? `all ${copies} copies of ` : "";
      const message = event
        ? siblings.length
          ? `Delete ${copiesNote}“${title}” from History? The calendar event stays because other bills are still on it.`
          : `Delete ${copiesNote}“${title}” from History and the calendar? This cannot be undone.`
        : `Delete ${copiesNote}“${title}”? This cannot be undone.`;
      if (!window.confirm(message)) return;
      try {
        if (event && !siblings.length) {
          await deleteHistoryAndCalendar(ids, [event.id]);
        } else {
          await deleteHistoryAndCalendar(ids, []);
          if (event) {
            const events = loadEvents().map((ev) => {
              if (ev.id !== event.id) return ev;
              return { ...ev, splitIds: (ev.splitIds || []).filter((id) => !idSet.has(String(id))) };
            });
            saveEvents(events);
            const updated = events.find((ev) => ev.id === event.id);
            if (updated) syncEventToCloud(updated);
          }
        }
      } catch (err) {
        showError(err.message || "Could not delete.");
        return;
      }
      renderHistory();
    });

    historyList.appendChild(el);
    shown += 1;
  });
  historyEmpty.classList.toggle("hidden", shown > 0);
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
    const ok = await ensureFreshSession();
    if (ok) await showApp();
  } else {
    showAuth();
  }
})();
