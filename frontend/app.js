const API_BASE = "/api";
const AUTH_TOKEN_KEY = "wms_auth_token";
const AUTH_USER_KEY = "wms_auth_user";
let authToken = sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
let appBootstrapped = false;

// ── DOM refs ───────────────────────────────────────────────────
const appHeader = document.querySelector("header");
const appMain = document.querySelector("main");
const menuData = document.getElementById("menuData");
const menuOther = document.getElementById("menuOther");
const queryPage = document.getElementById("queryPage");
const queryTitle = document.getElementById("queryTitle");
const queryFields = document.getElementById("queryFields");
const queryRunBtn = document.getElementById("queryRunBtn");
const queryClearBtn = document.getElementById("queryClearBtn");
const queryCreateBtn = document.getElementById("queryCreateBtn");
const createSubmitBtn = document.getElementById("createSubmitBtn");
const createCancelBtn = document.getElementById("createCancelBtn");
const resultsPage = document.getElementById("resultsPage");
const backToQueryBtn = document.getElementById("backToQueryBtn");
const rerunQueryBtn = document.getElementById("rerunQueryBtn");
const rowCount = document.getElementById("rowCount");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const emptyMsg = document.getElementById("emptyMsg");
const loadingMsg = document.getElementById("loadingMsg");
const tableWrapper = document.querySelector(".table-wrapper");
const detailOverlay = document.getElementById("detailOverlay");
const detailPanel = detailOverlay.querySelector(".detail-panel");
const detailTitle = document.getElementById("detailTitle");
const detailFields = document.getElementById("detailFields");
const detailEditBtn = document.getElementById("detailEditBtn");
const detailSaveBtn = document.getElementById("detailSaveBtn");
const detailCancelBtn = document.getElementById("detailCancelBtn");
const detailCloseBtn = document.getElementById("detailCloseBtn");
const detailDeleteBtn = document.getElementById("detailDeleteBtn");
const detailLinesBtn = document.getElementById("detailLinesBtn");
const tabBar = document.getElementById("tabBar");
const resultsCreateBtn = document.getElementById("resultsCreateBtn");
const resultsDeleteBtn = document.getElementById("resultsDeleteBtn");
let selectedCountSpan = document.getElementById("selectedCount");
const exportWrapper = document.getElementById("exportWrapper");
const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const exportCsvBtn = document.getElementById("exportCsv");
const exportXlsxBtn = document.getElementById("exportXlsx");
const massCreateBtn = document.getElementById("massCreateBtn");
const massCreateOverlay = document.getElementById("massCreateOverlay");
const massCreateTitle = document.getElementById("massCreateTitle");
const massCreateHead = document.getElementById("massCreateHead");
const massCreateBody = document.getElementById("massCreateBody");
const massCreateAddRowBtn = document.getElementById("massCreateAddRowBtn");
const massCreateClearBtn = document.getElementById("massCreateClearBtn");
const massCreateSubmitBtn = document.getElementById("massCreateSubmitBtn");
const massCreateCloseBtn = document.getElementById("massCreateCloseBtn");
const massCreateRowCount = document.getElementById("massCreateRowCount");
const massCreateStatus = document.getElementById("massCreateStatus");
const resultsTitleBar = document.getElementById("resultsTitleBar");
const massResultOverlay = document.getElementById("massResultOverlay");
const massResultTitle = document.getElementById("massResultTitle");
const massResultBody = document.getElementById("massResultBody");
const massResultCloseBtn = document.getElementById("massResultCloseBtn");
const massStatusWrapper = document.getElementById("massStatusWrapper");
const massStatusBtn = document.getElementById("massStatusBtn");
const massStatusCount = document.getElementById("massStatusCount");
const massStatusDropdown = document.getElementById("massStatusDropdown");
const massStatusSelect = document.getElementById("massStatusSelect");
const massStatusConfirmBtn = document.getElementById("massStatusConfirmBtn");
const massStatusCancelBtn = document.getElementById("massStatusCancelBtn");

// ── Import DOM refs ────────────────────────────────────────────
const importOverlay = document.getElementById("importOverlay");
const importTitle = document.getElementById("importTitle");
const importHead = document.getElementById("importHead");
const importBody = document.getElementById("importBody");
const importAddRowBtn = document.getElementById("importAddRowBtn");
const importClearBtn = document.getElementById("importClearBtn");
const importSubmitBtn = document.getElementById("importSubmitBtn");
const importCloseBtn = document.getElementById("importCloseBtn");
const importRowCount = document.getElementById("importRowCount");
const importStatus = document.getElementById("importStatus");
const importTemplateBtn = document.getElementById("importTemplateBtn");
const menuImport = document.getElementById("menuImport");
const kpiNavBtn = document.getElementById("kpiNavBtn");
const kpiPage = document.getElementById("kpiPage");
const kpiMonth = document.getElementById("kpiMonth");
const kpiPrevMonth = document.getElementById("kpiPrevMonth");
const kpiNextMonth = document.getElementById("kpiNextMonth");
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginError = document.getElementById("loginError");

// KPI month state: { year, month } (1-indexed)
let kpiSelectedMonth = null; // null = current month

let activeTable = null;
let currentColumns = [];
let currentPrimaryKeys = [];
let queryInputs = {};
let sortColumn = null;
let sortDirection = null; // "asc" | "desc" | null
let lastClickedRowIdx = null;

// ── Friendly display names for tables ──────────────────────────
const TABLE_LABELS = {
  order_header: "Order Header",
  order_lines: "Order Lines",
  clients: "Clients",
  inventory: "Inventory",
  inventory_transaction: "Inventory Transaction",
  transaction_codes: "Transaction Codes",
  location: "Location",
  sku: "SKU",
  pre_advice: "Pre-Advice Header",
  pre_advice_lines: "Pre-Advice Lines",
  location_type: "Location Type",
  inventory_status_codes: "Inventory Status Codes",
  location_status_codes: "Location Status Codes",
  pre_advice_status_codes: "Pre-Advice Status Codes",
  order_status_codes: "Order Status Codes",
  order_header_status_codes: "Order Header Status Codes",
};

// ── Dropdown field config: table → field → { lookupTable, valueCol, default } ──
const DROPDOWN_FIELDS = {
  location: {
    client_id: { lookupTable: "clients", valueCol: "client_id" },
    location_type: { lookupTable: "location_type", valueCol: "type", default: "Standard Pallet" },
    status: { lookupTable: "location_status_codes", valueCol: "status_code", default: "Unlocked" },
  },
  order_header: {
    status: { lookupTable: "order_header_status_codes", valueCol: "status_code", default: "Ready", manualOnly: ["Ready", "Locked"] },
    client_id: { lookupTable: "clients", valueCol: "client_id" },
  },
  order_lines: {
    client_id: { lookupTable: "clients", valueCol: "client_id" },
  },
  pre_advice: {
    status: { lookupTable: "pre_advice_status_codes", valueCol: "status_code" },
    client_id: { lookupTable: "clients", valueCol: "client_id" },
  },
  pre_advice_lines: {
    client_id: { lookupTable: "clients", valueCol: "client_id" },
  },
  sku: {
    client_id: { lookupTable: "clients", valueCol: "client_id" },
  },
};

// Tables where create/edit is disabled (managed by system)
const NO_CREATE_TABLES = ["inventory", "inventory_transaction"];
const NO_EDIT_TABLES = ["inventory", "inventory_transaction"];
const NO_MASS_CREATE_TABLES = ["order_header", "order_lines", "pre_advice", "pre_advice_lines"];

// Columns to hide per table
const HIDDEN_COLUMNS = {
  inventory_transaction: ["id"],
};

// Columns to hide from create/mass-create forms (auto-populated by backend)
const CREATE_HIDDEN_COLUMNS = {
  order_header: ["creation_date", "creation_time", "number_of_lines"],
  order_lines: ["creation_date", "creation_time", "line_id"],
  pre_advice: ["creation_date", "creation_time", "number_of_lines"],
  pre_advice_lines: ["creation_date", "creation_time", "line_id"],
};

// Columns that are never editable (auto-managed by backend)
const READ_ONLY_COLUMNS = {
  order_header: ["number_of_lines", "creation_date", "creation_time"],
  pre_advice: ["number_of_lines", "creation_date", "creation_time"],
  order_lines: ["creation_date", "creation_time", "line_id"],
  pre_advice_lines: ["creation_date", "creation_time", "line_id"],
};

// Required fields per table (must be non-empty to create)
const REQUIRED_FIELDS = {
  order_header: ["order", "client_id", "status"],
  order_lines: ["order", "client_id"],
  pre_advice: ["pre_advice_id", "client_id", "status"],
  pre_advice_lines: ["pre_advice_id", "client_id"],
  location: ["location", "client_id"],
  sku: ["sku", "client_id"],
};

// Mass create: required fields (before defaults are applied)
const MASS_REQUIRED_FIELDS = {
  order_header: ["order", "client_id"],
  order_lines: ["order", "client_id"],
  pre_advice: ["pre_advice_id", "client_id"],
  pre_advice_lines: ["pre_advice_id", "client_id"],
  location: ["location", "client_id"],
  sku: ["sku", "client_id"],
};

// Mass create: auto-fill defaults for blank fields
const MASS_CREATE_DEFAULTS = {
  order_header: { status: "Ready" },
  pre_advice: { status: "Incoming" },
  location: { status: "Unlocked", location_type: "Standard Pallet" },
};

// ── Reorder columns: put client_id as 2nd column ───────────────
function reorderColumns(cols) {
  const idx = cols.findIndex((c) => c.column_name === "client_id");
  if (idx > 1) {
    const [clientCol] = cols.splice(idx, 1);
    cols.splice(1, 0, clientCol);
  }
  return cols;
}

function setAuthLocked(locked) {
  document.body.classList.toggle("auth-locked", locked);
  loginOverlay.style.display = locked ? "flex" : "none";
  if (appHeader) appHeader.setAttribute("aria-hidden", locked ? "true" : "false");
  if (appMain) appMain.setAttribute("aria-hidden", locked ? "true" : "false");
}

function showLoginError(message) {
  loginError.textContent = message || "Login failed.";
  loginError.style.display = "";
}

function clearLoginError() {
  loginError.textContent = "";
  loginError.style.display = "none";
}

function logoutAndLock(message) {
  authToken = "";
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  setAuthLocked(true);
  if (message) showLoginError(message);
  if (loginPassword) loginPassword.value = "";
  if (loginUsername) loginUsername.focus();
}

function installAuthFetch() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const isApiCall = typeof url === "string" && (url.startsWith("/api/") || url.includes("/api/"));
    if (!isApiCall) return nativeFetch(input, init);

    const headers = new Headers(init.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    const response = await nativeFetch(input, { ...init, headers });

    if (response.status === 401 && !url.endsWith("/api/login")) {
      logoutAndLock("Session expired. Please log in again.");
    }

    return response;
  };
}

async function startAppOnce() {
  if (appBootstrapped) return;
  appBootstrapped = true;
  await loadTables();
  showKpiPage();
}

async function performLoginRequest(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.token) {
    throw new Error(data.error || "Invalid username or password");
  }

  authToken = data.token;
  sessionStorage.setItem(AUTH_TOKEN_KEY, authToken);
  sessionStorage.setItem(AUTH_USER_KEY, username);
}

