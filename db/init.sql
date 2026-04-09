-- =====================================================================
--  WMS Database Schema
--  Auto-initialized by Docker on first run
-- =====================================================================

-- 1. CLIENTS (referenced by other tables)
CREATE TABLE IF NOT EXISTS clients (
    client_id       VARCHAR(50) PRIMARY KEY,
    client_name     VARCHAR(255),
    client_address  TEXT,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    town            VARCHAR(100),
    postcode        VARCHAR(20),
    address_1       VARCHAR(255),
    address_2       VARCHAR(255),
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255)
);

-- 2. TRANSACTION CODES (reference/lookup table)
CREATE TABLE IF NOT EXISTS transaction_codes (
    code VARCHAR(50) PRIMARY KEY
);

INSERT INTO transaction_codes (code) VALUES
    ('Stock check'),
    ('Allocate'),
    ('Pick'),
    ('Ship'),
    ('Order'),
    ('Delete'),
    ('Relocate'),
    ('Status Change')
ON CONFLICT DO NOTHING;

-- 3. LOCATION
CREATE TABLE IF NOT EXISTS location (
    location        VARCHAR(100) PRIMARY KEY,
    client_id       VARCHAR(50) REFERENCES clients(client_id),
    location_type   VARCHAR(50),
    check_string    VARCHAR(100),
    status          VARCHAR(50),
    volume          NUMERIC(12,4),
    weight          NUMERIC(12,4),
    height          NUMERIC(12,4),
    width           NUMERIC(12,4),
    depth           NUMERIC(12,4),
    sub_zone_1      VARCHAR(50),
    sub_zone_2      VARCHAR(50),
    aisle           VARCHAR(20),
    bay             VARCHAR(20),
    level           VARCHAR(20),
    position        VARCHAR(20),
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255)
);

-- 4. SKU
CREATE TABLE IF NOT EXISTS sku (
    sku             VARCHAR(100),
    description     TEXT,
    each_height     NUMERIC(12,4),
    each_width      NUMERIC(12,4),
    each_volume     NUMERIC(12,4),
    each_weight     NUMERIC(12,4),
    client_id       VARCHAR(50) REFERENCES clients(client_id),
    PRIMARY KEY (sku, client_id)
);

-- 5. ORDER HEADER
CREATE TABLE IF NOT EXISTS order_header (
    "order"             VARCHAR(100) PRIMARY KEY,
    client_id           VARCHAR(50) REFERENCES clients(client_id),
    instructions        TEXT,
    status              VARCHAR(50),
    order_date          DATE,
    order_time          TIME,
    order_weight        NUMERIC(12,4),
    order_volume        NUMERIC(12,4),
    number_of_lines     INTEGER,
    created_by          VARCHAR(100),
    creation_date       DATE,
    creation_time       TIME,
    shipped_date        DATE,
    shipped_time        TIME,
    customer_name       VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    town                VARCHAR(100),
    postcode            VARCHAR(20),
    address_1           VARCHAR(255),
    address_2           VARCHAR(255),
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255),
    deliver_by_date     DATE
);

-- 6. ORDER LINES
CREATE TABLE IF NOT EXISTS order_lines (
    "order"             VARCHAR(100) REFERENCES order_header("order") ON DELETE CASCADE,
    client_id           VARCHAR(50) REFERENCES clients(client_id),
    line_id             VARCHAR(50),
    notes               TEXT,
    sku                 VARCHAR(100),
    description         TEXT,
    qty_ordered         INTEGER DEFAULT 0,
    qty_allocated       INTEGER DEFAULT 0,
    qty_picked          INTEGER DEFAULT 0,
    qty_shipped         INTEGER DEFAULT 0,
    creation_date       DATE,
    creation_time       TIME,
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255),
    PRIMARY KEY ("order", line_id)
);

-- 7. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    id                  SERIAL PRIMARY KEY,
    client_id           VARCHAR(50) REFERENCES clients(client_id),
    sku                 VARCHAR(100),
    location            VARCHAR(100) REFERENCES location(location),
    qty_available       INTEGER DEFAULT 0,
    qty_allocated       INTEGER DEFAULT 0,
    tag_id              VARCHAR(100),
    lock_status         VARCHAR(50),
    description         TEXT,
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255)
);

