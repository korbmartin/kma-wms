import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://fvrvfioqfgvmvdgnniyu.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_s-f5r8mvwsUw2elcCidvgw_K0LawYRr";

const TABLES = {
  order_header: "order_header",
  order_lines: "order_lines",
  clients: "clients",
  inventory: "inventory",
  inventory_transaction: "inventory_transaction",
  transaction_codes: "transaction_codes",
  location: "location",
  sku: "sku",
  pre_advice: "pre_advice",
  pre_advice_lines: "pre_advice_lines",
  location_type: "location_type",
  inventory_status_codes: "inventory_status_codes",
  location_status_codes: "location_status_codes",
  pre_advice_status_codes: "pre_advice_status_codes",
  order_status_codes: "order_status_codes",
  order_header_status_codes: "order_header_status_codes",
};

const TABLE_PKS = {
  order_header: ["order"],
  order_lines: ["order", "line_id"],
  clients: ["client_id"],
  inventory: ["id"],
  inventory_transaction: ["id"],
  transaction_codes: ["code"],
  location: ["location"],
  sku: ["sku", "client_id"],
  pre_advice: ["pre_advice_id"],
  pre_advice_lines: ["pre_advice_id", "line_id"],
  location_type: ["type"],
  inventory_status_codes: ["status_code"],
  location_status_codes: ["status_code"],
  pre_advice_status_codes: ["status_code"],
  order_status_codes: ["status_code"],
  order_header_status_codes: ["status_code"],
};

const NO_CREATE_TABLES = ["inventory", "inventory_transaction"];
const NO_EDIT_TABLES = ["inventory", "inventory_transaction"];
const NO_DELETE_TABLES = ["inventory_transaction"];

const CREATION_TIMESTAMP_TABLES = ["order_header", "order_lines", "pre_advice", "pre_advice_lines"];

const AUTO_LINE_ID_TABLES = {
  order_lines: { parentCol: "order", lineCol: "line_id" },
  pre_advice_lines: { parentCol: "pre_advice_id", lineCol: "line_id" },
};

const LINE_COUNT_TABLES = {
  order_lines: {
    parentTable: "order_header",
    parentCol: "order",
    linesTable: "order_lines",
    countCol: "number_of_lines",
  },
  pre_advice_lines: {
    parentTable: "pre_advice",
    parentCol: "pre_advice_id",
    linesTable: "pre_advice_lines",
    countCol: "number_of_lines",
  },
};

const IMPORT_MODES = {
  order: {
    headerTable: "order_header",
    lineTable: "order_lines",
    parentKey: "order",
  },
  pre_advice: {
    headerTable: "pre_advice",
    lineTable: "pre_advice_lines",
    parentKey: "pre_advice_id",
  },
};

const STATUS_LOG_FIELDS = {
  location: {
    type: "Location",
    code: "Status Change",
    map: (row) => ({
      location: row.location,
      status: row.status,
      description: `Status changed to ${row.status}`,
    }),
  },
  order_header: {
    type: "Order Header",
    code: "Order Status Change",
    map: (row) => ({
      client_id: row.client_id,
      status: row.status,
      order: row.order,
      description: row.instructions || `Status changed to ${row.status}`,
    }),
  },
  pre_advice: {
    type: "Pre-Advice Header",
    code: "Pre-advice Status Change",
    map: (row) => ({
      client_id: row.client_id,
      status: row.status,
      pre_advice_id: row.pre_advice_id,
      description: row.notes || `Status changed to ${row.status}`,
    }),
  },
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const AUTH_TOKEN_TTL_SECONDS = 12 * 60 * 60;
const DEFAULT_AUTH_SECRET = "kma-wms-auth-fallback-secret";

function responseJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function sanitizeMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
  return JSON.stringify(err);
}

function getAuthSecret(env) {
  return env.AUTH_TOKEN_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_AUTH_SECRET;
}