async function initializeAuthGate() {
  installAuthFetch();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearLoginError();

    const username = (loginUsername.value || "").trim();
    const password = loginPassword.value || "";
    if (!username || !password) {
      showLoginError("Please enter username and password.");
      return;
    }

    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Logging in...";
    try {
      await performLoginRequest(username, password);
      setAuthLocked(false);
      await startAppOnce();
    } catch (err) {
      showLoginError(err.message || "Invalid username or password");
      loginPassword.value = "";
      loginPassword.focus();
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Log In";
    }
  });

  if (authToken) {
    try {
      // Validate saved token quickly before showing app.
      const verify = await fetch(`${API_BASE}/tables`);
      if (!verify.ok) throw new Error("Token check failed");
      setAuthLocked(false);
      await startAppOnce();
      return;
    } catch {
      authToken = "";
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    }
  }

  setAuthLocked(true);
  if (loginUsername) loginUsername.focus();
}

// Cache for dropdown options
const dropdownCache = {};

async function getDropdownOptions(lookupTable, valueCol) {
  const key = `${lookupTable}.${valueCol}`;
  if (dropdownCache[key]) return dropdownCache[key];
  try {
    const res = await fetch(`${API_BASE}/data/${lookupTable}?limit=5000`);
    const data = await res.json();
    const options = (data.rows || []).map((r) => r[valueCol]).filter(Boolean);
    dropdownCache[key] = options;
    return options;
  } catch {
    return [];
  }
}

function createDropdown(options, currentValue, cfg) {
  const select = document.createElement("select");
  // Empty option
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "— Select —";
  select.appendChild(emptyOpt);

  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === currentValue) o.selected = true;
    select.appendChild(o);
  });

  // If currentValue not in options but exists, add it
  if (currentValue && !options.includes(currentValue)) {
    const o = document.createElement("option");
    o.value = currentValue;
    o.textContent = currentValue;
    o.selected = true;
    select.appendChild(o);
  }

  return select;
}

// ── Nav menu groups ─────────────────────────────────────────
const NAV_GROUPS = {
  data: ["order_header", "order_lines", "pre_advice", "pre_advice_lines", "inventory", "inventory_transaction", "location", "sku"],
  other: ["clients", "transaction_codes", "location_type", "location_status_codes", "inventory_status_codes", "pre_advice_status_codes", "order_status_codes", "order_header_status_codes"],
};

// ── Tab state management ────────────────────────────────────
const MAX_TABS = 10;
let tabs = [];
let activeTabId = null;

function generateTabId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function saveTabState() {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) return;

  tab.table = activeTable;
  tab.isCreateMode = isCreateMode;

  // If in create mode and had results before, preserve "results" as the page
  if (isCreateMode && tab.hadResultsBeforeCreate) {
    tab.page = "results";
  } else {
    tab.page = queryPage.style.display !== "none" ? "query" : "results";
  }

  // Don't overwrite query values when in create mode (form has create data, not query filters)
  if (!isCreateMode) {
    tab.queryValues = {};
    for (const [col, input] of Object.entries(queryInputs)) {
      tab.queryValues[col] = input.value;
    }
  }

  tab.resultsHeadHTML = tableHead.innerHTML;
  tab.resultsBodyHTML = tableBody.innerHTML;
  tab.rowCountText = rowCount.textContent;
  tab.columns = currentColumns;
  tab.primaryKeys = currentPrimaryKeys;
  tab.scrollLeft = tableWrapper.scrollLeft;
  // lockedFields is preserved as-is (set at tab creation)
}

async function restoreTabState(tab) {
  activeTabId = tab.id;
  activeTable = tab.table;
  currentColumns = tab.columns || [];
  currentPrimaryKeys = tab.primaryKeys || [];

  // Just reset create mode UI without tab-aware navigation
  if (isCreateMode) {
    isCreateMode = false;
    queryPage.classList.remove("create-mode");
    queryRunBtn.style.display = "";
    queryClearBtn.style.display = "";
    createSubmitBtn.style.display = "none";
    createCancelBtn.style.display = "none";
  }

  updateDropdownActive();

  if (!tab.table) {
    queryPage.style.display = "none";
    resultsPage.style.display = "none";
    return;
  }

  if (!tab.columns || tab.columns.length === 0) {
    await selectTableIntoTab(tab.table);
    return;
  }

  buildQueryForm(tab.table, tab.columns, tab.queryValues || {});

  if (tab.page === "results") {
    showResultsPage();
    resultsTitleBar.textContent = TABLE_LABELS[tab.table] || tab.table;
    resultsCreateBtn.style.display = NO_CREATE_TABLES.includes(tab.table) ? "none" : "";
    massCreateBtn.style.display = (NAV_GROUPS.data.includes(tab.table) && !NO_CREATE_TABLES.includes(tab.table) && !NO_MASS_CREATE_TABLES.includes(tab.table)) ? "" : "none";
    exportWrapper.style.display = NAV_GROUPS.data.includes(tab.table) ? "" : "none";
    rerunQueryBtn.style.display = NAV_GROUPS.data.includes(tab.table) ? "" : "none";
    resultsDeleteBtn.style.display = NO_EDIT_TABLES.includes(tab.table) ? "none" : "";
    massStatusWrapper.style.display = (DROPDOWN_FIELDS[tab.table] && DROPDOWN_FIELDS[tab.table].status) ? "" : "none";
    massStatusDropdown.style.display = "none";
    tableHead.innerHTML = tab.resultsHeadHTML || "";
    tableBody.innerHTML = tab.resultsBodyHTML || "";
    rowCount.textContent = tab.rowCountText || "";
    reattachRowListeners();
    tableWrapper.scrollLeft = tab.scrollLeft || 0;
  } else {
    showQueryPage();
  }

  if (tab.isCreateMode) {
    openCreateForm();
  }

  renderTabBar();
}

function renderTabBar() {
  tabBar.innerHTML = "";
  tabs.forEach((tab) => {
    const el = document.createElement("button");
    el.className = "tab-item" + (tab.id === activeTabId ? " active" : "");

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = tab.label || "New Tab";
    el.appendChild(label);

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "\u00d7";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.appendChild(close);

    el.addEventListener("click", () => switchToTab(tab.id));
    tabBar.appendChild(el);
  });
}

function openTab(table, filters) {
  if (tabs.length >= MAX_TABS) {
    const oldest = tabs.find((t) => t.id !== activeTabId) || tabs[0];
    closeTab(oldest.id);
  }

  if (activeTabId) saveTabState();

  // Auto-number duplicate table tabs
  const baseName = TABLE_LABELS[table] || table;
  const sameTableCount = tabs.filter((t) => t.table === table).length;
  const label = sameTableCount > 0 ? `${baseName} ${sameTableCount + 1}` : baseName;

  const tab = {
    id: generateTabId(),
    table: table,
    label: label,
    page: "query",
    queryValues: filters || {},
    lockedFields: {},
    columns: [],
    primaryKeys: [],
    resultsHeadHTML: "",
    resultsBodyHTML: "",
    rowCountText: "",
    scrollLeft: 0,
    isCreateMode: false,
    filters: {},
    preCreateQueryValues: null,
  };

  tabs.push(tab);
  activeTabId = tab.id;
  renderTabBar();
  return tab;
}

function switchToTab(tabId) {
  if (tabId === activeTabId) return;
  saveTabState();
  const tab = tabs.find((t) => t.id === tabId);
  if (tab) restoreTabState(tab);
}

function closeTab(tabId) {
  const idx = tabs.findIndex((t) => t.id === tabId);
  if (idx === -1) return;

  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    activeTabId = null;
    activeTable = null;
    showKpiPage();
    renderTabBar();
    return;
  }

  if (tabId === activeTabId) {
    const newIdx = Math.min(idx, tabs.length - 1);
    restoreTabState(tabs[newIdx]);
  }
  renderTabBar();
}

// ── Dropdown open/close logic ───────────────────────────────
document.querySelectorAll(".nav-dropdown-toggle").forEach((toggle) => {
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = toggle.parentElement;
    const wasOpen = dropdown.classList.contains("open");
    document.querySelectorAll(".nav-dropdown").forEach((d) => d.classList.remove("open"));
    if (!wasOpen) dropdown.classList.add("open");
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-dropdown").forEach((d) => d.classList.remove("open"));
});

// ── Horizontal scroll on mouse wheel ───────────────────────────
tableWrapper.addEventListener("wheel", (e) => {
  if (tableWrapper.scrollWidth > tableWrapper.clientWidth) {
    e.preventDefault();
    tableWrapper.scrollLeft += e.deltaY;
  }
}, { passive: false });

// ── Build dropdown menus on start ─────────────────────────
async function loadTables() {
  function addItem(menu, tableKey) {
    const btn = document.createElement("button");
    btn.textContent = TABLE_LABELS[tableKey] || tableKey;
    btn.dataset.table = tableKey;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".nav-dropdown").forEach((d) => d.classList.remove("open"));
      selectTable(tableKey);
    });
    menu.appendChild(btn);
  }

  NAV_GROUPS.data.forEach((t) => addItem(menuData, t));
  NAV_GROUPS.other.forEach((t) => addItem(menuOther, t));
}

function updateDropdownActive() {
  document.querySelectorAll(".nav-dropdown-menu button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.table === activeTable);
  });
}

// ── Show/hide pages ────────────────────────────────────────────
function showQueryPage() {
  kpiPage.style.display = "none";
  queryPage.style.display = "block";
  resultsPage.style.display = "none";
  kpiNavBtn.classList.remove("active");
}

function showResultsPage() {
  kpiPage.style.display = "none";
  queryPage.style.display = "none";
  resultsPage.style.display = "block";
  backToQueryBtn.style.display = SKIP_QUERY_TABLES.includes(activeTable) ? "none" : "";
  kpiNavBtn.classList.remove("active");
}

function showKpiPage() {
  kpiPage.style.display = "block";
  queryPage.style.display = "none";
  resultsPage.style.display = "none";
  kpiNavBtn.classList.add("active");
  updateDropdownActive();
  loadKpiData();
}

// ── Lookup tables that skip the query page ──────────────────
const SKIP_QUERY_TABLES = ["location_type", "inventory_status_codes", "transaction_codes", "location_status_codes", "pre_advice_status_codes", "order_status_codes", "order_header_status_codes"];

// ── Select a table → always opens a new tab ────────────────
async function selectTable(table, preFilters) {
  const tab = openTab(table, preFilters);
  await selectTableIntoTab(table, preFilters);
}

async function selectTableIntoTab(table, preFilters) {
  activeTable = table;
  if (isCreateMode) exitCreateMode();

  updateDropdownActive();

  const res = await fetch(`${API_BASE}/data/${table}?limit=0`);
  const data = await res.json();
  currentColumns = reorderColumns(data.columns || []);
  currentPrimaryKeys = data.primaryKeys || [];

  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab) {
    tab.columns = currentColumns;
    tab.primaryKeys = currentPrimaryKeys;
  }

  buildQueryForm(table, currentColumns, preFilters || {});

  if (SKIP_QUERY_TABLES.includes(table)) {
    // Lookup tables: skip query page, show all data immediately
    if (tab) tab.filters = {};
    showResultsPage();
    await loadTableData(table, {});
  } else if (preFilters && Object.keys(preFilters).length > 0) {
    await runQuery();
  } else {
    showQueryPage();
  }

  renderTabBar();
}

