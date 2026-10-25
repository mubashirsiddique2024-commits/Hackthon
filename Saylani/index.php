<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PeopleFlow — HCM Lite</title>
<link rel="stylesheet" href="./style.css?v=2">

</head>
<body>
<div class="shell">
<aside class="side" id="side">
  <div class="brand"><i>⌁</i>peopleflow<small>HCM LITE</small></div>
  <p class="cap">WORKSPACE</p>
  <nav class="nav">
    <button class="active" data-page="dashboard"><span class="ico">◫</span>Dashboard</button>
    <p class="cap spaced">PEOPLE</p>
    <button data-page="employees"><span class="ico">♙</span>Employees <span class="count" id="empcount">8</span></button>
    <button data-page="attendance"><span class="ico">◷</span>Attendance</button>
    <button data-page="leave"><span class="ico">▤</span>Leave management</button>
    <p class="cap spaced">OPERATIONS</p>
    <button data-page="payroll"><span class="ico">＄</span>Payroll</button>
    <button data-page="analytics"><span class="ico">▥</span>Analytics</button>
    <button data-page="announcements"><span class="ico">♧</span>Announcements</button>
    <p class="cap spaced">WORKSPACE</p>
    <button data-page="assistant"><span class="ico">✧</span>AI assistant <span class="count">AI</span></button>
    <button data-page="settings"><span class="ico">⚙</span>Settings</button>
  </nav>
  <div class="side-bottom"><div class="promo"><b>✦ Work smarter with AI</b><p>Get quick answers about your people and policies.</p><button data-goto="assistant">Explore assistant ↗</button></div><div class="user"><span class="avatar">AS</span><div><b>Alex Morgan</b><small>Administrator</small></div><span style="margin-left:auto;color:#8993a6">•••</span></div></div>
</aside>
<main class="main">
<header class="top"><button class="iconbtn hamb" id="hamb">☰</button><div class="crumb">Workspace <b id="crumb">/ Dashboard</b></div><div class="topright"><div class="search">⌕ <input id="globalsearch" placeholder="Search anything..." aria-label="Search anything"></div><button class="iconbtn" id="notifications" title="Notifications">♧</button><span class="avatar">AS</span></div></header>
<div class="content" id="content"></div>
<footer class="footer"><span>© 2026 PeopleFlow</span><span>● All systems operational</span><span>Made for people, built for progress.</span></footer>
</main></div>
<dialog class="modal" id="modal"><form id="modalform"><h2 id="modaltitle">Add employee</h2><div id="modalbody"></div><div class="modalactions"><button type="button" class="btn" id="cancelmodal">Cancel</button><button class="btn primary">Save changes ↗</button></div></form></dialog>
<div class="toastarea" id="toastarea"></div>
<script src="script.js" defer></script>
</body></html>