function base64UrlEncodeString(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeString(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signValueHmac(value, secret) {
  const keyData = new TextEncoder().encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createAuthToken(username, env) {
  const payload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + AUTH_TOKEN_TTL_SECONDS,
  };
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await signValueHmac(payloadEncoded, getAuthSecret(env));
  return `${payloadEncoded}.${signature}`;
}

async function verifyAuthToken(token, env) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  const expectedSignature = await signValueHmac(payloadEncoded, getAuthSecret(env));
  if (expectedSignature !== signature) return null;

  try {
    const payloadJson = base64UrlDecodeString(payloadEncoded);
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.u || typeof payload.u !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function requireAuth(request, env) {
  const token = getBearerToken(request);
  if (!token) {
    return responseJson({ error: "Authentication required" }, 401);
  }

  const payload = await verifyAuthToken(token, env);
  if (!payload) {
    return responseJson({ error: "Invalid or expired session" }, 401);
  }

  return null;
}

function parseIntSafe(value, fallback = 0) {
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? num : fallback;
}

function numSafe(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function isValidColumnName(column) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column);
}

function normalizeRowValues(row) {
  const normalized = {};
  for (const [col, val] of Object.entries(row || {})) {
    if (!isValidColumnName(col)) {
      return { error: `Invalid column name: ${col}` };
    }
    if (val === "" || val === null || val === undefined) continue;
    normalized[col] = val;
  }
  return { row: normalized };
}

async function parseRequestBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function applyCreationTimestamp(row) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);
  if (!row.creation_date) row.creation_date = dateStr;
  if (!row.creation_time) row.creation_time = timeStr;
}

function applyPkFilters(query, pks, pkValues) {
  let q = query;
  for (const pk of pks) {
    q = q.eq(pk, pkValues[pk]);
  }
  return q;
}