function buildQueryForm(table, columns, values) {
  queryTitle.textContent = `Query \u2014 ${TABLE_LABELS[table] || table}`;
  queryFields.innerHTML = "";
  queryInputs = {};

  columns.forEach((col) => {
    const div = document.createElement("div");
    div.className = "query-field";

    const label = document.createElement("label");
    label.textContent = col.column_name.replace(/_/g, " ");
    label.setAttribute("for", `q_${col.column_name}`);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `q_${col.column_name}`;
    input.placeholder = col.column_name.replace(/_/g, " ");
    input.dataset.column = col.column_name;

    const savedVal = values[col.column_name] || "";
    input.value = savedVal;
    if (savedVal) input.classList.add("has-value");

    input.addEventListener("input", () => {
      input.classList.toggle("has-value", input.value.trim() !== "");
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runQuery();
    });

    queryInputs[col.column_name] = input;
    div.appendChild(label);
    div.appendChild(input);
    queryFields.appendChild(div);
  });
}

// ── Column drag-and-drop reordering ─────────────────────────
let dragColIdx = null;

function onColDragStart(e) {
  dragColIdx = parseInt(e.target.dataset.colIdx);
  e.target.classList.add("col-dragging");
  e.dataTransfer.effectAllowed = "move";
}

function onColDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function onColDragEnter(e) {
  const th = e.target.closest("th");
  if (th && th.dataset.colIdx !== undefined) {
    th.classList.add("col-drag-over");
  }
}

function onColDragLeave(e) {
  const th = e.target.closest("th");
  if (th) th.classList.remove("col-drag-over");
}

function onColDrop(e) {
  e.preventDefault();
  const th = e.target.closest("th");
  if (!th || th.dataset.colIdx === undefined) return;
  th.classList.remove("col-drag-over");

  const toIdx = parseInt(th.dataset.colIdx);
  if (dragColIdx === null || dragColIdx === toIdx) return;

  // +1 offset if Actions column is present (column 0 in the DOM)
  const actionsOffset = NO_EDIT_TABLES.includes(activeTable) ? 0 : 1;
  const fromDom = dragColIdx + actionsOffset;
  const toDom = toIdx + actionsOffset;

  // Move header
  const headerRow = tableHead.querySelector("tr");
  moveChild(headerRow, fromDom, toDom);

  // Move cells in every body row
  tableBody.querySelectorAll("tr").forEach((tr) => {
    moveChild(tr, fromDom, toDom);
  });

  // Update data-colIdx on all th elements
  headerRow.querySelectorAll("th[data-col-idx]").forEach((h, i) => {
    h.dataset.colIdx = i;
  });

  dragColIdx = null;
}

function onColDragEnd(e) {
  e.target.classList.remove("col-dragging");
  tableHead.querySelectorAll(".col-drag-over").forEach((el) => el.classList.remove("col-drag-over"));
  dragColIdx = null;
}

function moveChild(parent, fromIdx, toIdx) {
  const children = Array.from(parent.children);
  if (fromIdx >= children.length || toIdx >= children.length) return;
  const el = children[fromIdx];
  const ref = toIdx > fromIdx ? children[toIdx].nextSibling : children[toIdx];
  parent.insertBefore(el, ref);
}

// ── Gather filters and run query ───────────────────────────────
function getFilters() {
  const filters = {};
  for (const [col, input] of Object.entries(queryInputs)) {
    const val = input.value.trim();
    if (val) filters[col] = val;
  }
  return filters;
}

async function runQuery() {
  const filters = getFilters();
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab) tab.filters = filters;
  showResultsPage();
  await loadTableData(activeTable, filters);
}

// ── Fetch and render table data ────────────────────────────────
async function loadTableData(table, filters) {
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";
  emptyMsg.style.display = "none";
  loadingMsg.style.display = "block";
  rowCount.textContent = "";
  sortColumn = null;
  sortDirection = null;
  resultsTitleBar.textContent = TABLE_LABELS[table] || table;
  resultsDeleteBtn.style.display = NO_EDIT_TABLES.includes(table) ? "none" : "";
  massStatusWrapper.style.display = (DROPDOWN_FIELDS[table] && DROPDOWN_FIELDS[table].status) ? "" : "none";
  massStatusDropdown.style.display = "none";
  exportWrapper.style.display = NAV_GROUPS.data.includes(table) ? "" : "none";
  rerunQueryBtn.style.display = NAV_GROUPS.data.includes(table) ? "" : "none";
  massCreateBtn.style.display = (NAV_GROUPS.data.includes(table) && !NO_CREATE_TABLES.includes(table) && !NO_MASS_CREATE_TABLES.includes(table)) ? "" : "none";
  resultsCreateBtn.style.display = NO_CREATE_TABLES.includes(table) ? "none" : "";
  lastClickedRowIdx = null;

  const params = new URLSearchParams(filters || {});
  const url = `${API_BASE}/data/${table}?${params}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    loadingMsg.style.display = "none";

    currentColumns = reorderColumns(data.columns || []);
    currentPrimaryKeys = data.primaryKeys || [];

    if (currentColumns.length > 0) {
      const hiddenCols = HIDDEN_COLUMNS[table] || [];
      const headerRow = document.createElement("tr");
      if (!NO_EDIT_TABLES.includes(table)) {
        const actionsTh = document.createElement("th");
        actionsTh.textContent = "Actions";
        actionsTh.className = "actions-col";
        headerRow.appendChild(actionsTh);
      }

      currentColumns.forEach((col, idx) => {
        if (hiddenCols.includes(col.column_name)) return;
        const th = document.createElement("th");
        const label = document.createTextNode(col.column_name.replace(/_/g, " "));
        th.appendChild(label);
        const arrow = document.createElement("span");
        arrow.className = "sort-arrow";
        if (sortColumn === col.column_name) {
          arrow.textContent = sortDirection === "asc" ? " ▲" : " ▼";
        }
        th.appendChild(arrow);
        th.draggable = true;
        th.dataset.colIdx = idx;
        th.dataset.column = col.column_name;
        th.addEventListener("click", () => onSortClick(col.column_name));
        th.addEventListener("dragstart", onColDragStart);
        th.addEventListener("dragover", onColDragOver);
        th.addEventListener("dragenter", onColDragEnter);
        th.addEventListener("dragleave", onColDragLeave);
        th.addEventListener("drop", onColDrop);
        th.addEventListener("dragend", onColDragEnd);
        headerRow.appendChild(th);
      });
      tableHead.appendChild(headerRow);
    }

    if (data.rows && data.rows.length > 0) {
      data.rows.forEach((row) => {
        tableBody.appendChild(buildDataRow(row));
      });
      rowCount.textContent = `${data.count} row${data.count !== 1 ? "s" : ""} returned`;
    } else {
      rowCount.textContent = "0 rows";
    }
  } catch (err) {
    loadingMsg.style.display = "none";
    emptyMsg.textContent = "Error loading data: " + err.message;
    emptyMsg.style.display = "block";
  }
}

// ── Column sort ─────────────────────────────────────────────────
function onSortClick(colName) {
  if (sortColumn === colName) {
    sortDirection = sortDirection === "asc" ? "desc" : null;
  } else {
    sortColumn = colName;
    sortDirection = "asc";
  }

  if (!sortDirection) {
    sortColumn = null;
  }

  // Update arrow indicators
  tableHead.querySelectorAll("th").forEach((th) => {
    const arrow = th.querySelector(".sort-arrow");
    if (!arrow) return;
    if (th.dataset.column === sortColumn) {
      arrow.textContent = sortDirection === "asc" ? " ▲" : " ▼";
    } else {
      arrow.textContent = "";
    }
  });

  // Sort rows in DOM
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  if (!sortDirection) {
    // No sort — restore original order by re-fetching
    return;
  }

  rows.sort((a, b) => {
    const aCell = a.querySelector(`td[data-column="${sortColumn}"]`);
    const bCell = b.querySelector(`td[data-column="${sortColumn}"]`);
    const aVal = aCell ? aCell.dataset.value : "";
    const bVal = bCell ? bCell.dataset.value : "";

    // Try numeric comparison
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    if (aVal !== "" && bVal !== "" && !isNaN(aNum) && !isNaN(bNum)) {
      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
    return sortDirection === "asc" ? cmp : -cmp;
  });

  rows.forEach((r) => tableBody.appendChild(r));
}

// ── Row selection helpers ───────────────────────────────────────
function getSelectedRows() {
  return tableBody.querySelectorAll("tr.selected");
}

function updateSelectionUI() {
  const count = getSelectedRows().length;
  selectedCountSpan.textContent = count;

  if (DROPDOWN_FIELDS[activeTable] && DROPDOWN_FIELDS[activeTable].status) {
    massStatusCount.textContent = count;
  }
}

function clearSelection() {
  tableBody.querySelectorAll("tr.selected").forEach((tr) => tr.classList.remove("selected"));
  lastClickedRowIdx = null;
  isDragging = false;
  updateSelectionUI();
}

// ── Drag-to-select state ───────────────────────────────────────
let isDragging = false;
let dragStartIdx = null;
let dragMovedToOtherRow = false;
let dragCtrl = false;
let dragDeselecting = false;
let preDragSelected = new Set();
let dragScrollInterval = null;
let lastDragClientY = 0;

function startDragAutoScroll(clientY) {
  const EDGE = 48;       // px from viewport edge to trigger
  const SPEED = 12;      // px per tick
  lastDragClientY = clientY;

  if (dragScrollInterval) return;

  dragScrollInterval = setInterval(() => {
    const y = lastDragClientY;
    if (y < EDGE) {
      window.scrollBy(0, -SPEED);
      expandDragSelection();
    } else if (y > window.innerHeight - EDGE) {
      window.scrollBy(0, SPEED);
      expandDragSelection();
    }
  }, 16);
}

function stopDragAutoScroll() {
  if (dragScrollInterval) {
    clearInterval(dragScrollInterval);
    dragScrollInterval = null;
  }
}

function expandDragSelection() {
  // Find the row under the current mouse Y using stored clientY
  const el = document.elementFromPoint(window.innerWidth / 2, lastDragClientY);
  if (!el) return;
  const tr = el.closest("tr");
  if (!tr || !tableBody.contains(tr)) return;

  const allRows = Array.from(tableBody.querySelectorAll("tr"));
  const idx = allRows.indexOf(tr);
  if (idx === -1) return;

  if (idx !== dragStartIdx) dragMovedToOtherRow = true;

  const start = Math.min(dragStartIdx, idx);
  const end = Math.max(dragStartIdx, idx);

  if (dragDeselecting) {
    allRows.forEach((r, i) => {
      if (i >= start && i <= end) {
        r.classList.remove("selected");
      } else if (preDragSelected.has(i)) {
        r.classList.add("selected");
      }
    });
  } else {
    allRows.forEach((r, i) => {
      if (i >= start && i <= end) {
        r.classList.add("selected");
      } else if (dragCtrl && preDragSelected.has(i)) {
        r.classList.add("selected");
      } else if (!dragCtrl) {
        r.classList.remove("selected");
      }
    });
  }

  updateSelectionUI();
}

tableBody.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest("button") || e.target.closest("input")) return;

  const tr = e.target.closest("tr");
  if (!tr || !tableBody.contains(tr)) return;

  const allRows = Array.from(tableBody.querySelectorAll("tr"));
  const idx = allRows.indexOf(tr);
  if (idx === -1) return;

  isDragging = true;
  dragStartIdx = idx;
  dragMovedToOtherRow = false;
  dragCtrl = e.ctrlKey;
  // If starting row is already selected, drag will deselect
  dragDeselecting = tr.classList.contains("selected");

  // Remember pre-drag selection
  preDragSelected = new Set();
  allRows.forEach((r, i) => { if (r.classList.contains("selected")) preDragSelected.add(i); });
});

tableBody.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  lastDragClientY = e.clientY;
  startDragAutoScroll(e.clientY);

  const tr = e.target.closest("tr");
  if (!tr || !tableBody.contains(tr)) return;

  const allRows = Array.from(tableBody.querySelectorAll("tr"));
  const idx = allRows.indexOf(tr);
  if (idx === -1 || idx === dragStartIdx) return;

  dragMovedToOtherRow = true;

  const start = Math.min(dragStartIdx, idx);
  const end = Math.max(dragStartIdx, idx);

  if (dragDeselecting) {
    allRows.forEach((r, i) => {
      if (i >= start && i <= end) {
        r.classList.remove("selected");
      } else if (preDragSelected.has(i)) {
        r.classList.add("selected");
      }
    });
  } else {
    allRows.forEach((r, i) => {
      if (i >= start && i <= end) {
        r.classList.add("selected");
      } else if (dragCtrl && preDragSelected.has(i)) {
        r.classList.add("selected");
      } else if (!dragCtrl) {
        r.classList.remove("selected");
      }
    });
  }

  updateSelectionUI();
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    stopDragAutoScroll();
    if (dragMovedToOtherRow) {
      const selected = Array.from(tableBody.querySelectorAll("tr.selected"));
      if (selected.length > 0) {
        const allRows = Array.from(tableBody.querySelectorAll("tr"));
        lastClickedRowIdx = allRows.indexOf(selected[selected.length - 1]);
      }
    }
  }
});

// ── Ctrl+A to select all rows ──────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "a" && e.ctrlKey && !e.shiftKey && !e.altKey) {
    if (resultsPage.style.display !== "none" && !document.activeElement.closest("input, textarea, select")) {
      e.preventDefault();
      tableBody.querySelectorAll("tr").forEach((tr) => tr.classList.add("selected"));
      updateSelectionUI();
    }
  }
});

function handleRowClick(e, tr) {
  // Skip if a drag-select just happened
  if (dragMovedToOtherRow) return;

  // Don't select when clicking buttons or inputs
  if (e.target.closest("button") || e.target.closest("input")) return;

  const allRows = Array.from(tableBody.querySelectorAll("tr"));
  const clickedIdx = allRows.indexOf(tr);

  if (e.shiftKey && lastClickedRowIdx !== null) {
    // Shift+Click: range select from last clicked to this row
    if (!e.ctrlKey) {
      // Plain shift: clear existing, select range
      allRows.forEach((r) => r.classList.remove("selected"));
    }
    const start = Math.min(lastClickedRowIdx, clickedIdx);
    const end = Math.max(lastClickedRowIdx, clickedIdx);
    for (let i = start; i <= end; i++) {
      allRows[i].classList.add("selected");
    }
  } else if (e.ctrlKey) {
    // Ctrl+Click: toggle this single row
    tr.classList.toggle("selected");
    lastClickedRowIdx = clickedIdx;
  } else {
    // Plain click: select only this row
    allRows.forEach((r) => r.classList.remove("selected"));
    tr.classList.add("selected");
    lastClickedRowIdx = clickedIdx;
  }

  updateSelectionUI();
}

// ── Format cell values for display ─────────────────────────────
const TIMESTAMP_COLUMNS = ["created_at", "updated_at", "timestamp"];
const DATE_COLUMNS = ["creation_date"];
function formatCellValue(val, colName) {
  if (val === null || val === undefined) return "";
  if (TIMESTAMP_COLUMNS.includes(colName)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${dd}/${mm}/${yyyy} - ${hh}:${min}:${ss}`;
    }
  }
  if (DATE_COLUMNS.includes(colName)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return String(val);
}