-- 8. INVENTORY TRANSACTION
CREATE TABLE IF NOT EXISTS inventory_transaction (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(50) REFERENCES transaction_codes(code),
    type                VARCHAR(100),
    client_id           VARCHAR(50),
    sku                 VARCHAR(100),
    location            VARCHAR(100),
    tag_id              VARCHAR(100),
    description         TEXT,
    status              VARCHAR(50),
    qty                 INTEGER DEFAULT 0,
    "order"             VARCHAR(100),
    pre_advice_id       VARCHAR(100),
    order_line_id       VARCHAR(50),
    pre_advice_line_id  VARCHAR(50),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRE-ADVICE
CREATE TABLE IF NOT EXISTS pre_advice (
    pre_advice_id       VARCHAR(100) PRIMARY KEY,
    client_id           VARCHAR(50) REFERENCES clients(client_id),
    notes               TEXT,
    status              VARCHAR(50),
    receive_date        DATE,
    receive_time        TIME,
    finish_date         DATE,
    finish_time         TIME,
    number_of_lines     INTEGER,
    created_by          VARCHAR(100),
    creation_date       DATE,
    creation_time       TIME,
    last_updated_by     VARCHAR(100),
    last_update_date    DATE,
    last_update_time    TIME,
    name                VARCHAR(255),
    address_1           VARCHAR(255),
    phone               VARCHAR(50),
    address_2           VARCHAR(255),
    town                VARCHAR(100),
    postcode            VARCHAR(20),
    country             VARCHAR(100),
    email               VARCHAR(255),
    mobile              VARCHAR(50),
    vat_number          VARCHAR(100),
    customer_file_ref   VARCHAR(255),
    seal_number         VARCHAR(100),
    supplier_name       VARCHAR(255),
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255)
);

-- 10. PRE-ADVICE LINES
CREATE TABLE IF NOT EXISTS pre_advice_lines (
    pre_advice_id       VARCHAR(100) REFERENCES pre_advice(pre_advice_id) ON DELETE CASCADE,
    client_id           VARCHAR(50) REFERENCES clients(client_id),
    line_id             VARCHAR(50),
    notes               TEXT,
    sku                 VARCHAR(100),
    description         TEXT,
    qty_received        INTEGER DEFAULT 0,
    tag_id              VARCHAR(100),
    lock_code           VARCHAR(50),
    batch_number        VARCHAR(100),
    lot_po_number       VARCHAR(100),
    product_group       VARCHAR(100),
    creation_date       DATE,
    creation_time       TIME,
    user_defined_type_1 VARCHAR(255),
    user_defined_type_2 VARCHAR(255),
    user_defined_type_3 VARCHAR(255),
    user_defined_type_4 VARCHAR(255),
    user_defined_type_5 VARCHAR(255),
    PRIMARY KEY (pre_advice_id, line_id)
);

-- 11. LOCATION TYPE
CREATE TABLE IF NOT EXISTS location_type (
    type VARCHAR(100) PRIMARY KEY
);

-- 12. INVENTORY STATUS CODES
CREATE TABLE IF NOT EXISTS inventory_status_codes (
    status_code VARCHAR(100) PRIMARY KEY
);

-- 13. LOCATION STATUS CODES
CREATE TABLE IF NOT EXISTS location_status_codes (
    status_code VARCHAR(100) PRIMARY KEY
);

INSERT INTO location_status_codes (status_code) VALUES
    ('Unlocked'),
    ('Locked'),
    ('Inlocked'),
    ('Outlocked')
ON CONFLICT DO NOTHING;

-- 14. PRE-ADVICE STATUS CODES
CREATE TABLE IF NOT EXISTS pre_advice_status_codes (
    status_code VARCHAR(100) PRIMARY KEY
);

INSERT INTO pre_advice_status_codes (status_code) VALUES
    ('Incoming'),
    ('On-Site'),
    ('Received'),
    ('Completed')
ON CONFLICT DO NOTHING;

-- 15. ORDER STATUS CODES
CREATE TABLE IF NOT EXISTS order_header_status_codes (
    status_code VARCHAR(100) PRIMARY KEY
);

INSERT INTO order_header_status_codes (status_code) VALUES
    ('Ready'),
    ('Allocated'),
    ('Picked'),
    ('Loaded'),
    ('Shipped'),
    ('Locked')
ON CONFLICT DO NOTHING;