async function getCount(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function fetchAllRows(builderFactory, pageSize = 1000, maxRows = 50000) {
  const rows = [];
  let from = 0;

  while (from < maxRows) {
    const { data, error } = await builderFactory().range(from, from + pageSize - 1);
    if (error) throw error;

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchTableColumns(supabase, tableName, sampleRows = []) {
  const { data, error } = await supabase
    .schema("information_schema")
    .from("columns")
    .select("column_name,data_type,ordinal_position")
    .eq("table_schema", "public")
    .eq("table_name", tableName)
    .order("ordinal_position", { ascending: true });

  if (!error && Array.isArray(data) && data.length > 0) {
    return data.map((col) => ({
      column_name: col.column_name,
      data_type: col.data_type,
    }));
  }

  if (sampleRows.length > 0) {
    return Object.keys(sampleRows[0]).map((col) => ({
      column_name: col,
      data_type: "text",
    }));
  }

  return [];
}

async function fetchOneByPk(supabase, tableName, pks, pkValues, columns = "*") {
  let query = supabase.from(tableName).select(columns).limit(1);
  query = applyPkFilters(query, pks, pkValues);
  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function getValidClientSet(supabase) {
  const rows = await fetchAllRows(() => supabase.from("clients").select("client_id"), 1000, 200000);
  return new Set(rows.map((r) => r.client_id).filter(Boolean));
}

async function getNextLineId(supabase, tableName, parentCol, parentValue) {
  const rows = await fetchAllRows(
    () => supabase.from(tableName).select("line_id").eq(parentCol, parentValue),
    1000,
    200000
  );

  let maxId = 0;
  for (const row of rows) {
    const id = parseIntSafe(row.line_id, 0);
    if (id > maxId) maxId = id;
  }

  return String(maxId + 1);
}

async function updateLineCount(supabase, cfg, parentValue) {
  const count = await getCount(
    supabase.from(cfg.linesTable).select("*", { head: true, count: "exact" }).eq(cfg.parentCol, parentValue)
  );

  const { error } = await supabase
    .from(cfg.parentTable)
    .update({ [cfg.countCol]: count })
    .eq(cfg.parentCol, parentValue);

  if (error) throw error;
}

async function existsByFilters(supabase, tableName, filters) {
  let query = supabase.from(tableName).select("*", { head: true, count: "exact" });
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  const count = await getCount(query);
  return count > 0;
}

async function logStatusChange(supabase, tableKey, pkValues) {
  const cfg = STATUS_LOG_FIELDS[tableKey];
  if (!cfg) return;

  const pks = TABLE_PKS[tableKey] || [];
  const tableName = TABLES[tableKey];
  if (!tableName || pks.length === 0) return;

  const row = await fetchOneByPk(supabase, tableName, pks, pkValues, "*");
  if (!row) return;

  const fields = cfg.map(row);

  const payload = {
    code: cfg.code,
    type: cfg.type,
    client_id: fields.client_id ?? null,
    sku: fields.sku ?? null,
    location: fields.location ?? null,
    tag_id: fields.tag_id ?? null,
    description: fields.description ?? null,
    status: fields.status ?? null,
    qty: fields.qty ?? null,
    order: fields.order ?? null,
    pre_advice_id: fields.pre_advice_id ?? null,
    order_line_id: fields.order_line_id ?? null,
    pre_advice_line_id: fields.pre_advice_line_id ?? null,
  };

  const { error } = await supabase.from("inventory_transaction").insert(payload);
  if (error) throw error;
}

function getSupabaseClient(env) {
  const url = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY)");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getPathParam(pathname, regex) {
  const match = pathname.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleHealth(supabase) {
  await supabase.from("clients").select("client_id").limit(1);
  return responseJson({ status: "ok" });
}

async function handleLogin(supabase, request, env) {
  const body = await parseRequestBody(request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return responseJson({ error: "Username and password are required" }, 400);
  }

  const { data, error } = await supabase
    .from("users")
    .select("username,password")
    .eq("username", username)
    .limit(1);

  if (error) throw error;

  const userRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!userRow || String(userRow.password) !== password) {
    return responseJson({ error: "Invalid username or password" }, 401);
  }

  const token = await createAuthToken(username, env);
  return responseJson({
    success: true,
    token,
    username,
    expiresIn: AUTH_TOKEN_TTL_SECONDS,
  });
}

function ensureKnownTable(tableKey) {
  const tableName = TABLES[tableKey];
  if (!tableName) {
    return { error: responseJson({ error: "Unknown table" }, 404) };
  }
  return { tableName };
}

function ensurePkValuesPresent(pks, pkValues) {
  for (const pk of pks) {
    if (!Object.prototype.hasOwnProperty.call(pkValues || {}, pk)) return false;
  }
  return true;
}

async function handleGetData(supabase, tableKey, searchParams) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  const search = searchParams.get("search") || "";
  const column = searchParams.get("column") || "";
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");

  let query = supabase.from(tableName).select("*", { count: "exact" });

  if (search && column) {
    if (!isValidColumnName(column)) {
      return responseJson({ error: "Invalid column name" }, 400);
    }
    query = query.ilike(column, `%${search}%`);
  }

  for (const [key, value] of searchParams.entries()) {
    if (["search", "column", "limit", "offset"].includes(key)) continue;
    if (!isValidColumnName(key)) continue;
    if (value === "") continue;
    query = query.ilike(key, `%${value}%`);
  }

  const lim = Math.min(parseIntSafe(limitRaw, 500) || 500, 5000);
  const off = parseIntSafe(offsetRaw, 0);
  query = query.range(off, off + lim - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data || [];
  const columns = await fetchTableColumns(supabase, tableName, rows);

  return responseJson({
    table: tableKey,
    columns,
    primaryKeys: TABLE_PKS[tableKey] || [],
    rows,
    count: count ?? rows.length,
  });
}

async function handleUpdateData(supabase, tableKey, request) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  if (NO_EDIT_TABLES.includes(tableKey)) {
    return responseJson({ error: "Editing this table is not allowed" }, 403);
  }

  const pks = TABLE_PKS[tableKey];
  if (!pks || pks.length === 0) {
    return responseJson({ error: "No primary key defined for this table" }, 400);
  }

  const body = await parseRequestBody(request);
  const pkValues = body?.pkValues;
  const updates = body?.updates;

  if (!pkValues || !updates || typeof updates !== "object") {
    return responseJson({ error: "Missing pkValues or updates in request body" }, 400);
  }

  if (!ensurePkValuesPresent(pks, pkValues)) {
    return responseJson({ error: "Missing primary key value(s)" }, 400);
  }

  for (const col of [...Object.keys(updates), ...pks]) {
    if (!isValidColumnName(col)) {
      return responseJson({ error: `Invalid column name: ${col}` }, 400);
    }
  }

  const setPayload = {};
  for (const [col, val] of Object.entries(updates)) {
    setPayload[col] = val === "" ? null : val;
  }

  let oldStatus;
  if (updates.status !== undefined && STATUS_LOG_FIELDS[tableKey]) {
    const existing = await fetchOneByPk(supabase, tableName, pks, pkValues, "status");
    oldStatus = existing ? existing.status : undefined;
  }

  let updateQuery = supabase.from(tableName).update(setPayload).select("*");
  updateQuery = applyPkFilters(updateQuery, pks, pkValues);
  const { error } = await updateQuery;
  if (error) throw error;

  if (updates.status !== undefined && STATUS_LOG_FIELDS[tableKey] && oldStatus !== updates.status) {
    try {
      await logStatusChange(supabase, tableKey, pkValues);
    } catch (logErr) {
      console.error("Status log error:", sanitizeMessage(logErr));
    }
  }

  return responseJson({ success: true });
}

async function handleBulkStatus(supabase, tableKey, request) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  if (NO_EDIT_TABLES.includes(tableKey)) {
    return responseJson({ error: "Editing this table is not allowed" }, 403);
  }

  const pks = TABLE_PKS[tableKey];
  if (!pks || pks.length === 0) {
    return responseJson({ error: "No primary key defined for this table" }, 400);
  }

  const body = await parseRequestBody(request);
  const rows = body?.rows;
  const status = body?.status;

  if (!Array.isArray(rows) || rows.length === 0 || typeof status !== "string") {
    return responseJson({ error: "Missing rows array or status value" }, 400);
  }

  if (rows.length > 5000) {
    return responseJson({ error: "Maximum 5000 rows per bulk update" }, 400);
  }

  for (const pk of pks) {
    if (!isValidColumnName(pk)) {
      return responseJson({ error: `Invalid column name: ${pk}` }, 400);
    }
  }

  let updated = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const pkValues = rows[i] || {};
    try {
      if (!ensurePkValuesPresent(pks, pkValues)) {
        throw new Error("Missing primary key value(s)");
      }

      const existing = await fetchOneByPk(supabase, tableName, pks, pkValues, "status");
      const oldStatus = existing ? existing.status : null;

      let updateQuery = supabase.from(tableName).update({ status }).select("*");
      updateQuery = applyPkFilters(updateQuery, pks, pkValues);
      const { error } = await updateQuery;
      if (error) throw error;

      updated += 1;

      if (STATUS_LOG_FIELDS[tableKey] && oldStatus !== status) {
        try {
          await logStatusChange(supabase, tableKey, pkValues);
        } catch (logErr) {
          console.error("Status log error:", sanitizeMessage(logErr));
        }
      }
    } catch (err) {
      errors.push({ row: i + 1, error: sanitizeMessage(err) });
    }
  }

  return responseJson({ success: true, updated, errors });
}