// ── Build a normal data row with Edit button ───────────────────
function buildDataRow(row) {
  const tr = document.createElement("tr");
  const hiddenCols = HIDDEN_COLUMNS[activeTable] || [];

  if (!NO_EDIT_TABLES.includes(activeTable)) {
    const actionsTd = document.createElement("td");
    actionsTd.className = "actions-cell";
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => startEditing(tr, row));
    actionsTd.appendChild(editBtn);
    tr.appendChild(actionsTd);
  }

  currentColumns.forEach((col) => {
    if (hiddenCols.includes(col.column_name)) return;
    const td = document.createElement("td");
    const val = row[col.column_name];
    const display = formatCellValue(val, col.column_name);
    td.textContent = display;
    td.title = display;
    td.dataset.column = col.column_name;
    td.dataset.value = val === null || val === undefined ? "" : val;
    tr.appendChild(td);
  });

  tr.addEventListener("click", (e) => handleRowClick(e, tr));
  tr.addEventListener("dblclick", () => openDetail(row));

  return tr;
}

function reattachRowListeners() {
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((tr) => {
    const row = {};
    tr.querySelectorAll("td:not(.actions-cell)").forEach((td) => {
      if (td.dataset.column) {
        row[td.dataset.column] = td.dataset.value || null;
      }
    });

    const editBtn = tr.querySelector(".edit-btn");
    if (editBtn) {
      const newBtn = editBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newBtn, editBtn);
      newBtn.addEventListener("click", () => startEditing(tr, row));
    }

    tr.addEventListener("click", (e) => handleRowClick(e, tr));
    tr.addEventListener("dblclick", () => openDetail(row));
  });
}

// ── Enter edit mode for a row ──────────────────────────────────
async function startEditing(tr, originalRow) {
  tr.classList.add("editing");
  tr.innerHTML = "";

  const actionsTd = document.createElement("td");
  actionsTd.className = "actions-cell";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "cancel-btn";

  actionsTd.appendChild(saveBtn);
  actionsTd.appendChild(cancelBtn);
  tr.appendChild(actionsTd);

  const inputs = {};
  const ddConfig = DROPDOWN_FIELDS[activeTable];

  for (const col of currentColumns) {
    const td = document.createElement("td");
    const val = originalRow[col.column_name];
    const colName = col.column_name;
    let inputEl;

    if (ddConfig && ddConfig[colName]) {
      const cfg = ddConfig[colName];
      let options = await getDropdownOptions(cfg.lookupTable, cfg.valueCol);
      if (cfg.manualOnly) options = options.filter((o) => cfg.manualOnly.includes(o));
      inputEl = createDropdown(options, val === null || val === undefined ? "" : String(val), cfg);
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.value = val === null || val === undefined ? "" : val;
    }
    inputEl.dataset.column = colName;

    if (currentPrimaryKeys.includes(colName) && !SKIP_QUERY_TABLES.includes(activeTable)) {
      inputEl.disabled = true;
      inputEl.style.opacity = "0.5";
      inputEl.title = "Primary key \u2014 cannot be edited";
    }

    inputs[colName] = inputEl;
    td.appendChild(inputEl);
    tr.appendChild(td);
  }

  cancelBtn.addEventListener("click", () => {
    const newTr = buildDataRow(originalRow);
    tr.parentNode.replaceChild(newTr, tr);
  });

  saveBtn.addEventListener("click", async () => {
    const updates = {};
    const pkValues = {};
    const isLookup = SKIP_QUERY_TABLES.includes(activeTable);

    currentColumns.forEach((col) => {
      const colName = col.column_name;
      if (currentPrimaryKeys.includes(colName)) {
        pkValues[colName] = originalRow[colName];
        if (isLookup) {
          updates[colName] = inputs[colName].value;
        }
      } else {
        updates[colName] = inputs[colName].value;
      }
    });

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch(`${API_BASE}/data/${activeTable}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pkValues, updates }),
      });

      const result = await res.json();
      if (result.success) {
        const updatedRow = { ...originalRow, ...updates };
        for (const key of Object.keys(updatedRow)) {
          if (updatedRow[key] === "") updatedRow[key] = null;
        }
        const newTr = buildDataRow(updatedRow);
        tr.parentNode.replaceChild(newTr, tr);
      } else {
        alert("Save failed: " + (result.error || "Unknown error"));
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    } catch (err) {
      alert("Save failed: " + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });
}

// ── Open create form ────────────────────────────────────────────
let isCreateMode = false;

async function openCreateForm() {
  // Save current query values before switching to create mode
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab) {
    tab.preCreateQueryValues = {};
    for (const [col, input] of Object.entries(queryInputs)) {
      tab.preCreateQueryValues[col] = input.value;
    }
    // Remember if we had results showing
    if (resultsPage.style.display !== "none" && tableBody.innerHTML) {
      tab.hadResultsBeforeCreate = true;
      // Save current results state
      tab.resultsHeadHTML = tableHead.innerHTML;
      tab.resultsBodyHTML = tableBody.innerHTML;
      tab.rowCountText = rowCount.textContent;
      tab.scrollLeft = tableWrapper.scrollLeft;
    }
  }

  // Switch to query page with empty form for create
  showQueryPage();
  buildQueryForm(activeTable, currentColumns, {});

  isCreateMode = true;
  queryPage.classList.add("create-mode");
  queryTitle.textContent = `Create \u2014 ${TABLE_LABELS[activeTable] || activeTable}`;
  document.querySelector(".query-hint").textContent = "Fill in the fields to create a new record.";

  // Hide auto-populated columns from the create form
  const createHidden = CREATE_HIDDEN_COLUMNS[activeTable] || [];
  for (const colName of createHidden) {
    if (queryInputs[colName]) {
      const field = queryInputs[colName].closest(".query-field");
      if (field) field.style.display = "none";
    }
  }

  // Clear all inputs first
  for (const input of Object.values(queryInputs)) {
    input.value = "";
    input.classList.remove("has-value");
  }

  // Mark required fields
  const required = REQUIRED_FIELDS[activeTable] || [];
  for (const [colName, input] of Object.entries(queryInputs)) {
    const label = input.closest(".query-field")?.querySelector("label");
    if (label) {
      label.classList.toggle("required-label", required.includes(colName));
    }
  }

  // Replace text inputs with dropdowns where configured
  const ddConfig = DROPDOWN_FIELDS[activeTable];
  if (ddConfig) {
    for (const [colName, cfg] of Object.entries(ddConfig)) {
      if (!queryInputs[colName]) continue;
      const options = await getDropdownOptions(cfg.lookupTable, cfg.valueCol);
      const oldInput = queryInputs[colName];
      const select = createDropdown(options, cfg.default, cfg);
      select.id = oldInput.id;
      select.dataset.column = colName;
      select.className = oldInput.className;
      oldInput.parentNode.replaceChild(select, oldInput);
      queryInputs[colName] = select;
    }
  }

  // Auto-populate and lock any locked fields (e.g. order number from Lines tab)
  if (tab && tab.lockedFields) {
    for (const [col, val] of Object.entries(tab.lockedFields)) {
      if (queryInputs[col]) {
        queryInputs[col].value = val;
        queryInputs[col].readOnly = true;
        queryInputs[col].classList.add("has-value");
        queryInputs[col].style.opacity = "0.6";
        queryInputs[col].title = "Locked — inherited from parent record";
      }
    }
  }

  queryRunBtn.style.display = "none";
  queryClearBtn.style.display = "none";
  queryCreateBtn.style.display = "none";
  createSubmitBtn.style.display = "";
  createCancelBtn.style.display = "";
}

function exitCreateMode() {
  isCreateMode = false;
  queryPage.classList.remove("create-mode");
  queryTitle.textContent = `Query \u2014 ${TABLE_LABELS[activeTable] || activeTable}`;
  document.querySelector(".query-hint").textContent = "Fill in any fields to filter, or leave all blank to show everything.";

  // Unlock any locked fields
  for (const input of Object.values(queryInputs)) {
    input.readOnly = false;
    input.style.opacity = "";
    input.title = "";
  }

  queryRunBtn.style.display = "";
  queryClearBtn.style.display = "";
  queryCreateBtn.style.display = NO_CREATE_TABLES.includes(activeTable) ? "none" : "";
  createSubmitBtn.style.display = "none";
  createCancelBtn.style.display = "none";

  const tab = tabs.find((t) => t.id === activeTabId);

  // Restore query values from before create mode
  if (tab && tab.preCreateQueryValues) {
    buildQueryForm(activeTable, currentColumns, tab.preCreateQueryValues);
    tab.preCreateQueryValues = null;
  }

  // If tab had results before create, go back to results page
  if (tab && tab.hadResultsBeforeCreate) {
    tab.hadResultsBeforeCreate = false;
    showResultsPage();
    resultsTitleBar.textContent = TABLE_LABELS[activeTable] || activeTable;
    resultsCreateBtn.style.display = NO_CREATE_TABLES.includes(activeTable) ? "none" : "";
    massCreateBtn.style.display = (NAV_GROUPS.data.includes(activeTable) && !NO_CREATE_TABLES.includes(activeTable) && !NO_MASS_CREATE_TABLES.includes(activeTable)) ? "" : "none";
    exportWrapper.style.display = NAV_GROUPS.data.includes(activeTable) ? "" : "none";
    rerunQueryBtn.style.display = NAV_GROUPS.data.includes(activeTable) ? "" : "none";
    resultsDeleteBtn.style.display = NO_EDIT_TABLES.includes(activeTable) ? "none" : "";
    massStatusWrapper.style.display = (DROPDOWN_FIELDS[activeTable] && DROPDOWN_FIELDS[activeTable].status) ? "" : "none";
    massStatusDropdown.style.display = "none";
  } else if (SKIP_QUERY_TABLES.includes(activeTable)) {
    // Skip-query tables: always go back to results
    showResultsPage();
  }
}

async function submitCreate() {
  const row = {};
  for (const [col, input] of Object.entries(queryInputs)) {
    row[col] = input.value;
  }

  // Validate required fields
  const required = REQUIRED_FIELDS[activeTable];
  if (required) {
    const missing = required.filter((f) => !row[f] || row[f].trim() === "");
    if (missing.length > 0) {
      alert("Required fields missing: " + missing.map((f) => f.replace(/_/g, " ")).join(", "));
      return;
    }
  }

  createSubmitBtn.disabled = true;
  createSubmitBtn.textContent = "Creating...";

  try {
    const res = await fetch(`${API_BASE}/data/${activeTable}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row }),
    });

    const result = await res.json();
    if (result.success) {
      createSubmitBtn.disabled = false;
      createSubmitBtn.textContent = "Create";
      exitCreateMode();
      showResultsPage();
      // If the tab has locked fields (e.g. opened via Lines), use them as filters
      // Otherwise use the last query filters
      const tab = tabs.find((t) => t.id === activeTabId);
      const filters = (tab && tab.lockedFields && Object.keys(tab.lockedFields).length > 0)
        ? tab.lockedFields
        : (tab && tab.filters ? tab.filters : {});
      await loadTableData(activeTable, filters);
    } else {
      alert("Create failed: " + (result.error || "Unknown error"));
      createSubmitBtn.disabled = false;
      createSubmitBtn.textContent = "Create";
    }
  } catch (err) {
    alert("Create failed: " + err.message);
    createSubmitBtn.disabled = false;
    createSubmitBtn.textContent = "Create";
  }
}

