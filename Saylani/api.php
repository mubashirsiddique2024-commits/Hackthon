<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/config.php';

function send_json($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail_request($message, $status = 400) { send_json(['error' => $message], $status); }
function read_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) fail_request('Invalid JSON request body.');
    return $data;
}
function clean_text($value, $field, $max = 160) {
    if (!is_string($value) || trim($value) === '') fail_request($field . ' is required.');
    $value = trim($value);
    if (mb_strlen($value) > $max) fail_request($field . ' must be ' . $max . ' characters or fewer.');
    return $value;
}
function valid_date($value, $field) {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) fail_request($field . ' must be a valid date in YYYY-MM-DD format.');
    $d = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$d || $d->format('Y-m-d') !== $value) fail_request($field . ' must be a valid date in YYYY-MM-DD format.');
    return $value;
}
function valid_id($id) { return is_string($id) && preg_match('/^[1-9]\d*$/', $id); }
function employee_data($body) {
    $name = clean_text($body['name'] ?? null, 'Name');
    $role = clean_text($body['role'] ?? null, 'Job title');
    $department = clean_text($body['department'] ?? null, 'Department');
    $email = strtolower(clean_text($body['email'] ?? null, 'Email', 254));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail_request('Enter a valid email address.');
    $status = $body['status'] ?? 'Active';
    if (!in_array($status, ['Active', 'On leave', 'Inactive'], true)) fail_request('Invalid employee status.');
    $salary = isset($body['salary']) && $body['salary'] !== '' ? filter_var($body['salary'], FILTER_VALIDATE_FLOAT) : 0;
    if ($salary === false || $salary < 0) fail_request('Salary must be a non-negative number.');
    $joined = isset($body['joined']) && trim((string)$body['joined']) !== '' ? valid_date((string)$body['joined'], 'Joined date') : date('Y-m-d');
    preg_match_all('/\b\pL/u', $name, $matches);
    $initials = strtoupper(mb_substr(str_replace(' ', '', implode('', $matches[0])), 0, 2));
    if ($initials === '') $initials = strtoupper(mb_substr($name, 0, 2));
    return compact('name', 'role', 'department', 'email', 'status', 'joined', 'salary', 'initials');
}
function output_row($row) {
    if (!$row) return $row;
    if (isset($row['id'])) $row['id'] = (string)$row['id'];
    if (isset($row['employeeId'])) $row['employeeId'] = (string)$row['employeeId'];
    if (isset($row['salary'])) $row['salary'] = (float)$row['salary'];
    return $row;
}
function employee_error(PDOException $e) {
    if ($e->getCode() === '23000') fail_request('An employee with this email already exists.', 409);
    throw $e;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = '/' . trim((string)($_GET['route'] ?? ''), '/');
$body = in_array($method, ['POST', 'PUT', 'PATCH'], true) ? read_body() : [];

try {
    if ($route === '/health' && $method === 'GET') {
        $pdo->query('SELECT 1'); send_json(['ok' => true, 'database' => 'peopleflow', 'engine' => 'MySQL', 'backend' => 'PHP']);
    }

    if ($route === '/employees' && $method === 'GET') {
        $rows = $pdo->query('SELECT * FROM employees ORDER BY createdAt DESC, name ASC')->fetchAll();
        send_json(array_map('output_row', $rows));
    }
    if ($route === '/employees' && $method === 'POST') {
        $d = employee_data($body);
        try {
            $stmt = $pdo->prepare('INSERT INTO employees (name,role,department,email,status,joined,salary,initials) VALUES (:name,:role,:department,:email,:status,:joined,:salary,:initials)');
            $stmt->execute($d);
            $stmt = $pdo->prepare('SELECT * FROM employees WHERE id=?'); $stmt->execute([$pdo->lastInsertId()]);
            send_json(output_row($stmt->fetch()), 201);
        } catch (PDOException $e) { employee_error($e); }
    }
    if (preg_match('#^/employees/(\d+)$#', $route, $m)) {
        $id = $m[1];
        if ($method === 'PUT') {
            $d = employee_data($body); $d['id'] = $id;
            try {
                $stmt = $pdo->prepare('UPDATE employees SET name=:name,role=:role,department=:department,email=:email,status=:status,joined=:joined,salary=:salary,initials=:initials WHERE id=:id');
                $stmt->execute($d);
                $stmt = $pdo->prepare('SELECT * FROM employees WHERE id=?'); $stmt->execute([$id]); $row = $stmt->fetch();
                if (!$row) fail_request('Employee not found.', 404);
                send_json(output_row($row));
            } catch (PDOException $e) { employee_error($e); }
        }
        if ($method === 'DELETE') {
            $stmt = $pdo->prepare('DELETE FROM employees WHERE id=?'); $stmt->execute([$id]);
            if (!$stmt->rowCount()) fail_request('Employee not found.', 404);
            send_json(['ok' => true]);
        }
    }

    if ($route === '/attendance' && $method === 'GET') {
        if (isset($_GET['date']) && $_GET['date'] !== '') {
            $date = valid_date((string)$_GET['date'], 'Date');
            $stmt = $pdo->prepare('SELECT * FROM attendance WHERE date=? ORDER BY date DESC, updatedAt DESC LIMIT 1000'); $stmt->execute([$date]);
        } else {
            $stmt = $pdo->query('SELECT * FROM attendance ORDER BY date DESC, updatedAt DESC LIMIT 1000');
        }
        send_json(array_map('output_row', $stmt->fetchAll()));
    }
    if ($route === '/attendance' && $method === 'POST') {
        $employeeId = (string)($body['employeeId'] ?? '');
        if (!valid_id($employeeId)) fail_request('Invalid employee ID.');
        $stmt = $pdo->prepare('SELECT id,name FROM employees WHERE id=?'); $stmt->execute([$employeeId]); $person = $stmt->fetch();
        if (!$person) fail_request('Employee not found.', 404);
        $date = valid_date((string)($body['date'] ?? date('Y-m-d')), 'Date');
        $stmt = $pdo->prepare('SELECT * FROM attendance WHERE employeeId=? AND date=?'); $stmt->execute([$employeeId, $date]); $old = $stmt->fetch();
        $checkIn = $old['checkIn'] ?? null; $checkOut = $old['checkOut'] ?? null; $status = $old['status'] ?? null; $now = date('Y-m-d H:i:s');
        $kind = $body['kind'] ?? '';
        if ($kind === 'check-in') {
            if ($old && $checkIn) fail_request('This employee has already checked in today.', 409);
            $checkIn = $now; $status = 'Present';
        } elseif ($kind === 'check-out') {
            if (!$old || !$checkIn) fail_request('Check in before checking out.');
            if ($checkOut) fail_request('This employee has already checked out today.', 409);
            $checkOut = $now; $status = 'Present';
        } elseif ($kind === 'set-status') {
            if (!in_array($body['status'] ?? '', ['Present','Absent','On leave'], true)) fail_request('Choose Present, Absent, or On leave.');
            $status = $body['status']; if ($status === 'Present' && !$checkIn) $checkIn = $now;
        } else fail_request('Choose check-in, check-out, or set-status.');
        if ($old) {
            $stmt = $pdo->prepare('UPDATE attendance SET employeeName=?,checkIn=?,checkOut=?,status=? WHERE id=?');
            $stmt->execute([$person['name'], $checkIn, $checkOut, $status, $old['id']]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO attendance (employeeId,employeeName,date,checkIn,checkOut,status) VALUES (?,?,?,?,?,?)');
            $stmt->execute([$employeeId,$person['name'],$date,$checkIn,$checkOut,$status]);
        }
        $stmt = $pdo->prepare('SELECT * FROM attendance WHERE employeeId=? AND date=?'); $stmt->execute([$employeeId,$date]);
        send_json(output_row($stmt->fetch()), $old ? 200 : 201);
    }

    if ($route === '/leaves' && $method === 'GET') {
        $rows = $pdo->query('SELECT * FROM leaves ORDER BY createdAt DESC LIMIT 1000')->fetchAll();
        send_json(array_map('output_row', $rows));
    }
    if ($route === '/leaves' && $method === 'POST') {
        $employeeId = (string)($body['employeeId'] ?? '');
        if (!valid_id($employeeId)) fail_request('Invalid employee ID.');
        $stmt = $pdo->prepare('SELECT id,name FROM employees WHERE id=?'); $stmt->execute([$employeeId]); $person = $stmt->fetch();
        if (!$person) fail_request('Employee not found.', 404);
        $type = clean_text($body['type'] ?? null, 'Leave type', 80);
        $reason = clean_text($body['reason'] ?? null, 'Reason', 1000);
        $from = valid_date((string)($body['from'] ?? ''), 'Start date'); $to = valid_date((string)($body['to'] ?? ''), 'End date');
        if ($to < $from) fail_request('End date must be on or after start date.');
        $days = (int)((strtotime($to) - strtotime($from)) / 86400) + 1; $name = $person['name'];
        $stmt = $pdo->prepare('INSERT INTO leaves (employeeId,employee,employeeName,type,`from`,`to`,days,reason,status) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([$employeeId,$name,$name,$type,$from,$to,$days,$reason,'Pending']);
        $stmt = $pdo->prepare('SELECT * FROM leaves WHERE id=?'); $stmt->execute([$pdo->lastInsertId()]);
        send_json(output_row($stmt->fetch()), 201);
    }
    if (preg_match('#^/leaves/(\d+)$#', $route, $m) && $method === 'PATCH') {
        $id = $m[1]; $status = $body['status'] ?? '';
        if (!in_array($status, ['Approved','Rejected'], true)) fail_request('Status must be Approved or Rejected.');
        $stmt = $pdo->prepare('UPDATE leaves SET status=? WHERE id=? AND status=?'); $stmt->execute([$status,$id,'Pending']);
        if (!$stmt->rowCount()) fail_request('Pending leave request not found.', 404);
        $stmt = $pdo->prepare('SELECT * FROM leaves WHERE id=?'); $stmt->execute([$id]); send_json(output_row($stmt->fetch()));
    }

    if (str_starts_with($route, '/employees/') || str_starts_with($route, '/leaves/')) fail_request('Invalid request or method.', 400);
    fail_request('API endpoint not found.', 404);
} catch (Throwable $e) {
    error_log('PeopleFlow API error: ' . $e->getMessage());
    send_json(['error' => 'Server error. Check your PHP/Apache error log.'], 500);
}
