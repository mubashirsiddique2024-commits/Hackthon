const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
// App data comes from the PHP API. MySQL is the source of truth.
let employees = [];
let leaves = [];
let attendanceRecords = [];
let page = "dashboard";
let leaveTab = "All requests";
let query = "";

const API_BASE = "api.php?route=";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || "The request could not be completed.");
  return result;
}

async function refreshData() {
  const [employeeData, leaveData, attendanceData] = await Promise.all([
    apiRequest("/employees"),
    apiRequest("/leaves"),
    apiRequest("/attendance"),
  ]);
  employees = employeeData;
  leaves = leaveData;
  attendanceRecords = attendanceData;
}

function getToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
}

function attendanceForToday() {
  return attendanceRecords.filter((record) => record.date === getToday());
}

function attendanceCounts() {
  const records = attendanceForToday();
  const approvedLeaves = leaves.filter(
    (leave) =>
      leave.status === "Approved" &&
      leave.from <= getToday() &&
      leave.to >= getToday(),
  );
  const present = records.filter(
    (record) => record.status === "Present",
  ).length;
  const onLeave = approvedLeaves.length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const checked = present + absent + onLeave;
  const total = employees.filter(
    (employee) => employee.status !== "Inactive",
  ).length;
  return {
    present,
    onLeave,
    absent,
    notCheckedIn: Math.max(0, total - checked),
    total,
  };
}