// ── Mass Create ────────────────────────────────────────────────
let massCreateColumns = [];

let massCreateDropdownOptions = {}; // col → options[]

async function openMassCreate() {
  const createHidden = CREATE_HIDDEN_COLUMNS[activeTable] || [];
  massCreateColumns = currentColumns.map((c) => c.column_name).filter((c) => !createHidden.includes(c));
  massCreateTitle.textContent = `Mass Create – ${TABLE_LABELS[activeTable] || activeTable}`;
  massCreateStatus.textContent = "";
  massCreateStatus.className = "mass-create-status";

  // Pre-fetch dropdown options for this table
  massCreateDropdownOptions = {};
  const ddConfig = DROPDOWN_FIELDS[activeTable];
  if (ddConfig) {
    for (const [colName, cfg] of Object.entries(ddConfig)) {
      massCreateDropdownOptions[colName] = await getDropdownOptions(cfg.lookupTable, cfg.valueCol);
    }
  }

  const required = MASS_REQUIRED_FIELDS[activeTable] || REQUIRED_FIELDS[activeTable] || [];

  // Build header row
  massCreateHead.innerHTML = "";
  const htr = document.createElement("tr");
  const numTh = document.createElement("th");
  numTh.textContent = "#";
  htr.appendChild(numTh);

  massCreateColumns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.replace(/_/g, " ");
    if (required.includes(col)) {
      const star = document.createElement("span");
      star.textContent = " *";
      star.style.color = "#f87171";
      th.appendChild(star);
    }
    htr.appendChild(th);
  });
  massCreateHead.appendChild(htr);

  // Start with 10 empty rows
  massCreateBody.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    massCreateBody.appendChild(buildMassRow(i + 1));
  }
  updateMassRowCount();

  massCreateOverlay.style.display = "";
}

function buildMassRow(num) {
  const tr = document.createElement("tr");
  const numTd = document.createElement("td");
  numTd.textContent = num;
  tr.appendChild(numTd);

  massCreateColumns.forEach((col, colIdx) => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.col = col;
    input.dataset.colIdx = colIdx;

    // Pre-fill locked fields (e.g. from parent "Lines" tab)
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab && tab.lockedFields && tab.lockedFields[col] !== undefined) {
      input.value = tab.lockedFields[col];
      input.readOnly = true;
      input.style.opacity = "0.5";
    }

    td.appendChild(input);
    tr.appendChild(td);
  });

  return tr;
}

function updateMassRowCount() {
  const rows = massCreateBody.querySelectorAll("tr");
  massCreateRowCount.textContent = `${rows.length} row${rows.length !== 1 ? "s" : ""}`;
}

function addMassRows(count) {
  const current = massCreateBody.querySelectorAll("tr").length;
  for (let i = 0; i < count; i++) {
    massCreateBody.appendChild(buildMassRow(current + i + 1));
  }
  updateMassRowCount();
}

function clearMassGrid() {
  massCreateBody.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    massCreateBody.appendChild(buildMassRow(i + 1));
  }
  updateMassRowCount();
  massCreateStatus.textContent = "";
  massCreateStatus.className = "mass-create-status";
}

function closeMassCreate() {
  massCreateOverlay.style.display = "none";
}

function handleMassPaste(e) {
  if (massCreateOverlay.style.display === "none") return;

  const target = e.target;
  if (!target.matches || !target.matches(".mass-create-table tbody input")) return;

  const clipText = (e.clipboardData || window.clipboardData).getData("text");
  if (!clipText) return;

  const lines = clipText.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length <= 1 && !clipText.includes("\t")) return; // single cell, let default handle it

  e.preventDefault();

  const startRow = target.closest("tr");
  const startColIdx = parseInt(target.dataset.colIdx, 10);
  const allRows = Array.from(massCreateBody.querySelectorAll("tr"));
  let rowIdx = allRows.indexOf(startRow);

  // Ensure enough rows exist
  const needed = rowIdx + lines.length - allRows.length;
  if (needed > 0) addMassRows(needed);

  const updatedRows = Array.from(massCreateBody.querySelectorAll("tr"));

  lines.forEach((line, li) => {
    const cells = line.split("\t");
    const tr = updatedRows[rowIdx + li];
    if (!tr) return;

    cells.forEach((val, ci) => {
      const colTarget = startColIdx + ci;
      if (colTarget >= massCreateColumns.length) return;
      const input = tr.querySelector(`input[data-col-idx="${colTarget}"]`);
      if (input && !input.readOnly) {
        input.value = val.trim();
      }
    });
  });

  updateMassRowCount();
}

