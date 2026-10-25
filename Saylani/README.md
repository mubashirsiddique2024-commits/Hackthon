# PeopleFlow HCM Lite — PHP + MySQL

This version removes **Node.js and Express**. The frontend uses `index.php`, `style.css`, and `script.js`; PHP handles the API, and MySQL stores employee, attendance, and leave data. PHP pages still contain HTML markup because PHP generates the page sent to the browser.

## Requirements
- XAMPP (Apache + PHP + MySQL/MariaDB) or a similar PHP/MySQL setup
- PHP with PDO MySQL enabled

## Setup with XAMPP (Windows)
1. Extract this folder into `C:\xampp\htdocs\peopleflow-php-mysql`.
2. Open the XAMPP Control Panel and start **Apache** and **MySQL**.
3. Open `http://localhost/phpmyadmin`.
4. Select **Import**, choose this project's `schema.sql`, and click **Import/Go**. This creates the `peopleflow` database and the three tables.
5. If your MySQL username/password is different from the XAMPP default, edit `config.php`. Defaults are user `root` and a blank password.
6. Open `http://localhost/peopleflow-php-mysql/`.
7. To test the API, open `http://localhost/peopleflow-php-mysql/api.php?route=/health`. It should return JSON showing `"engine":"MySQL"` and `"backend":"PHP"`.

## What is connected
- Employees: list, add, edit, and delete
- Attendance: list, check-in, check-out, and set status
- Leave requests: list, submit, approve, and reject

## Notes
- Do not double-click `index.php`; open it through `http://localhost/...` so PHP runs.
- Node.js, npm, Express, and MongoDB are not required for this version.
- Payroll, announcements, and the assistant remain frontend prototype features; they are not stored as database records.
- Existing MongoDB records are not automatically imported into MySQL.
- This is a learning/demo project. Authentication, role permissions, and production security controls are not included.
