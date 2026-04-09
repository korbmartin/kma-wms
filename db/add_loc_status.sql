CREATE TABLE IF NOT EXISTS location_status_codes (
    status_code VARCHAR(100) PRIMARY KEY
);

INSERT INTO location_status_codes (status_code) VALUES
    ('Unlocked'),
    ('Locked'),
    ('Inlocked'),
    ('Outlocked')
ON CONFLICT DO NOTHING;