async function submitMassCreate() {
  const allTrs = massCreateBody.querySelectorAll("tr");
  const rows = [];
  const required = MASS_REQUIRED_FIELDS[activeTable] || REQUIRED_FIELDS[activeTable] || [];
  const defaults = MASS_CREATE_DEFAULTS[activeTable] || {};

  allTrs.forEach((tr) => {
    tr.classList.remove("mass-row-error");
    const row = {};
    let hasData = false;
    tr.querySelectorAll("input, select").forEach((el) => {
      const val = el.value.trim();
      if (val !== "") hasData = true;
      row[el.dataset.col] = val;
    });
    if (hasData) {
      // Apply defaults for blank fields
      for (const [field, defVal] of Object.entries(defaults)) {
        if (!row[field] || row[field].trim() === "") {
          row[field] = defVal;
        }
      }
      rows.push({ tr, data: row });
    }
  });

  if (rows.length === 0) {
    massCreateStatus.textContent = "No data to submit.";
    massCreateStatus.className = "mass-create-status error";
    return;
  }

  // Validate required fields
  if (required.length > 0) {
    const failedRows = [];
    rows.forEach((r, i) => {
      const missing = required.filter((f) => !r.data[f] || r.data[f].trim() === "");
      if (missing.length > 0) {
        r.tr.classList.add("mass-row-error");
        failedRows.push(`Row ${i + 1}: missing ${missing.map((f) => f.replace(/_/g, " ")).join(", ")}`);
      }
    });
    if (failedRows.length > 0) {
      massCreateStatus.textContent = `Required fields missing — ${failedRows.join("; ")}`;
      massCreateStatus.className = "mass-create-status error";
      return;
    }
  }

  massCreateSubmitBtn.disabled = true;
  massCreateSubmitBtn.textContent = "Submitting...";
  massCreateStatus.textContent = `Submitting ${rows.length} row${rows.length !== 1 ? "s" : ""}...`;
  massCreateStatus.className = "mass-create-status";

  try {
    const res = await fetch(`${API_BASE}/data/${activeTable}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rows.map((r) => r.data) }),
    });

    const result = await res.json();
    const lines = [];

    if (result.success) {
      if (result.created > 0) {
        lines.push({ text: `Successfully created ${result.created} row${result.created !== 1 ? "s" : ""}.`, type: "success" });
      }
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          lines.push({ text: `Row ${err.row}: ${err.error}`, type: "error" });
        });
      }
    } else {
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          lines.push({ text: `Row ${err.row}: ${err.error}`, type: "error" });
        });
      } else {
        lines.push({ text: result.error || "Unknown error", type: "error" });
      }
    }

    closeMassCreate();
    showMassResult(lines);

    // Refresh table data
    const tab = tabs.find((t) => t.table === activeTable);
    const filters = tab ? tab.filters : {};
    await loadTableData(activeTable, filters);
  } catch (err) {
    closeMassCreate();
    showMassResult([{ text: `Error: ${err.message}`, type: "error" }]);
  }

  massCreateSubmitBtn.disabled = false;
  massCreateSubmitBtn.textContent = "Submit All";
}

// ── Mass Result Popup ──────────────────────────────────────────
function showMassResult(lines) {
  massResultBody.innerHTML = "";
  lines.forEach((line) => {
    const div = document.createElement("div");
    div.className = `mass-result-line ${line.type}`;
    div.textContent = line.text;
    massResultBody.appendChild(div);
  });
  massResultOverlay.style.display = "";
}

function closeMassResult() {
  massResultOverlay.style.display = "none";
}

massResultCloseBtn.addEventListener("click", closeMassResult);
massResultOverlay.addEventListener("click", (e) => {
  if (e.target === massResultOverlay) closeMassResult();
});

// ── Detail overlay ─────────────────────────────────────────────
let detailRow = null;
let detailInputs = {};
let detailEditing = false;
let detailTable = null;

function openDetail(row) {
  detailRow = row;
  detailTable = activeTable;
  detailEditing = false;
  detailPanel.classList.remove("editing");
  detailTitle.textContent = `${TABLE_LABELS[activeTable] || activeTable} \u2014 Details`;
  detailFields.innerHTML = "";
  detailInputs = {};

  currentColumns.forEach((col) => {
    const div = document.createElement("div");
    div.className = "detail-field";

    const label = document.createElement("label");
    label.textContent = col.column_name.replace(/_/g, " ");

    const input = document.createElement("input");
    input.type = "text";
    const val = row[col.column_name];
    input.value = formatCellValue(val, col.column_name);
    input.readOnly = true;
    input.dataset.column = col.column_name;

    if (currentPrimaryKeys.includes(col.column_name)) {
      input.classList.add("pk-field");
    }

    detailInputs[col.column_name] = input;
    div.appendChild(label);
    div.appendChild(input);
    detailFields.appendChild(div);
  });

  // Show "Lines" button only for order_header and pre_advice
  detailLinesBtn.style.display = (activeTable === "order_header" || activeTable === "pre_advice") ? "" : "none";

  detailEditBtn.style.display = NO_EDIT_TABLES.includes(activeTable) ? "none" : "";
  detailDeleteBtn.style.display = (activeTable === "inventory_transaction" || NO_EDIT_TABLES.includes(activeTable)) ? "none" : "";
  detailSaveBtn.style.display = "none";
  detailCancelBtn.style.display = "none";
  detailOverlay.style.display = "flex";
}

async function enterDetailEdit() {
  detailEditing = true;
  detailPanel.classList.add("editing");
  detailEditBtn.style.display = "none";
  detailDeleteBtn.style.display = "none";
  detailLinesBtn.style.display = "none";
  detailSaveBtn.style.display = "";
  detailCancelBtn.style.display = "";

  // Swap dropdown fields
  const ddConfig = DROPDOWN_FIELDS[activeTable];
  if (ddConfig) {
    for (const [colName, cfg] of Object.entries(ddConfig)) {
      if (!detailInputs[colName]) continue;
      const oldInput = detailInputs[colName];
      let options = await getDropdownOptions(cfg.lookupTable, cfg.valueCol);
      if (cfg.manualOnly) options = options.filter((o) => cfg.manualOnly.includes(o));
      const select = createDropdown(options, oldInput.value, cfg);
      select.dataset.column = colName;
      select.className = oldInput.className;
      oldInput.parentNode.replaceChild(select, oldInput);
      detailInputs[colName] = select;
    }
  }

  const readOnlyCols = READ_ONLY_COLUMNS[activeTable] || [];
  for (const [col, input] of Object.entries(detailInputs)) {
    if (!currentPrimaryKeys.includes(col) || SKIP_QUERY_TABLES.includes(activeTable)) {
      if (readOnlyCols.includes(col)) {
        input.readOnly = true;
      } else {
        input.readOnly = false;
      }
    }
  }
}

function cancelDetailEdit() {
  detailEditing = false;
  detailPanel.classList.remove("editing");
  detailEditBtn.style.display = "";
  detailDeleteBtn.style.display = (detailTable === "inventory_transaction") ? "none" : "";
  detailLinesBtn.style.display = (detailTable === "order_header" || detailTable === "pre_advice") ? "" : "none";
  detailSaveBtn.style.display = "none";
  detailCancelBtn.style.display = "none";

  for (const [col, input] of Object.entries(detailInputs)) {
    const val = detailRow[col];
    input.value = val === null || val === undefined ? "" : val;
    input.readOnly = true;
  }
}

async function saveDetailEdit() {
  const updates = {};
  const pkValues = {};
  const isLookup = SKIP_QUERY_TABLES.includes(activeTable);

  currentColumns.forEach((col) => {
    const colName = col.column_name;
    if (currentPrimaryKeys.includes(colName)) {
      pkValues[colName] = detailRow[colName];
      if (isLookup) {
        updates[colName] = detailInputs[colName].value;
      }
    } else {
      updates[colName] = detailInputs[colName].value;
    }
  });

  detailSaveBtn.disabled = true;
  detailSaveBtn.textContent = "Saving...";

  try {
    const res = await fetch(`${API_BASE}/data/${activeTable}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pkValues, updates }),
    });

    const result = await res.json();
    if (result.success) {
      closeDetail();
      const filters = getFilters();
      await loadTableData(activeTable, filters);
    } else {
      alert("Save failed: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    alert("Save failed: " + err.message);
  } finally {
    detailSaveBtn.disabled = false;
    detailSaveBtn.textContent = "Save";
  }
}

async function deleteDetail() {
  if (!confirm("Are you sure you want to delete this record?")) return;

  const pkValues = {};
  for (const pk of currentPrimaryKeys) {
    pkValues[pk] = detailRow[pk];
  }

  detailDeleteBtn.disabled = true;
  detailDeleteBtn.textContent = "Deleting...";

  try {
    const res = await fetch(`${API_BASE}/data/${activeTable}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pkValues }),
    });

    const result = await res.json();
    if (result.success) {
      closeDetail();
      const filters = getFilters();
      await loadTableData(activeTable, filters);
    } else {
      alert("Delete failed: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    alert("Delete failed: " + err.message);
  } finally {
    detailDeleteBtn.disabled = false;
    detailDeleteBtn.textContent = "Delete";
  }
}

function closeDetail() {
  detailOverlay.style.display = "none";
  detailPanel.classList.remove("editing");
  detailEditing = false;
}

// ── "Lines" button — open related lines in a new tab ───────────
function openRelatedLines() {
  closeDetail();

  if (detailTable === "order_header") {
    const orderNum = detailRow["order"];
    if (orderNum) {
      const tab = openTab("order_lines", { order: orderNum });
      tab.lockedFields = { order: orderNum, client_id: detailRow["client_id"] || "" };
      renderTabBar();
      selectTableIntoTab("order_lines", { order: orderNum });
    }
  } else if (detailTable === "pre_advice") {
    const paId = detailRow["pre_advice_id"];
    if (paId) {
      const tab = openTab("pre_advice_lines", { pre_advice_id: paId });
      tab.lockedFields = { pre_advice_id: paId, client_id: detailRow["client_id"] || "" };
      renderTabBar();
      selectTableIntoTab("pre_advice_lines", { pre_advice_id: paId });
    }
  }
}

// ── Event listeners ────────────────────────────────────────────
detailEditBtn.addEventListener("click", enterDetailEdit);
detailSaveBtn.addEventListener("click", saveDetailEdit);
detailCancelBtn.addEventListener("click", cancelDetailEdit);
detailDeleteBtn.addEventListener("click", deleteDetail);
detailLinesBtn.addEventListener("click", openRelatedLines);
detailCloseBtn.addEventListener("click", closeDetail);
detailOverlay.addEventListener("click", (e) => {
  if (e.target === detailOverlay) closeDetail();
});

queryRunBtn.addEventListener("click", runQuery);

queryClearBtn.addEventListener("click", () => {
  for (const input of Object.values(queryInputs)) {
    input.value = "";
    input.classList.remove("has-value");
  }
});

queryCreateBtn.addEventListener("click", openCreateForm);

createSubmitBtn.addEventListener("click", submitCreate);

createCancelBtn.addEventListener("click", exitCreateMode);

backToQueryBtn.addEventListener("click", showQueryPage);
rerunQueryBtn.addEventListener("click", async () => {
  const tab = tabs.find((t) => t.id === activeTabId);
  const filters = tab ? tab.filters || {} : {};
  await loadTableData(activeTable, filters);
});
resultsCreateBtn.addEventListener("click", openCreateForm);

resultsDeleteBtn.addEventListener("click", deleteSelectedRows);

// ── Export functionality ────────────────────────────────────────
exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle("open");
});

document.addEventListener("click", () => {
  exportMenu.classList.remove("open");
});

function getExportData() {
  const headers = [];
  const headerRow = tableHead.querySelector("tr");
  if (!headerRow) return { headers: [], rows: [] };

  headerRow.querySelectorAll("th").forEach((th) => {
    if (!th.classList.contains("actions-col")) {
      headers.push(th.textContent);
    }
  });

  const rows = [];
  tableBody.querySelectorAll("tr").forEach((tr) => {
    const row = [];
    tr.querySelectorAll("td:not(.actions-cell)").forEach((td) => {
      row.push(td.dataset.value || "");
    });
    rows.push(row);
  });

  return { headers, rows };
}

exportCsvBtn.addEventListener("click", () => {
  exportMenu.classList.remove("open");
  const { headers, rows } = getExportData();
  if (headers.length === 0) return;

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((r) => lines.push(r.map(escape).join(",")));

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${TABLE_LABELS[activeTable] || activeTable}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

exportXlsxBtn.addEventListener("click", () => {
  exportMenu.classList.remove("open");
  const { headers, rows } = getExportData();
  if (headers.length === 0) return;

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, TABLE_LABELS[activeTable] || activeTable);
  XLSX.writeFile(wb, `${TABLE_LABELS[activeTable] || activeTable}.xlsx`);
});

// ── Mass Create event listeners ─────────────────────────────────
massCreateBtn.addEventListener("click", openMassCreate);
massCreateCloseBtn.addEventListener("click", closeMassCreate);
massCreateAddRowBtn.addEventListener("click", () => addMassRows(10));
massCreateClearBtn.addEventListener("click", clearMassGrid);
massCreateSubmitBtn.addEventListener("click", submitMassCreate);
document.addEventListener("paste", handleMassPaste);
massCreateOverlay.addEventListener("click", (e) => {
  if (e.target === massCreateOverlay) closeMassCreate();
});

async function deleteSelectedRows() {
  const selected = getSelectedRows();
  if (selected.length === 0) return;

  const count = selected.length;
  if (!confirm(`Are you sure you want to delete ${count} record${count > 1 ? "s" : ""}?`)) return;

  resultsDeleteBtn.disabled = true;
  resultsDeleteBtn.textContent = "Deleting...";

  let successCount = 0;
  let errorMsg = null;

  for (const tr of selected) {
    const pkValues = {};
    for (const pk of currentPrimaryKeys) {
      const td = tr.querySelector(`td[data-column="${pk}"]`);
      if (td) pkValues[pk] = td.dataset.value;
    }

    try {
      const res = await fetch(`${API_BASE}/data/${activeTable}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pkValues }),
      });
      const result = await res.json();
      if (result.success) {
        successCount++;
      } else {
        errorMsg = result.error || "Unknown error";
      }
    } catch (err) {
      errorMsg = err.message;
    }
  }

  resultsDeleteBtn.disabled = false;
  resultsDeleteBtn.innerHTML = 'Delete Selected (<span id="selectedCount">0</span>)';
  // Re-cache span ref after innerHTML replacement
  const newSpan = document.getElementById("selectedCount");
  if (newSpan) selectedCountSpan = newSpan;

  if (errorMsg && successCount < count) {
    alert(`Deleted ${successCount}/${count}. Error: ${errorMsg}`);
  }

  // Refresh table
  const filters = getFilters();
  await loadTableData(activeTable, filters);
  clearSelection();
}