async function handleCreateData(supabase, tableKey, request) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  if (NO_CREATE_TABLES.includes(tableKey)) {
    return responseJson({ error: "Creating in this table is not allowed" }, 403);
  }

  const body = await parseRequestBody(request);
  const row = body?.row;

  if (!row || typeof row !== "object") {
    return responseJson({ error: "Missing row in request body" }, 400);
  }

  if (tableKey === "order_header" && row.order && row.client_id) {
    const exists = await existsByFilters(supabase, "order_header", {
      order: row.order,
      client_id: row.client_id,
    });
    if (exists) {
      return responseJson({ error: `Order '${row.order}' already exists for client '${row.client_id}'` }, 409);
    }
  }

  if (tableKey === "pre_advice" && row.pre_advice_id && row.client_id) {
    const exists = await existsByFilters(supabase, "pre_advice", {
      pre_advice_id: row.pre_advice_id,
      client_id: row.client_id,
    });
    if (exists) {
      return responseJson(
        { error: `Pre-Advice '${row.pre_advice_id}' already exists for client '${row.client_id}'` },
        409
      );
    }
  }

  if (CREATION_TIMESTAMP_TABLES.includes(tableKey)) {
    applyCreationTimestamp(row);
  }

  const lineCfg = AUTO_LINE_ID_TABLES[tableKey];
  if (lineCfg && !row[lineCfg.lineCol]) {
    const parentVal = row[lineCfg.parentCol];
    if (parentVal) {
      row[lineCfg.lineCol] = await getNextLineId(supabase, tableName, lineCfg.parentCol, parentVal);
    }
  }

  const prepared = normalizeRowValues(row);
  if (prepared.error) {
    return responseJson({ error: prepared.error }, 400);
  }

  const payload = prepared.row;
  if (Object.keys(payload).length === 0) {
    return responseJson({ error: "No data provided" }, 400);
  }

  const { data, error } = await supabase.from(tableName).insert(payload).select("*").limit(1);
  if (error) throw error;

  const lcCfg = LINE_COUNT_TABLES[tableKey];
  if (lcCfg) {
    const parentVal = row[lcCfg.parentCol];
    if (parentVal) {
      await updateLineCount(supabase, lcCfg, parentVal);
    }
  }

  return responseJson({ success: true, row: data && data.length > 0 ? data[0] : null });
}