function showError(error) {
  console.error(error);
  toast(error.message || "Something went wrong. Please try again.");
}

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function money(n) {
  return "Rs. " + Number(n || 0).toLocaleString("en-PK");
}
function person(e, sub = "") {
  return `<div class="person"><span class="avatar">${esc(
    e.initials ||
      e.name
        .split(" ")
        .map((x) => x[0])
        .join("")
        .slice(0, 2),
  )}</span><div><b>${esc(e.name || e.employee)}</b><small>${esc(sub || e.role || "")}</small></div></div>`;
}
function pill(s) {
  let c =
    s === "Pending" || s === "On leave"
      ? "pending"
      : s === "Rejected" || s === "Absent"
        ? "bad"
        : "";
  return `<span class="pill ${c}">${esc(s)}</span>`;
}
function heading(ey, t, d, actions = "") {
  return `<div class="heading"><div><div class="eyebrow">${ey}</div><h1>${t}</h1><p>${d}</p></div><div class="actions">${actions}</div></div>`;
}
function stat(label, n, icon, trend = "↗", foot = "vs last month") {
  return `<article class="stat"><div class="stathead">${label}<span class="staticon">${icon}</span></div><div class="number">${n}</div><div class="foot"><span class="up">${trend}</span>${foot}</div></article>`;
}
function button(text, action, primary = false) {
  return `<button class="btn ${primary ? "primary" : ""}" data-action="${action}">${text}</button>`;
}
function table(rows, heads) {
  return `<div class="tablewrap"><table class="table"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function render() {
  $("#empcount").textContent = employees.length;
  $("#crumb").textContent =
    "/ " +
    ({
      dashboard: "Dashboard",
      employees: "Employees",
      attendance: "Attendance",
      leave: "Leave management",
      payroll: "Payroll",
      analytics: "Analytics",
      assistant: "AI assistant",
      announcements: "Announcements",
      settings: "Settings",
    }[page] || "Dashboard");
  $$(".nav button[data-page]").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === page),
  );
  const views = {
    dashboard: dashboard,
    employees: employeePage,
    attendance: attendancePage,
    leave: leavePage,
    payroll: payrollPage,
    analytics: analyticsPage,
    assistant: assistantPage,
    announcements: announcementsPage,
    settings: settingsPage,
  };
  $("#content").innerHTML = views[page]();
  bind();
}
function dashboard() {
  let counts = attendanceCounts(),
    present = counts.present,
    pending = leaves.filter((l) => l.status === "Pending").length,
    active = employees.filter((e) => e.status === "Active").length;
  return (
    heading(
      new Date()
        .toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase(),
      "Good morning, Alex <span style='color:#766af0'>✦</span>",
      "Here’s what’s happening with your team today.",
      button("↓ Export report", "export") +
        button("＋ Add employee", "add", true),
    ) +
    `<div class="stats">${stat("Total employees", employees.length, "♙", "+12.5%")}${stat("Present today", present, "◷", "+4.2%")}${stat("On leave", counts.onLeave, "▤")}${stat("Pending approvals", pending, "◉", pending + " waiting", "leave requests")}</div>
 <div class="grid2"><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Workforce overview</h2><div class="sub">Employee growth over the last 6 months</div></div><select class="filter"><option>Last 6 months</option><option>Last 12 months</option></select></div><div class="chart"><div class="legend"><span><i class="dot" style="background:#766af0"></i>Total employees</span><span><i class="dot" style="background:#bdc9f7"></i>New hires</span></div><svg viewBox="0 0 600 230"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#766af0" stop-opacity=".2"/><stop offset="1" stop-color="#766af0" stop-opacity="0"/></linearGradient></defs>${[30, 70, 110, 150, 190].map((y) => `<line x1="42" y1="${y}" x2="585" y2="${y}" stroke="#eef0f5" stroke-dasharray="3 4"/>`).join("")}<path d="M45 165 L150 146 L255 127 L360 103 L465 78 L565 49 L565 190 L45 190Z" fill="url(#fill)"/><path d="M45 165 L150 146 L255 127 L360 103 L465 78 L565 49" fill="none" stroke="#766af0" stroke-width="3" stroke-linecap="round"/> <path d="M45 180 L150 172 L255 163 L360 151 L465 145 L565 132" fill="none" stroke="#bdc9f7" stroke-width="2.5"/>${["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m, i) => `<text x="${45 + i * 104}" y="216" fill="#9da6b5" font-size="10" text-anchor="middle">${m}</text>`).join("")}</svg></div></section>
 <section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Today’s attendance</h2><div class="sub">A quick look at your team’s day</div></div><button class="link" data-goto="attendance">View details ↗</button></div><div class="donutrow"><div class="donut"><div><strong>${counts.total ? Math.round((counts.present / counts.total) * 100) : 0}%</strong><small>attendance</small></div></div><div class="legends"><div class="legendrow"><i class="dot" style="background:#766af0"></i>Present <b>${counts.present}</b></div><div class="legendrow"><i class="dot" style="background:#dce4ff"></i>On leave <b>${counts.onLeave}</b></div><div class="legendrow"><i class="dot" style="background:#f8c77f"></i>Absent <b>${counts.absent}</b></div><div class="legendrow"><i class="dot" style="background:#e9edf3"></i>Not checked in <b>${counts.notCheckedIn}</b></div></div></div></section></div>
 <div class="gridbottom"><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Recently added employees</h2><div class="sub">Latest additions to your team</div></div><button class="link" data-goto="employees">View all ↗</button></div>${table(
   employees
     .slice(-4)
     .reverse()
     .map(
       (e) =>
         `<tr><td>${person(e, e.role)}</td><td>${e.department}</td><td>${pill(e.status)}</td><td>${esc(formatDate(e.joined))}</td></tr>`,
     )
     .join(""),
   ["EMPLOYEE", "DEPARTMENT", "STATUS", "JOINED"],
 )}<div class="tablefoot">Showing ${Math.min(4, employees.length)} of ${employees.length} employees <button class="link" data-goto="employees">Open directory →</button></div></section>
 <section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Quick actions</h2><div class="sub">Shortcuts to common tasks</div></div></div><div class="quick"><button data-action="add"><span class="qicon">♙</span><b>Add employee</b><small>Create a new profile</small></button><button data-goto="leave"><span class="qicon" style="background:#fff3e2;color:#d58a32">▤</span><b>Review leave</b><small>${pending} requests pending</small></button><button data-goto="payroll"><span class="qicon" style="background:#e8f8f2;color:#20a980">＄</span><b>Run payroll</b><small>Review this month’s pay</small></button><button data-goto="assistant"><span class="qicon" style="background:#eaf4ff;color:#438bd3">✧</span><b>Ask AI assistant</b><small>Get people insights</small></button></div></section></div>`
  );
}
function employeePage() {
  let deps = [...new Set(employees.map((e) => e.department))],
    list = employees.filter((e) =>
      (e.name + " " + e.role + " " + e.department + " " + e.email)
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    heading(
      "PEOPLE DIRECTORY",
      "Employees",
      "Manage employee profiles, teams, and employment details.",
      button("↓ Export CSV", "export") + button("＋ Add employee", "add", true),
    ) +
    `<div class="stats">${stat("Total employees", employees.length, "♙")}${stat("Active employees", employees.filter((e) => e.status === "Active").length, "✓")}${stat("Departments", deps.length, "▦")}${stat("On leave", employees.filter((e) => e.status === "On leave").length, "◷")}</div><div class="toolbar"><div class="search">⌕ <input id="empsearch" value="${esc(query)}" placeholder="Search employees..."></div><select id="depfilter"><option>All departments</option>${deps.map((d) => `<option>${d}</option>`).join("")}</select><select id="statusfilter"><option>All statuses</option><option>Active</option><option>On leave</option><option>Inactive</option></select><span class="grow"></span><span class="foot">${list.length} employees</span></div><section class="panel">${table(list.map((e) => `<tr><td>${person(e, e.role)}</td><td>${e.department}</td><td>${e.email}</td><td>${pill(e.status)}</td><td>${esc(formatDate(e.joined))}</td><td><button class="link" data-action="edit" data-id="${e.id}">Edit</button> <button class="link" data-action="delete" data-id="${e.id}">×</button></td></tr>`).join(""), ["EMPLOYEE", "DEPARTMENT", "EMAIL", "STATUS", "JOINED DATE", "ACTIONS"])}<div class="tablefoot">Showing ${list.length} employees <span>Live data from MySQL</span></div></section>`
  );
}
function attendancePage() {
  const counts = attendanceCounts();
  const todayRecords = attendanceForToday();
  const rows = todayRecords
    .map((record) => {
      const employee = employees.find(
        (item) => String(item.id) === String(record.employeeId),
      );
      const name = employee?.name || record.employeeName || "Unknown employee";
      const department = employee?.department || "—";
      const hours =
        record.checkIn && record.checkOut
          ? `${Math.max(0, Math.round((new Date(record.checkOut) - new Date(record.checkIn)) / 36000) / 100).toFixed(2)}h`
          : record.checkIn
            ? "In progress"
            : "—";
      return `<tr data-name="${esc(name.toLowerCase())}" data-status="${esc(record.status)}">
            <td>${person(
              {
                name,
                initials: name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2),
              },
              department,
            )}</td>
            <td>${esc(department)}</td><td>${record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            <td>${record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
            <td>${hours}</td><td>${pill(record.status)}</td></tr>`;
    })
    .join("");
  const attendanceRate = counts.total
    ? Math.round((counts.present / counts.total) * 100)
    : 0;
  return (
    heading(
      "TIME & ATTENDANCE",
      "Attendance",
      "Monitor daily attendance, check-in times, and working hours.",
      button("↓ Export report", "export-att") +
        button("◷ Check in / out", "checkin", true),
    ) +
    `<div class="stats">${stat("Present today", counts.present, "✓")}${stat("Absent today", counts.absent, "×")}${stat("On leave", counts.onLeave, "▤")}${stat("Attendance rate", attendanceRate + "%", "◷")}</div>
        <div class="toolbar"><div class="search">⌕ <input id="attsearch" placeholder="Search by employee..."></div><select id="attstatus"><option>All statuses</option><option>Present</option><option>Absent</option><option>On leave</option></select><span class="grow"></span><span class="foot">${formatDate(getToday())}</span></div>
        <section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Daily attendance log</h2><div class="sub">Employee check-in and check-out records</div></div>${pill("Database records")}</div><div id="attrows">${table(rows, ["EMPLOYEE", "DEPARTMENT", "CHECK IN", "CHECK OUT", "WORKING HOURS", "STATUS"])}</div><div class="tablefoot">Attendance saved to MySQL <button class="link" data-action="markabsent">Update attendance →</button></div></section>`
  );
}
function leavePage() {
  let list = leaves.filter(
    (l) => leaveTab === "All requests" || l.status === leaveTab,
  );
  return (
    heading(
      "TIME OFF",
      "Leave management",
      "Review leave requests and keep track of time off.",
      button("＋ New request", "newleave", true),
    ) +
    `<div class="balancegrid"><div class="panel balance"><label>Annual leave balance</label><strong>14 <small style="font-size:12px;color:#9aa3b3">/ 20 days</small></strong><p>6 days used this year</p><div class="track"><span style="width:70%"></span></div></div><div class="panel balance"><label>Pending requests</label><strong>${leaves.filter((l) => l.status === "Pending").length}</strong><p>Waiting for manager review</p><div class="track"><span style="width:${leaves.filter((l) => l.status === "Pending").length * 25}%;background:#f0a44b"></span></div></div><div class="panel balance"><label>Approved requests</label><strong>${leaves.filter((l) => l.status === "Approved").length}</strong><p>Approved in this list</p><div class="track"><span style="width:40%;background:#20a980"></span></div></div></div><div class="tabs">${["All requests", "Pending", "Approved", "Rejected"].map((t) => `<button class="tab ${leaveTab === t ? "active" : ""}" data-tab="${t}">${t}${t === "Pending" ? " (" + leaves.filter((l) => l.status === "Pending").length + ")" : ""}</button>`).join("")}</div><section class="panel">${table(
      list
        .map(
          (l) =>
            `<tr><td>${person(
              {
                name: l.employee,
                initials: l.employee
                  .split(" ")
                  .map((x) => x[0])
                  .join(""),
              },
              l.employee,
            )}</td><td>${l.type}</td><td>${esc(formatDate(l.from))}${l.from !== l.to ? " → " + esc(formatDate(l.to)) : ""}</td><td>${l.days} day(s)</td><td>${esc(l.reason)}</td><td>${pill(l.status)}</td><td>${l.status === "Pending" ? `<button class="link" data-action="approve" data-id="${l.id}">✓</button> <button class="link" data-action="reject" data-id="${l.id}">×</button>` : "—"}</td></tr>`,
        )
        .join(""),
      [
        "EMPLOYEE",
        "LEAVE TYPE",
        "DATES",
        "DURATION",
        "REASON",
        "STATUS",
        "ACTIONS",
      ],
    )}<div class="tablefoot">${list.length} request(s) shown</div></section>`
  );
}
function payrollPage() {
  let total = employees
    .filter((e) => e.status !== "Inactive")
    .reduce((s, e) => s + e.salary, 0);
  return (
    heading(
      "COMPENSATION",
      "Payroll",
      "Review salary records and prepare monthly payroll.",
      button("↓ Export payroll", "export-payroll") +
        button("Run payroll ↗", "runpay", true),
    ) +
    `<div class="hero"><div class="eyebrow">OCTOBER 2026 · PAYROLL SUMMARY</div><h2>${money(total)}</h2><p>Estimated gross payroll for ${employees.filter((e) => e.status !== "Inactive").length} active employee records</p><div style="display:flex;gap:30px;margin-top:18px;font-size:11px"><span>Employees <b>${employees.filter((e) => e.status !== "Inactive").length}</b></span><span>Frequency <b>Monthly</b></span><span>Next pay date <b>Oct 31, 2026</b></span></div></div><div class="stats">${stat("Gross payroll", money(total), "＄", "Monthly")}${stat("Average salary", money(total / Math.max(employees.length, 1)), "↗", "Per employee")}${stat("Payroll status", "Draft", "◷", "Not processed")}${stat("Payslips ready", "0", "▤", "After processing")}</div><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Employee salary register</h2><div class="sub">Demo figures — confirm amounts before processing</div></div><span class="foot">October 2026</span></div>${table(
      employees
        .filter((e) => e.status !== "Inactive")
        .map(
          (e) =>
            `<tr><td>${person(e, e.role)}</td><td>${e.department}</td><td>${money(e.salary)}</td><td>${money(5000)}</td><td>${money(Math.round(e.salary * 0.05))}</td><td><b style="color:#29334a">${money(e.salary + 5000 - Math.round(e.salary * 0.05))}</b></td><td>${pill("Pending")}</td></tr>`,
        )
        .join(""),
      [
        "EMPLOYEE",
        "DEPARTMENT",
        "BASE SALARY",
        "ALLOWANCES",
        "DEDUCTIONS",
        "EST. NET PAY",
        "STATUS",
      ],
    )}<div class="tablefoot">Illustrative estimates only, not tax advice.</div></section>`
  );
}
function analyticsPage() {
  let d = {};
  employees.forEach((e) => (d[e.department] = (d[e.department] || 0) + 1));
  return (
    heading(
      "PEOPLE INSIGHTS",
      "Analytics",
      "Understand your workforce with a quick overview of key metrics.",
      button("↓ Export report", "export") +
        button("Generate report ↗", "report", true),
    ) +
    `<div class="stats">${stat("Headcount", employees.length, "♙")}${stat("Active workforce", Math.round((employees.filter((e) => e.status === "Active").length / employees.length) * 100) + "%", "✓")}${stat("Departments", Object.keys(d).length, "▦")}${stat("Pending leave", leaves.filter((l) => l.status === "Pending").length, "◷")}</div><div class="twocol"><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Employees by department</h2><div class="sub">Team size distribution</div></div></div><div class="dept">${Object.entries(
      d,
    )
      .sort((a, b) => b[1] - a[1])
      .map(
        ([k, v]) =>
          `<div class="deptrow"><span>${k}</span><div class="bar"><span style="width:${(v / employees.length) * 100}%"></span></div><b>${v}</b></div>`,
      )
      .join(
        "",
      )}</div></section><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Employment status</h2><div class="sub">Current employee records</div></div></div><div class="dept">${[
      "Active",
      "On leave",
      "Inactive",
    ]
      .map((s) => {
        let n = employees.filter((e) => e.status === s).length;
        return `<div class="deptrow"><span>${s}</span><div class="bar"><span style="width:${(n / employees.length) * 100}%;background:${s === "Active" ? "#20a980" : s === "On leave" ? "#f0a44b" : "#aab3c2"}"></span></div><b>${n}</b></div>`;
      })
      .join("")}</div></section></div>`
  );
}
function assistantPage() {
  return (
    heading(
      "PEOPLEFLOW AI",
      "AI assistant",
      "Ask questions about your team, leave, attendance, and company policies.",
      button("↻ New conversation", "newchat"),
    ) +
    `<div class="chatlayout"><section class="panel chat"><div class="chathead"><span class="orb">✧</span><div><b>PeopleFlow assistant</b><small>● Ready to help · Demo mode</small></div></div><div class="messages" id="messages"><div class="bubble"><b>Hi Alex! 👋</b><br>I can summarize the current employee records, leave requests, attendance, or explain this prototype. Try a prompt from the right.</div></div><form class="compose" id="chatform"><input id="chatinput" placeholder="Ask about your people..."><button>↑</button></form></section><section class="panel"><div class="panelhead"><div><h2 class="paneltitle">Suggested prompts</h2><div class="sub">Try asking something like</div></div></div><div class="prompts">${["Give me a team summary", "Which departments have the most employees?", "How many leave requests are pending?", "Summarize attendance today", "What is the estimated monthly payroll?"].map((x) => `<button data-prompt="${x}">✧ &nbsp;${x}</button>`).join("")}</div><div style="margin:0 18px 18px;padding:13px;background:#fff8e9;color:#a17b3e;border-radius:8px;font-size:10px;line-height:1.6"><b>Demo limitation</b><br>This uses local demo logic, not a connected AI model. Connect AI through a secured backend before using real employee data.</div></section></div>`
  );
}
const announcements = [
  [
    "COMPANY NEWS",
    "Welcome to our new workspace",
    "We’re excited to share that our team workspace has been refreshed. Take a look around and update your profile details.",
    "Oct 20, 2026",
  ],
  [
    "PEOPLE & CULTURE",
    "October team celebration",
    "Join us on Friday for a casual team get-together to celebrate the milestones and great work from this month.",
    "Oct 18, 2026",
  ],
  [
    "POLICY UPDATE",
    "Updated leave request guidelines",
    "Please submit planned leave requests at least five working days in advance. Your manager will review requests in the employee portal.",
    "Oct 15, 2026",
  ],
];
function announcementsPage() {
  return (
    heading(
      "TEAM COMMUNICATIONS",
      "Announcements",
      "Keep everyone informed with company updates and important notices.",
      button("＋ New announcement", "announce", true),
    ) +
    `<div class="cards">${announcements.map((a) => `<article class="panel announce"><label>${a[0]}</label><h3>${a[1]}</h3><p>${a[2]}</p><div class="tablefoot">People Team · ${a[3]}</div></article>`).join("")}</div>`
  );
}
function settingsPage() {
  return (
    heading(
      "CONFIGURATION",
      "Settings",
      "Manage your workspace preferences and company information.",
      button("Save changes ↗", "savesettings", true),
    ) +
    `<div class="settings"><section class="panel settingsnav"><button class="active">Company profile</button><button data-action="pref">Preferences</button><button data-action="security">Security & access</button><button data-action="policy">Leave policies</button></section><section class="panel settingsbody"><h3>Company profile</h3><p>Basic information about your organization.</p><div class="formgrid"><div class="field"><label>Company name</label><input id="company" value="${esc(localStorage.getItem("pf_company") || "PeopleFlow Technologies")}"></div><div class="field"><label>Industry</label><select><option>Technology</option><option>Education</option><option>Healthcare</option></select></div><div class="field"><label>Company email</label><input value="hello@peopleflow.demo"></div><div class="field"><label>Timezone</label><select><option>Asia/Karachi (PKT)</option><option>UTC</option></select></div></div><div class="tablefoot">Security and role permissions must be enforced by the backend in the final project.</div></section></div>`
  );
}
function bind() {
  $("#empsearch")?.addEventListener("input", (e) => {
    query = e.target.value;

    let pos = e.target.selectionStart;
    render();
    $("#empsearch").focus();
    $("#empsearch").setSelectionRange(pos, pos);
  });
  $("#depfilter")?.addEventListener("change", (e) => {
    let val = e.target.value;
    $$(".table tbody tr").forEach(
      (r) =>
        (r.style.display =
          val === "All departments" || r.textContent.includes(val)
            ? ""
            : "none"),
    );
  });
  $("#statusfilter")?.addEventListener("change", (e) => {
    let val = e.target.value;
    $$(".table tbody tr").forEach(
      (r) =>
        (r.style.display =
          val === "All statuses" || r.textContent.includes(val) ? "" : "none"),
    );
  });
  $("#attsearch")?.addEventListener("input", filterAtt);
  $("#attstatus")?.addEventListener("change", filterAtt);
  $$("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        leaveTab = b.dataset.tab;
        render();
      }),
  );
  $$("[data-prompt]").forEach(
    (b) => (b.onclick = () => sendChat(b.dataset.prompt)),
  );
  $("#chatform")?.addEventListener("submit", (e) => {
    e.preventDefault();

    let v = $("#chatinput").value.trim();
    if (v) {
      $("#chatinput").value = "";
      sendChat(v);
    }
  });
}
function filterAtt() {
  let q = $("#attsearch").value.toLowerCase(),
    s = $("#attstatus").value;
  $$("#attrows tbody tr").forEach(
    (r) =>
      (r.style.display =
        r.dataset.name.includes(q) &&
        (s === "All statuses" || r.dataset.status === s)
          ? ""
          : "none"),
  );
}
function toast(s) {
  let n = document.createElement("div");
  n.className = "toast";
  n.textContent = s;
  $("#toastarea").append(n);
  setTimeout(() => n.remove(), 3000);
}
function showModal(title, body, callback) {
  $("#modaltitle").textContent = title;
  $("#modalbody").innerHTML = body;
  $("#modal").showModal();
  $("#modalform").onsubmit = async (event) => {
    event.preventDefault();
    const submitButton = $("#modalform button[type=submit]");
    if (submitButton) submitButton.disabled = true;
    try {
      const result = await callback(new FormData(event.currentTarget));
      if (result !== false) $("#modal").close();
    } catch (error) {
      showError(error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };
}
function employeeForm(e = {}) {
  return `<div class="formgrid"><div class="field"><label>Full name *</label><input name="name" required value="${esc(e.name || "")}" placeholder="Sara Ahmed"></div><div class="field"><label>Job title *</label><input name="role" required value="${esc(e.role || "")}" placeholder="Software Engineer"></div><div class="field"><label>Department *</label><select name="department" required><option value="">Select department</option>${["Engineering", "Design", "Human Resources", "Marketing", "Finance", "Operations", "Sales"].map((d) => `<option ${e.department === d ? "selected" : ""}>${d}</option>`).join("")}</select></div><div class="field"><label>Status</label><select name="status">${["Active", "On leave", "Inactive"].map((s) => `<option ${e.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field"><label>Email *</label><input type="email" name="email" required value="${esc(e.email || "")}"></div><div class="field"><label>Joining date</label><input name="joined" value="${esc(e.joined || getToday())}"></div><div class="field"><label>Monthly salary (PKR)</label><input type="number" min="0" name="salary" value="${esc(e.salary || "")}"></div></div>`;
}
async function handle(action, id) {
  try {
    if (action === "add") {
      showModal("Add employee", employeeForm(), async (formData) => {
        const data = Object.fromEntries(formData.entries());
        data.salary = Number(data.salary || 0);
        await apiRequest("/employees", {
          method: "POST",
          body: JSON.stringify(data),
        });
        await refreshData();
        render();
        toast("Employee added successfully");
      });
      return;
    }

    if (action === "edit") {
      const employee = employees.find((item) => String(item.id) === String(id));
      if (!employee) return toast("Employee not found");
      showModal("Edit employee", employeeForm(employee), async (formData) => {
        const data = Object.fromEntries(formData.entries());
        data.salary = Number(data.salary || 0);
        await apiRequest(`/employees/${encodeURIComponent(employee.id)}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        await refreshData();
        render();
        toast("Employee updated");
      });
      return;
    }

    if (action === "delete") {
      if (
        !confirm(
          "Delete this employee? Their attendance and leave history will remain in the database.",
        )
      )
        return;
      await apiRequest(`/employees/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refreshData();
      render();
      toast("Employee deleted");
      return;
    }

    if (action === "newleave") {
      showModal(
        "New leave request",
        `<div class="field"><label>Employee</label><select name="employeeId" required>${employees.map((employee) => `<option value="${esc(employee.id)}">${esc(employee.name)}</option>`).join("")}</select></div><div class="formgrid"><div class="field"><label>Leave type</label><select name="type"><option>Annual leave</option><option>Sick leave</option><option>Casual leave</option><option>Unpaid leave</option></select></div><div class="field"><label>Start date</label><input type="date" name="from" required></div><div class="field"><label>End date</label><input type="date" name="to" required></div></div><div class="field"><label>Reason</label><textarea name="reason" required></textarea></div>`,
        async (formData) => {
          const data = Object.fromEntries(formData.entries());
          if (data.to < data.from) {
            toast("End date must be on or after the start date");
            return false;
          }
          const employee = employees.find(
            (item) => String(item.id) === String(data.employeeId),
          );
          data.employeeName = employee?.name || "";
          data.days =
            Math.floor(
              (new Date(data.to + "T12:00:00") -
                new Date(data.from + "T12:00:00")) /
                86400000,
            ) + 1;
          await apiRequest("/leaves", {
            method: "POST",
            body: JSON.stringify(data),
          });
          await refreshData();
          render();
          toast("Leave request created");
        },
      );
      return;
    }

    if (action === "approve" || action === "reject") {
      const status = action === "approve" ? "Approved" : "Rejected";
      await apiRequest(`/leaves/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshData();
      render();
      toast(`Leave ${status.toLowerCase()}`);
      return;
    }

    if (action === "checkin") {
      const activeEmployees = employees.filter(
        (employee) => employee.status === "Active",
      );
      if (!activeEmployees.length) return toast("Add an active employee first");
      showModal(
        "Attendance check-in / out",
        `<div class="field"><label>Employee</label><select name="employeeId" required>${activeEmployees.map((employee) => `<option value="${esc(employee.id)}">${esc(employee.name)}</option>`).join("")}</select></div><div class="field"><label>Action</label><select name="kind"><option value="check-in">Check in</option><option value="check-out">Check out</option></select></div>`,
        async (formData) => {
          const data = Object.fromEntries(formData.entries());
          await apiRequest("/attendance", {
            method: "POST",
            body: JSON.stringify(data),
          });
          await refreshData();
          render();
          toast(
            data.kind === "check-in" ? "Check-in saved" : "Check-out saved",
          );
        },
      );
      return;
    }

    if (action === "markabsent") {
      if (!employees.length) return toast("Add an employee first");
      showModal(
        "Update attendance status",
        `<div class="field"><label>Employee</label><select name="employeeId">${employees.map((employee) => `<option value="${esc(employee.id)}">${esc(employee.name)}</option>`).join("")}</select></div><div class="field"><label>Status</label><select name="status"><option>Absent</option><option>Present</option><option>On leave</option></select></div>`,
        async (formData) => {
          const data = Object.fromEntries(formData.entries());
          await apiRequest("/attendance", {
            method: "POST",
            body: JSON.stringify({ ...data, kind: "set-status" }),
          });
          await refreshData();
          render();
          toast("Attendance status saved");
        },
      );
      return;
    }

    if (["export", "export-att", "export-payroll"].includes(action)) {
      const rows =
        action === "export-payroll"
          ? [
              ["Name", "Department", "Salary"],
              ...employees.map((employee) => [
                employee.name,
                employee.department,
                employee.salary,
              ]),
            ]
          : action === "export-att"
            ? [
                ["Date", "Employee", "Check in", "Check out", "Status"],
                ...attendanceRecords.map((record) => [
                  record.date,
                  employees.find(
                    (employee) =>
                      String(employee.id) === String(record.employeeId),
                  )?.name || record.employeeName,
                  record.checkIn || "",
                  record.checkOut || "",
                  record.status,
                ]),
              ]
            : [
                [
                  "Name",
                  "Role",
                  "Department",
                  "Email",
                  "Status",
                  "Joined",
                  "Salary",
                ],
                ...employees.map((employee) => [
                  employee.name,
                  employee.role,
                  employee.department,
                  employee.email,
                  employee.status,
                  employee.joined,
                  employee.salary,
                ]),
              ];
      const csv =
        "\ufeff" +
        rows
          .map((row) =>
            row
              .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "peopleflow-report.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast("CSV downloaded");
      return;
    }

    if (action === "runpay")
      return (
        confirm("Run demo payroll? No real payment will be made.") &&
        toast("Demo payroll prepared — no payment processed")
      );
    if (action === "report")
      return toast("Report preview ready to connect to backend analytics.");
    if (action === "newchat") {
      if ($("#messages")) $("#messages").innerHTML = "";
      render();
      return;
    }
    if (action === "savesettings") {
      localStorage.setItem("pf_company", $("#company").value);
      toast("Settings saved in this browser");
      return;
    }
    if (action === "announce")
      return toast(
        "Announcement publishing will be connected in the next build.",
      );
    return toast("This section is a prototype preview.");
  } catch (error) {
    showError(error);
  }
}

function sendChat(q) {
  let box = $("#messages");
  if (!box) return;

  let u = document.createElement("div");
  u.className = "bubble user";
  u.textContent = q;
  box.append(u);

  let low = q.toLowerCase(),
    reply =
      "I can answer questions about team summary, departments, leave requests, attendance, and estimated payroll. Try one of those topics.";
  if (low.includes("summary") || low.includes("headcount"))
    reply = `There are ${employees.length} employees in the database, ${employees.filter((e) => e.status === "Active").length} active. ${leaves.filter((l) => l.status === "Pending").length} leave requests are pending.`;
  else if (low.includes("leave"))
    reply = `There are ${leaves.filter((l) => l.status === "Pending").length} pending, ${leaves.filter((l) => l.status === "Approved").length} approved, and ${leaves.filter((l) => l.status === "Rejected").length} rejected leave requests in the database.`;
  else if (low.includes("attendance") || low.includes("present"))
    reply =
      "Today's attendance: ${attendanceCounts().present} present, ${attendanceCounts().onLeave} on leave, ${attendanceCounts().absent} absent, and ${attendanceCounts().notCheckedIn} not checked in, based on current database records.";
  else if (low.includes("payroll") || low.includes("salary"))
    reply =
      "Estimated gross monthly payroll is " +
      money(
        employees
          .filter((e) => e.status !== "Inactive")
          .reduce((s, e) => s + e.salary, 0),
      ) +
      ". No real payroll has been processed.";
  else if (low.includes("department") || low.includes("team")) {
    let d = {};
    employees.forEach((e) => (d[e.department] = (d[e.department] || 0) + 1));
    reply = Object.entries(d)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }
  let b = document.createElement("div");
  b.className = "bubble";
  b.textContent =
    reply + " (Rule-based helper; this is not a connected AI model.)";
  box.append(b);
  box.scrollTop = box.scrollHeight;
}
document.addEventListener("click", (e) => {
  let n = e.target.closest("[data-page]");
  if (n) {
    page = n.dataset.page;
    query = "";
    $("#side").classList.remove("open");
    render();
    return;
  }
  let g = e.target.closest("[data-goto]");
  if (g) {
    page = g.dataset.goto;
    render();
    return;
  }
  let a = e.target.closest("[data-action]");
  if (a) {
    handle(a.dataset.action, a.dataset.id);
    return;
  }
  let p = e.target.closest("[data-prompt]");
  if (p) sendChat(p.dataset.prompt);
});
$("#hamb").onclick = () => $("#side").classList.toggle("open");
$("#cancelmodal").onclick = () => $("#modal").close();
$("#globalsearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    query = e.target.value;
    page = "employees";
    render();
  }
});
$("#notifications").onclick = () =>
  toast(
    leaves.filter((l) => l.status === "Pending").length +
      " leave requests are waiting for review.",
  );
async function startApp() {
  try {
    await refreshData();
    render();
  } catch (error) {
    console.error(error);
    $("#content").innerHTML =
      `<section class="panel" style="padding:24px"><h2>Cannot connect to PeopleFlow API</h2><p>Start Apache/PHP and check your MySQL connection, then reload this page.</p><p class="sub">${esc(error.message)}</p></section>`;
  }
}
startApp();
