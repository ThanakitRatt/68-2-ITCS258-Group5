 -- ============================
 -- Create Database
 -- ============================
DROP DATABASE IF EXISTS Group5_ICTHotel;
CREATE DATABASE IF NOT EXISTS Group5_ICTHotel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
 
 -- ============================
 -- Use Database
 -- ============================
USE Group5_ICTHotel;
 
 -- ============================
 -- Create Rooms Table
 -- ============================
CREATE TABLE Rooms (
   id INT AUTO_INCREMENT PRIMARY KEY,         -- Room ID
   name VARCHAR(100) NOT NULL,                -- Room name or number
   description TEXT,                          -- Room description
   capacity INT NOT NULL,                     -- Maximum guests
   price_per_night DECIMAL(10,2) NOT NULL,    -- Price per night
   image_url VARCHAR(255),                    -- Image URL or path
   is_active BOOLEAN DEFAULT TRUE,            -- Availability status
 
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     ON UPDATE CURRENT_TIMESTAMP
);
 
CREATE TABLE Users (
	id INT AUTO_INCREMENT PRIMARY KEY, 
	name VARCHAR(100) NOT NULL,  
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  Role ENUM('User', 'Admin') NOT NULL DEFAULT 'User'
);

Create TABLE Bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(id),
  room_id INT NOT NULL REFERENCES Rooms(id),
  check_in_date DATETIME NOT NULL,
  check_out_date DATETIME NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'CANCELLED', 'PAID') NOT NULL DEFAULT 'PENDING'
);

 -- ============================
 -- Create Notifications Table
 -- ============================
CREATE TABLE Notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  booking_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (booking_id) REFERENCES Bookings(id)
);

 -- ============================
 -- Insert Mock Users
 -- ============================
-- Admin User: admin@example.com / password123
INSERT INTO Users (name, email, password, Role) VALUES
('Admin User', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUmmVlFm', 'Admin');

-- Regular User: user@example.com / password123
INSERT INTO Users (name, email, password, Role) VALUES
('John Doe', 'user@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUmmVlFm', 'User'),
('Jane Smith', 'jane@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUmmVlFm', 'User');

 -- ============================
 -- Insert Mock Rooms
 -- ============================
INSERT INTO Rooms (name, description, capacity, price_per_night, image_url, is_active) VALUES
('Standard Room 101', 'Standard room with garden view', 2, 1800.00, '/images/room101.jpg', TRUE),
('Deluxe Room 201', 'Deluxe room with city view and balcony', 2, 2800.00, '/images/room201.jpg', TRUE),
('Family Room 301', 'Large family room suitable for 4 guests', 4, 4200.00, '/images/room301.jpg', TRUE),
('Suite Room 401', 'Luxury suite with living area and sea view', 3, 6500.00, '/images/room401.jpg', TRUE),
('Economy Room 102', 'Small economy room for budget travelers', 1, 1200.00, '/images/room102.jpg', TRUE);