async function handleBulkCreate(supabase, tableKey, request) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  if (NO_CREATE_TABLES.includes(tableKey)) {
    return responseJson({ error: "Creating in this table is not allowed" }, 403);
  }

  const body = await parseRequestBody(request);
  const rows = body?.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return responseJson({ error: "Missing rows array in request body" }, 400);
  }

  if (rows.length > 5000) {
    return responseJson({ error: "Maximum 5000 rows per request" }, 400);
  }

  const validClients = await getValidClientSet(supabase);
  let created = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row || typeof row !== "object") {
      errors.push({ row: i + 1, error: "Invalid row data" });
      continue;
    }

    try {
      if (row.client_id && !validClients.has(row.client_id)) {
        throw new Error(`Client '${row.client_id}' does not exist`);
      }

      if (tableKey === "order_header" && row.order && row.client_id) {
        const exists = await existsByFilters(supabase, "order_header", {
          order: row.order,
          client_id: row.client_id,
        });
        if (exists) {
          throw new Error(`Order '${row.order}' already exists for client '${row.client_id}'`);
        }
      }

      if (tableKey === "pre_advice" && row.pre_advice_id && row.client_id) {
        const exists = await existsByFilters(supabase, "pre_advice", {
          pre_advice_id: row.pre_advice_id,
          client_id: row.client_id,
        });
        if (exists) {
          throw new Error(`Pre-Advice '${row.pre_advice_id}' already exists for client '${row.client_id}'`);
        }
      }

      if (CREATION_TIMESTAMP_TABLES.includes(tableKey)) {
        applyCreationTimestamp(row);
      }

      const lineCfg = AUTO_LINE_ID_TABLES[tableKey];
      if (lineCfg && !row[lineCfg.lineCol]) {
        const parentVal = row[lineCfg.parentCol];
        if (parentVal) {
          row[lineCfg.lineCol] = await getNextLineId(supabase, tableName, lineCfg.parentCol, parentVal);
        }
      }

      const prepared = normalizeRowValues(row);
      if (prepared.error) throw new Error(prepared.error);

      if (Object.keys(prepared.row).length === 0) {
        throw new Error("No data provided");
      }

      const { error } = await supabase.from(tableName).insert(prepared.row);
      if (error) throw error;

      created += 1;
    } catch (err) {
      errors.push({ row: i + 1, error: sanitizeMessage(err) });
    }
  }

  const lcCfg = LINE_COUNT_TABLES[tableKey];
  if (lcCfg) {
    const parentValues = new Set(rows.map((r) => r?.[lcCfg.parentCol]).filter(Boolean));
    for (const parentValue of parentValues) {
      await updateLineCount(supabase, lcCfg, parentValue);
    }
  }

  if (errors.length > 0 && created === 0) {
    return responseJson({ success: false, created: 0, errors }, 400);
  }

  return responseJson({ success: true, created, errors });
}

