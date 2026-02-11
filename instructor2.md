# Project: Batch Party Payment Tracker & QR Generator

## 1. Project Objective
To create a local web-based system to register batch mates, upload payment slips, and generate a unique QR code for each person to verify their entry at the party.

---

## 2. Business Requirements (Functional)

### A. Participant Registration Form
* **Full Name:** To identify the participant.
* **Address:** For record-keeping/souvenirs.
* **Batch:** To identify which year/group they belong to.
* **Payment Slip Upload:** A file input to upload an image of the bank slip or transfer screenshot.

### B. Data Management
* **Database (Local):** Store all submitted data locally using Dexie.js.
* **Payment Status:** Ability to mark a record as "Verified" or "Pending".
* **Data Export:** Option to download the registered list as a JSON or CSV file.

### C. QR Code System
* **Automatic Generation:** Generate a QR code immediately after the form is saved.
* **QR Content:** The QR should contain a unique ID or a summary string (e.g., Name + Batch + Payment Status).
* **Downloadable Ticket:** Option to download or print the QR code as a "Digital Ticket".

---

## 3. Technical Requirements (Tech Stack)

* **UI Framework:** HTML5 & Tailwind CSS (via CDN for simplicity).
* **Language:** Vanilla JavaScript (ES6+).
* **Local Database:** **Dexie.js** (IndexedDB wrapper) for browser-side storage.
* **QR Library:** **QRCode.js** or **QR-Code-Styling** library.
* **Image Handling:** Convert uploaded slips to **Base64 strings** to store them inside Dexie.js.

---

## 4. Database Schema (Dexie.js)

Define the store as follows:
* **`participants`**: `++id, name, batch, address, payment_slip, qr_data, timestamp`

---

## 5. UI Structure & Features

### Page 1: Registration Form
* Clean, centered form using Tailwind's `max-w-md` class.
* Real-time validation (ensure all fields are filled).
* Image preview for the uploaded payment slip.

### Page 2: Success & QR Display
* A success message after submission.
* A visual QR code generated based on the entry.
* A "Download Ticket" button.

### Page 3: Admin Dashboard (Optional but recommended)
* A table showing all registered people.
* Search bar to find names quickly.
* View button to see the uploaded payment slip for verification.

---

## 6. Implementation Steps (Roadmap)

1.  [ ] **Setup:** Create `index.html` and link Tailwind CSS and Dexie.js.
2.  [ ] **DB Init:** Initialize Dexie and create the `participants` table.
3.  [ ] **Form Logic:** Capture input data and convert the image file to Base64.
4.  [ ] **Save Data:** Use `db.participants.add()` to save the details.
5.  [ ] **QR Logic:** Pass the unique ID or Name to the QR library to render the code.
6.  [ ] **View Records:** Create a simple list to display saved data from Dexie.
7.  [ ] **Export:** Add a function to backup the database.