// ── Mass Status Update ─────────────────────────────────────────
massStatusBtn.addEventListener("click", async () => {
  const cfg = DROPDOWN_FIELDS[activeTable] && DROPDOWN_FIELDS[activeTable].status;
  if (!cfg) return;

  const options = await getDropdownOptions(cfg.lookupTable, cfg.valueCol);
  const filtered = cfg.manualOnly ? options.filter((o) => cfg.manualOnly.includes(o)) : options;
  massStatusSelect.innerHTML = "";
  filtered.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    massStatusSelect.appendChild(o);
  });

  massStatusDropdown.style.display = "";
});

massStatusCancelBtn.addEventListener("click", () => {
  massStatusDropdown.style.display = "none";
});

massStatusConfirmBtn.addEventListener("click", async () => {
  const selected = getSelectedRows();
  if (selected.length === 0) return;

  const newStatus = massStatusSelect.value;
  if (!newStatus) return;

  const rows = [];
  for (const tr of selected) {
    const pkValues = {};
    for (const pk of currentPrimaryKeys) {
      const td = tr.querySelector(`td[data-column="${pk}"]`);
      if (td) pkValues[pk] = td.dataset.value;
    }
    rows.push(pkValues);
  }

  massStatusConfirmBtn.disabled = true;
  massStatusConfirmBtn.textContent = "Updating...";

  try {
    const res = await fetch(`${API_BASE}/data/${activeTable}/bulk-status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, status: newStatus }),
    });

    const result = await res.json();
    const lines = [];

    if (result.success) {
      if (result.updated > 0) {
        lines.push({ text: `Successfully updated ${result.updated} row${result.updated !== 1 ? "s" : ""} to "${newStatus}".`, type: "success" });
      }
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          lines.push({ text: `Row ${err.row}: ${err.error}`, type: "error" });
        });
      }
    } else {
      lines.push({ text: result.error || "Unknown error", type: "error" });
    }

    massStatusDropdown.style.display = "none";
    showMassResult(lines);

    // Refresh table
    const tab = tabs.find((t) => t.id === activeTabId);
    const filters = tab && tab.filters ? tab.filters : {};
    await loadTableData(activeTable, filters);
    clearSelection();
  } catch (err) {
    massStatusDropdown.style.display = "none";
    showMassResult([{ text: `Error: ${err.message}`, type: "error" }]);
  }

  massStatusConfirmBtn.disabled = false;
  massStatusConfirmBtn.textContent = "Confirm";
});

// Close mass status dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (massStatusDropdown.style.display !== "none" &&
      !massStatusWrapper.contains(e.target)) {
    massStatusDropdown.style.display = "none";
  }
});

// ── Import feature ─────────────────────────────────────────────
const IMPORT_CONFIGS = {
  order: {
    label: "Orders + Lines",
    headerTable: "order_header",
    lineTable: "order_lines",
    parentKey: "order",
    columns: [
      { col: "order", target: "shared" },
      { col: "client_id", target: "shared" },
      { col: "sku", target: "line" },
      { col: "qty_ordered", target: "line" },
      { col: "order_date", target: "header" },
      { col: "order_time", target: "header" },
      { col: "customer_name", target: "header" },
      { col: "email", target: "header" },
      { col: "phone", target: "header" },
      { col: "town", target: "header" },
      { col: "postcode", target: "header" },
      { col: "address_1", target: "header" },
      { col: "address_2", target: "header" },
      { col: "user_defined_type_1", target: "header" },
      { col: "user_defined_type_2", target: "header" },
      { col: "user_defined_type_3", target: "header" },
      { col: "user_defined_type_4", target: "header" },
      { col: "user_defined_type_5", target: "header" },
      { col: "deliver_by_date", target: "header" },
      { col: "notes", target: "line" },
    ],
    required: ["order", "client_id"],
    headerDefaults: { status: "Ready" },
    lineDefaults: {},
  },
  pre_advice: {
    label: "Pre-Advice + Lines",
    headerTable: "pre_advice",
    lineTable: "pre_advice_lines",
    parentKey: "pre_advice_id",
    columns: [
      { col: "pre_advice_id", target: "shared" },
      { col: "client_id", target: "shared" },
      { col: "sku", target: "line" },
      { col: "qty_received", target: "line" },
      { col: "name", target: "header" },
      { col: "address_1", target: "header" },
      { col: "phone", target: "header" },
      { col: "address_2", target: "header" },
      { col: "town", target: "header" },
      { col: "postcode", target: "header" },
      { col: "country", target: "header" },
      { col: "email", target: "header" },
      { col: "mobile", target: "header" },
      { col: "vat_number", target: "header" },
      { col: "customer_file_ref", target: "header" },
      { col: "seal_number", target: "header" },
      { col: "supplier_name", target: "header" },
      { col: "user_defined_type_1", target: "header" },
      { col: "user_defined_type_2", target: "header" },
      { col: "user_defined_type_3", target: "header" },
      { col: "user_defined_type_4", target: "header" },
      { col: "user_defined_type_5", target: "header" },
      { col: "notes", target: "line" },
      { col: "batch_number", target: "line" },
      { col: "lot_po_number", target: "line" },
      { col: "product_group", target: "line" },
    ],
    required: ["pre_advice_id", "client_id"],
    headerDefaults: { status: "Incoming" },
    lineDefaults: {},
  },
};

let importMode = null;        // "order" | "pre_advice"
let importColumns = [];       // ordered column list for the grid
let importColumnMeta = {};    // col → "header" | "line" | "shared"
let importDropdownOptions = {};

function buildImportColumns(cfg) {
  importColumns = [];
  importColumnMeta = {};
  cfg.columns.forEach(({ col, target }) => {
    const key = target === "shared" ? col : target === "header" ? `h:${col}` : `l:${col}`;
    importColumns.push(key);
    importColumnMeta[key] = target;
  });
}

function importColDisplayName(col) {
  const raw = col.startsWith("h:") || col.startsWith("l:") ? col.slice(2) : col;
  return raw.replace(/_/g, " ");
}

async function openImport(mode) {
  importMode = mode;
  const cfg = IMPORT_CONFIGS[mode];
  buildImportColumns(cfg);

  importTitle.textContent = `Import — ${cfg.label}`;
  importStatus.textContent = "";
  importStatus.className = "mass-create-status";

  // Pre-fetch client dropdown
  importDropdownOptions = {};
  importDropdownOptions["client_id"] = await getDropdownOptions("clients", "client_id");
  if (cfg.columns.some(c => c.col === "status")) {
    const statusTable = mode === "order" ? "order_header_status_codes" : "pre_advice_status_codes";
    importDropdownOptions["h:status"] = await getDropdownOptions(statusTable, "status_code");
  }

  // Build header
  importHead.innerHTML = "";
  const htr = document.createElement("tr");
  const numTh = document.createElement("th");
  numTh.textContent = "#";
  htr.appendChild(numTh);

  importColumns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = importColDisplayName(col);
    const meta = importColumnMeta[col];
    th.className = meta === "shared" ? "col-shared" : meta === "header" ? "col-header" : "col-line";
    if (cfg.required.includes(col)) {
      const star = document.createElement("span");
      star.textContent = " *";
      star.style.color = "#f87171";
      th.appendChild(star);
    }
    htr.appendChild(th);
  });
  importHead.appendChild(htr);

  // 10 empty rows
  importBody.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    importBody.appendChild(buildImportRow(i + 1));
  }
  updateImportRowCount();
  importOverlay.style.display = "";
}

function buildImportRow(num) {
  const tr = document.createElement("tr");
  const numTd = document.createElement("td");
  numTd.textContent = num;
  tr.appendChild(numTd);

  importColumns.forEach((col, idx) => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.col = col;
    input.dataset.colIdx = idx;
    td.appendChild(input);
    tr.appendChild(td);
  });
  return tr;
}

function addImportRows(count) {
  const current = importBody.querySelectorAll("tr").length;
  for (let i = 0; i < count; i++) {
    importBody.appendChild(buildImportRow(current + i + 1));
  }
  updateImportRowCount();
}

function updateImportRowCount() {
  const filled = Array.from(importBody.querySelectorAll("tr")).filter((tr) => {
    return Array.from(tr.querySelectorAll("input")).some((inp) => inp.value.trim() !== "");
  }).length;
  const total = importBody.querySelectorAll("tr").length;
  importRowCount.textContent = `${filled} / ${total} rows`;
}

function closeImport() {
  importOverlay.style.display = "none";
  importMode = null;
}

function handleImportPaste(e) {
  if (importOverlay.style.display === "none") return;
  const target = e.target;
  if (!target.matches || !target.matches(".import-table tbody input")) return;

  const clipText = (e.clipboardData || window.clipboardData).getData("text");
  if (!clipText) return;

  const lines = clipText.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length <= 1 && !clipText.includes("\t")) return;

  e.preventDefault();
  const startRow = target.closest("tr");
  const startColIdx = parseInt(target.dataset.colIdx, 10);
  const allRows = Array.from(importBody.querySelectorAll("tr"));
  let rowIdx = allRows.indexOf(startRow);

  const needed = rowIdx + lines.length - allRows.length;
  if (needed > 0) addImportRows(needed);

  const updatedRows = Array.from(importBody.querySelectorAll("tr"));
  lines.forEach((line, li) => {
    const cells = line.split("\t");
    const tr = updatedRows[rowIdx + li];
    if (!tr) return;
    cells.forEach((val, ci) => {
      const colTarget = startColIdx + ci;
      if (colTarget >= importColumns.length) return;
      const input = tr.querySelector(`input[data-col-idx="${colTarget}"]`);
      if (input) input.value = val.trim();
    });
  });
  updateImportRowCount();
}

document.addEventListener("paste", handleImportPaste);

async function submitImport() {
  const cfg = IMPORT_CONFIGS[importMode];
  const allTrs = importBody.querySelectorAll("tr");
  const rawRows = [];

  allTrs.forEach((tr) => {
    tr.classList.remove("mass-row-error");
    const row = {};
    let hasData = false;
    tr.querySelectorAll("input, select").forEach((el) => {
      const val = el.value.trim();
      if (val !== "") hasData = true;
      row[el.dataset.col] = val;
    });
    if (hasData) rawRows.push({ tr, data: row });
  });

  if (rawRows.length === 0) {
    importStatus.textContent = "No data to submit.";
    importStatus.className = "mass-create-status error";
    return;
  }

  // Validate required fields
  const failedRows = [];
  rawRows.forEach((r, i) => {
    const missing = cfg.required.filter((f) => !r.data[f] || r.data[f].trim() === "");
    if (missing.length > 0) {
      r.tr.classList.add("mass-row-error");
      failedRows.push(`Row ${i + 1}: missing ${missing.map((f) => f.replace(/_/g, " ")).join(", ")}`);
    }
  });
  if (failedRows.length > 0) {
    importStatus.textContent = `Required fields missing — ${failedRows.join("; ")}`;
    importStatus.className = "mass-create-status error";
    return;
  }

  importSubmitBtn.disabled = true;
  importSubmitBtn.textContent = "Submitting...";
  importStatus.textContent = `Processing ${rawRows.length} row${rawRows.length !== 1 ? "s" : ""}...`;
  importStatus.className = "mass-create-status";

  // Split rows into header and line data, grouped by parent key
  const groups = new Map(); // parentKey → { rows: [...], headerFields: [...] }
  const headerCols = cfg.columns.filter(c => c.target === "header").map(c => c.col);
  const lineCols = cfg.columns.filter(c => c.target === "line").map(c => c.col);
  const sharedCols = cfg.columns.filter(c => c.target === "shared").map(c => c.col);

  rawRows.forEach((r, i) => {
    const d = r.data;
    const parentVal = d[cfg.parentKey];
    if (!groups.has(parentVal)) {
      groups.set(parentVal, { rows: [], headerFieldsList: [] });
    }
    const g = groups.get(parentVal);
    g.rows.push({ rowIdx: i, tr: r.tr, data: d });

    // Collect header-only field values for this row
    const hdrVals = {};
    headerCols.forEach((c) => {
      const v = d[`h:${c}`] || "";
      if (v !== "") hdrVals[c] = v;
    });
    g.headerFieldsList.push(hdrVals);
  });

  // Validate: for each group, header-only fields must be consistent across all rows
  const conflictErrors = [];
  const skippedParents = new Set();

  for (const [parentVal, g] of groups) {
    const base = g.headerFieldsList[0];
    for (let r = 1; r < g.headerFieldsList.length; r++) {
      const other = g.headerFieldsList[r];
      // Check all keys that appear in either row
      const allKeys = new Set([...Object.keys(base), ...Object.keys(other)]);
      for (const k of allKeys) {
        const a = base[k] || "";
        const b = other[k] || "";
        if (a !== b) {
          conflictErrors.push(`'${parentVal}' has conflicting header data for '${k.replace(/_/g, " ")}' ("${a}" vs "${b}")`);
          skippedParents.add(parentVal);
          // Highlight the conflicting rows
          g.rows.forEach((row) => row.tr.classList.add("mass-row-error"));
          break;
        }
      }
      if (skippedParents.has(parentVal)) break;
    }
  }

  if (conflictErrors.length > 0 && skippedParents.size === groups.size) {
    // All groups have conflicts — nothing to submit
    importStatus.textContent = `All records have header conflicts — ${conflictErrors.join("; ")}`;
    importStatus.className = "mass-create-status error";
    importSubmitBtn.disabled = false;
    importSubmitBtn.textContent = "Submit All";
    return;
  }

  // Build final header + line arrays (skip conflicting groups)
  const headerMap = new Map();
  const lineRows = [];

  for (const [parentVal, g] of groups) {
    if (skippedParents.has(parentVal)) continue;

    // Build one header from first row
    const firstData = g.rows[0].data;
    const hdr = {};
    sharedCols.forEach((c) => { if (firstData[c]) hdr[c] = firstData[c]; });
    headerCols.forEach((c) => { if (firstData[`h:${c}`]) hdr[c] = firstData[`h:${c}`]; });
    for (const [k, v] of Object.entries(cfg.headerDefaults)) {
      if (!hdr[k] || hdr[k] === "") hdr[k] = v;
    }
    headerMap.set(parentVal, hdr);

    // Build one line per row
    g.rows.forEach((row) => {
      const line = {};
      sharedCols.forEach((c) => { if (row.data[c]) line[c] = row.data[c]; });
      lineCols.forEach((c) => { if (row.data[`l:${c}`]) line[c] = row.data[`l:${c}`]; });
      for (const [k, v] of Object.entries(cfg.lineDefaults)) {
        if (!line[k] || line[k] === "") line[k] = v;
      }
      lineRows.push(line);
    });
  }

  try {
    const res = await fetch(`${API_BASE}/import/${importMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headers: Array.from(headerMap.values()),
        lines: lineRows,
      }),
    });

    const result = await res.json();
    const lines = [];

    // Show conflict errors first (groups skipped due to inconsistent header data)
    conflictErrors.forEach((err) => {
      lines.push({ text: err, type: "error" });
    });

    if (result.headersCreated > 0) {
      lines.push({ text: `Created ${result.headersCreated} ${cfg.parentKey.replace(/_/g, " ")} header${result.headersCreated !== 1 ? "s" : ""}.`, type: "success" });
    }
    if (result.linesCreated > 0) {
      lines.push({ text: `Created ${result.linesCreated} line${result.linesCreated !== 1 ? "s" : ""}.`, type: "success" });
    }
    if (result.errors && result.errors.length > 0) {
      result.errors.forEach((err) => {
        lines.push({ text: err, type: "error" });
      });
    }
    if (lines.length === 0) {
      lines.push({ text: result.error || "Unknown error", type: "error" });
    }

    closeImport();
    showMassResult(lines);
  } catch (err) {
    closeImport();
    showMassResult([{ text: `Error: ${err.message}`, type: "error" }]);
  }

  importSubmitBtn.disabled = false;
  importSubmitBtn.textContent = "Submit All";
}