async function handleImport(supabase, mode, request) {
  const cfg = IMPORT_MODES[mode];
  if (!cfg) {
    return responseJson({ error: "Unknown import mode" }, 404);
  }

  const body = await parseRequestBody(request);
  const headers = body?.headers;
  const lines = body?.lines;

  if (!Array.isArray(headers) || !Array.isArray(lines)) {
    return responseJson({ error: "Missing headers or lines arrays" }, 400);
  }

  if (headers.length + lines.length > 5000) {
    return responseJson({ error: "Maximum 5000 total rows per import" }, 400);
  }

  const validClients = await getValidClientSet(supabase);

  let headersCreated = 0;
  let linesCreated = 0;
  const errors = [];

  for (let i = 0; i < headers.length; i++) {
    const row = { ...(headers[i] || {}) };

    try {
      if (row.client_id && !validClients.has(row.client_id)) {
        throw new Error(`Client '${row.client_id}' does not exist`);
      }

      const pkVal = row[cfg.parentKey];
      if (pkVal) {
        const exists = await existsByFilters(supabase, cfg.headerTable, {
          [cfg.parentKey]: pkVal,
        });

        if (exists) {
          errors.push(`Header ${i + 1}: '${pkVal}' already exists - skipping (lines will still be added)`);
          continue;
        }
      }

      applyCreationTimestamp(row);

      const prepared = normalizeRowValues(row);
      if (prepared.error) {
        throw new Error(prepared.error);
      }
      if (Object.keys(prepared.row).length === 0) {
        throw new Error("No data provided");
      }

      const { error } = await supabase.from(cfg.headerTable).insert(prepared.row);
      if (error) throw error;

      headersCreated += 1;
    } catch (err) {
      errors.push(`Header ${i + 1}: ${sanitizeMessage(err)}`);
    }
  }

  const lineTableKey = cfg.lineTable === "order_lines" ? "order_lines" : "pre_advice_lines";
  const lineIdCfg = AUTO_LINE_ID_TABLES[lineTableKey];

  for (let i = 0; i < lines.length; i++) {
    const row = { ...(lines[i] || {}) };

    try {
      if (row.client_id && !validClients.has(row.client_id)) {
        throw new Error(`Client '${row.client_id}' does not exist`);
      }

      applyCreationTimestamp(row);

      if (lineIdCfg && !row[lineIdCfg.lineCol]) {
        const parentVal = row[lineIdCfg.parentCol];
        if (parentVal) {
          row[lineIdCfg.lineCol] = await getNextLineId(supabase, cfg.lineTable, lineIdCfg.parentCol, parentVal);
        }
      }

      const prepared = normalizeRowValues(row);
      if (prepared.error) {
        throw new Error(prepared.error);
      }
      if (Object.keys(prepared.row).length === 0) {
        throw new Error("No data provided");
      }

      const { error } = await supabase.from(cfg.lineTable).insert(prepared.row);
      if (error) throw error;

      linesCreated += 1;
    } catch (err) {
      errors.push(`Line ${i + 1}: ${sanitizeMessage(err)}`);
    }
  }

  const lcCfg = LINE_COUNT_TABLES[lineTableKey];
  if (lcCfg) {
    const parentValues = new Set(lines.map((r) => r?.[lcCfg.parentCol]).filter(Boolean));
    for (const parentValue of parentValues) {
      await updateLineCount(supabase, lcCfg, parentValue);
    }
  }

  if (headersCreated === 0 && linesCreated === 0) {
    return responseJson({ headersCreated: 0, linesCreated: 0, errors }, 400);
  }

  return responseJson({ headersCreated, linesCreated, errors });
}

