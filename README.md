# Inventory Management System

A web-based inventory management system built with Node.js, Express, MySQL, and vanilla JavaScript.

## Features
- User registration & secure login (bcrypt + session)
- Role-based access (admin/user)
- Product management (CRUD) with image upload
- Stock operations (in, out, transfer)
- Dynamic categories
- Location management
- Dashboard with real-time stats and charts
- Reports (CSV export, low-stock alerts)
- User profile with edit functionality

## Getting Started

### Prerequisites
- Node.js (v16+)
- MySQL (XAMPP recommended)
- Git

### Installation
1. Clone the repository: `git clone https://github.com/KaziArifulKabir/inventory-management-system.git`
2. Install dependencies: `npm install`
3. Set up MySQL database (run the SQL script in `database.sql`)
4. Configure `server.js` with your MySQL credentials
5. Create `public/uploads` folder
6. Start the server: `node server.js`
7. Open `http://localhost:3000/login.html` in your browser.

## Default Login
Register a new user. To get admin privileges, manually change the `role` column in the `users` table to `admin`.