// Wire import events
menuImport.querySelectorAll("button[data-import]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".nav-dropdown").forEach((d) => d.classList.remove("open"));
    openImport(btn.dataset.import);
  });
});
importAddRowBtn.addEventListener("click", () => addImportRows(1));
importTemplateBtn.addEventListener("click", () => {
  if (!importMode || !importColumns.length) return;
  const cfg = IMPORT_CONFIGS[importMode];
  const headers = importColumns.map((col) => importColDisplayName(col));
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Template");
  const filename = `${cfg.label.replace(/\s+/g, "_")}_Template.xlsx`;
  XLSX.writeFile(wb, filename);
});
importClearBtn.addEventListener("click", () => {
  importBody.querySelectorAll("input").forEach((inp) => { inp.value = ""; });
  importBody.querySelectorAll("tr").forEach((tr) => tr.classList.remove("mass-row-error"));
  importStatus.textContent = "";
  importStatus.className = "mass-create-status";
  updateImportRowCount();
});
importSubmitBtn.addEventListener("click", submitImport);
importCloseBtn.addEventListener("click", closeImport);
importOverlay.addEventListener("click", (e) => {
  if (e.target === importOverlay) closeImport();
});
importBody.addEventListener("input", () => updateImportRowCount());

// ── KPI Dashboard ──────────────────────────────────────────────
function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function kpiMonthString(m) {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

function kpiMonthLabel(m) {
  return new Date(m.year, m.month - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function shiftMonth(m, delta) {
  let newMonth = m.month + delta;
  let newYear = m.year;
  if (newMonth < 1) { newMonth = 12; newYear--; }
  if (newMonth > 12) { newMonth = 1; newYear++; }
  return { year: newYear, month: newMonth };
}

async function loadKpiMonthly(m) {
  const param = kpiMonthString(m);
  kpiMonth.textContent = kpiMonthLabel(m);
  try {
    const res = await fetch(`${API_BASE}/kpi?month=${param}`);
    const d = await res.json();
    const fmt = (n) => Number(n).toLocaleString("en-GB");
    document.getElementById("kpiOrdersShipped").textContent = fmt(d.outbound.ordersShipped);
    document.getElementById("kpiLinesShipped").textContent = fmt(d.outbound.linesShipped);
    document.getElementById("kpiQtyShipped").textContent = fmt(d.outbound.qtyShipped);
    document.getElementById("kpiPreAdvicesReceived").textContent = fmt(d.inbound.preAdvicesReceived);
    document.getElementById("kpiLinesReceived").textContent = fmt(d.inbound.linesReceived);
    document.getElementById("kpiQtyReceived").textContent = fmt(d.inbound.qtyReceived);
    document.getElementById("kpiStockChecks").textContent = fmt(d.stockChecks);
  } catch (err) {
    kpiMonth.textContent = "Failed to load data";
  }
}

async function loadKpiSnapshot() {
  try {
    const res = await fetch(`${API_BASE}/kpi`);
    const d = await res.json();
    const fmt = (n) => Number(n).toLocaleString("en-GB");
    document.getElementById("kpiTotalStockQty").textContent = fmt(d.inventory.totalStockQty);
    document.getElementById("kpiUsedLocations").textContent = fmt(d.locations.used);
    document.getElementById("kpiEmptyLocations").textContent = fmt(d.locations.empty);
    document.getElementById("kpiTotalLocations").textContent = fmt(d.locations.total);
  } catch (err) { /* snapshot labels stay as — */ }
}

async function loadKpiData() {
  if (!kpiSelectedMonth) kpiSelectedMonth = getCurrentMonth();
  loadKpiMonthly(kpiSelectedMonth);
  loadKpiSnapshot();
}

kpiPrevMonth.addEventListener("click", () => {
  kpiSelectedMonth = shiftMonth(kpiSelectedMonth || getCurrentMonth(), -1);
  loadKpiMonthly(kpiSelectedMonth);
});

kpiNextMonth.addEventListener("click", () => {
  kpiSelectedMonth = shiftMonth(kpiSelectedMonth || getCurrentMonth(), 1);
  loadKpiMonthly(kpiSelectedMonth);
});

kpiNavBtn.addEventListener("click", () => {
  document.querySelectorAll(".nav-dropdown").forEach((d) => d.classList.remove("open"));
  if (activeTabId) saveTabState();
  activeTabId = null;
  activeTable = null;
  showKpiPage();
  renderTabBar();
});

// ── Init ───────────────────────────────────────────────────────
initializeAuthGate();