async function handleDeleteData(supabase, tableKey, request) {
  if (NO_DELETE_TABLES.includes(tableKey)) {
    return responseJson({ error: "Deleting from this table is not allowed" }, 403);
  }

  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  const pks = TABLE_PKS[tableKey];
  if (!pks || pks.length === 0) {
    return responseJson({ error: "No primary key defined for this table" }, 400);
  }

  const body = await parseRequestBody(request);
  const pkValues = body?.pkValues;

  if (!pkValues || typeof pkValues !== "object") {
    return responseJson({ error: "Missing pkValues in request body" }, 400);
  }

  if (!ensurePkValuesPresent(pks, pkValues)) {
    return responseJson({ error: "Missing primary key value(s)" }, 400);
  }

  for (const col of pks) {
    if (!isValidColumnName(col)) {
      return responseJson({ error: `Invalid column name: ${col}` }, 400);
    }
  }

  const lcCfg = LINE_COUNT_TABLES[tableKey];
  let parentValue = null;

  if (lcCfg) {
    const parentRow = await fetchOneByPk(supabase, tableName, pks, pkValues, lcCfg.parentCol);
    parentValue = parentRow ? parentRow[lcCfg.parentCol] : null;
  }

  let deleteQuery = supabase.from(tableName).delete();
  deleteQuery = applyPkFilters(deleteQuery, pks, pkValues);
  const { error } = await deleteQuery;
  if (error) throw error;

  if (lcCfg && parentValue !== null) {
    await updateLineCount(supabase, lcCfg, parentValue);
  }

  return responseJson({ success: true });
}

async function handleCount(supabase, tableKey) {
  const known = ensureKnownTable(tableKey);
  if (known.error) return known.error;
  const tableName = known.tableName;

  const total = await getCount(supabase.from(tableName).select("*", { head: true, count: "exact" }));
  return responseJson({ table: tableKey, total });
}

async function handleKpi(supabase, searchParams) {
  let year;
  let month;

  const monthParam = searchParams.get("month");
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parts = monthParam.split("-");
    year = parseIntSafe(parts[0]);
    month = parseIntSafe(parts[1]);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const mm = String(month).padStart(2, "0");
  const monthStart = `${year}-${mm}-01`;
  const nextMonth =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const ordersShipped = await getCount(
    supabase
      .from("order_header")
      .select("*", { head: true, count: "exact" })
      .eq("status", "Shipped")
      .gte("shipped_date", monthStart)
      .lt("shipped_date", nextMonth)
  );

  const shippedOrderRows = await fetchAllRows(
    () =>
      supabase
        .from("order_header")
        .select("order")
        .eq("status", "Shipped")
        .gte("shipped_date", monthStart)
        .lt("shipped_date", nextMonth),
    1000,
    200000
  );
  const shippedOrders = Array.from(new Set(shippedOrderRows.map((r) => r.order).filter(Boolean)));

  let qtyShipped = 0;
  if (shippedOrders.length > 0) {
    const chunks = chunkArray(shippedOrders, 200);
    for (const chunk of chunks) {
      const lineRows = await fetchAllRows(
        () => supabase.from("order_lines").select("qty_shipped").in("order", chunk),
        1000,
        200000
      );
      for (const row of lineRows) {
        qtyShipped += numSafe(row.qty_shipped, 0);
      }
    }
  }
  const linesShipped = qtyShipped;

  const preAdvicesReceived = await getCount(
    supabase
      .from("pre_advice")
      .select("*", { head: true, count: "exact" })
      .eq("status", "Received")
      .gte("receive_date", monthStart)
      .lt("receive_date", nextMonth)
  );

  const preAdviceRows = await fetchAllRows(
    () =>
      supabase
        .from("pre_advice")
        .select("pre_advice_id")
        .eq("status", "Received")
        .gte("receive_date", monthStart)
        .lt("receive_date", nextMonth),
    1000,
    200000
  );
  const preAdviceIds = Array.from(new Set(preAdviceRows.map((r) => r.pre_advice_id).filter(Boolean)));

  let linesReceived = 0;
  let qtyReceived = 0;
  if (preAdviceIds.length > 0) {
    const chunks = chunkArray(preAdviceIds, 200);
    for (const chunk of chunks) {
      const lineRows = await fetchAllRows(
        () => supabase.from("pre_advice_lines").select("qty_received").in("pre_advice_id", chunk),
        1000,
        200000
      );
      linesReceived += lineRows.length;
      for (const row of lineRows) {
        qtyReceived += numSafe(row.qty_received, 0);
      }
    }
  }

  const stockChecks = await getCount(
    supabase
      .from("inventory_transaction")
      .select("*", { head: true, count: "exact" })
      .eq("code", "Stock check")
      .gte("created_at", monthStart)
      .lt("created_at", nextMonth)
  );

  const inventoryRows = await fetchAllRows(
    () => supabase.from("inventory").select("qty_available,location"),
    1000,
    200000
  );

  let totalStockQty = 0;
  const usedLocationSet = new Set();
  for (const row of inventoryRows) {
    totalStockQty += numSafe(row.qty_available, 0);
    if (numSafe(row.qty_available, 0) > 0 && row.location) {
      usedLocationSet.add(row.location);
    }
  }

  const totalLocations = await getCount(supabase.from("location").select("*", { head: true, count: "exact" }));
  const usedLocations = usedLocationSet.size;

  return responseJson({
    month: `${year}-${mm}`,
    outbound: {
      ordersShipped,
      linesShipped: Math.trunc(linesShipped),
      qtyShipped: Math.trunc(qtyShipped),
    },
    inbound: {
      preAdvicesReceived,
      linesReceived,
      qtyReceived: Math.trunc(qtyReceived),
    },
    stockChecks,
    inventory: {
      totalStockQty: Math.trunc(totalStockQty),
    },
    locations: {
      total: totalLocations,
      used: usedLocations,
      empty: totalLocations - usedLocations,
    },
  });
}

