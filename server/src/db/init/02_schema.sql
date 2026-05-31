USE railway;

CREATE TABLE IF NOT EXISTS regions (
  id   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO regions (name) VALUES
  ('Cairns'), ('Gold Coast'), ('Noosa'), ('Whitsundays');

CREATE TABLE IF NOT EXISTS occupancy (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id     TINYINT UNSIGNED NOT NULL,
  date          DATE NOT NULL,
  occupancy_pct DECIMAL(6,4) NOT NULL,
  adr           DECIMAL(10,4) NOT NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id),
  UNIQUE KEY uq_region_date (region_id, date)
);

CREATE TABLE IF NOT EXISTS length_of_stay (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id          TINYINT UNSIGNED NOT NULL,
  date               DATE NOT NULL,
  avg_length_of_stay DECIMAL(8,4) NOT NULL,
  avg_booking_window DECIMAL(8,4) NOT NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id),
  UNIQUE KEY uq_los_region_date (region_id, date)
);

CREATE TABLE IF NOT EXISTS spend (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id  TINYINT UNSIGNED NOT NULL,
  date       DATE NOT NULL,
  category   VARCHAR(100) NOT NULL,
  spend      DECIMAL(14,4) NOT NULL,
  cards_seen INT NOT NULL,
  no_txns    INT NOT NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id),
  INDEX idx_spend_region_date (region_id, date)
);