async function handleApiRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const supabase = getSupabaseClient(env);

  if (request.method === "GET" && pathname === "/api/health") {
    return handleHealth(supabase);
  }

  if (request.method === "POST" && pathname === "/api/login") {
    return handleLogin(supabase, request, env);
  }

  const authError = await requireAuth(request, env);
  if (authError) return authError;

  if (request.method === "GET" && pathname === "/api/tables") {
    return responseJson(Object.keys(TABLES));
  }

  const tableBulkStatus = getPathParam(pathname, /^\/api\/data\/([^/]+)\/bulk-status$/);
  if (tableBulkStatus && request.method === "PUT") {
    return handleBulkStatus(supabase, tableBulkStatus, request);
  }

  const tableBulk = getPathParam(pathname, /^\/api\/data\/([^/]+)\/bulk$/);
  if (tableBulk && request.method === "POST") {
    return handleBulkCreate(supabase, tableBulk, request);
  }

  const tableKey = getPathParam(pathname, /^\/api\/data\/([^/]+)$/);
  if (tableKey) {
    if (request.method === "GET") {
      return handleGetData(supabase, tableKey, url.searchParams);
    }
    if (request.method === "PUT") {
      return handleUpdateData(supabase, tableKey, request);
    }
    if (request.method === "POST") {
      return handleCreateData(supabase, tableKey, request);
    }
    if (request.method === "DELETE") {
      return handleDeleteData(supabase, tableKey, request);
    }
  }

  const importMode = getPathParam(pathname, /^\/api\/import\/([^/]+)$/);
  if (importMode && request.method === "POST") {
    return handleImport(supabase, importMode, request);
  }

  const countTable = getPathParam(pathname, /^\/api\/count\/([^/]+)$/);
  if (countTable && request.method === "GET") {
    return handleCount(supabase, countTable);
  }

  if (request.method === "GET" && pathname === "/api/kpi") {
    return handleKpi(supabase, url.searchParams);
  }

  return responseJson({ error: "Not found" }, 404);
}

async function serveFrontendAsset(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return new Response("ASSETS binding is not configured.", { status: 500 });
  }

  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) return assetResponse;

  const url = new URL(request.url);
  if (url.pathname.includes(".")) return assetResponse;

  const indexUrl = new URL("/index.html", request.url);
  const indexRequest = new Request(indexUrl.toString(), request);
  return env.ASSETS.fetch(indexRequest);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request, env);
      }
      return await serveFrontendAsset(request, env);
    } catch (err) {
      return responseJson({ error: sanitizeMessage(err) }, 500);
    }
  },
};
