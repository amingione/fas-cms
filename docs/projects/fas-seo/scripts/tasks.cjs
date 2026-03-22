#!/usr/bin/env node

/**
 * Lightweight task management CLI for the FAS Analytics Roadmap.
 *
 * Usage:
 *   node docs/projects/fas-seo/scripts/tasks.js new --phase 1 --title "Task title" --priority high
 *   node docs/projects/fas-seo/scripts/tasks.js list [--status todo] [--phase 1]
 *   node docs/projects/fas-seo/scripts/tasks.js update-status P1-001 in-progress
 */

const fs = require("fs");
const path = require("path");

const TASKS_DIR = path.resolve(__dirname, "..", "tasks");
const VALID_STATUSES = ["todo", "in-progress", "done", "blocked"];
const VALID_PRIORITIES = ["high", "medium", "low"];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  match[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      const val = rest.join(":").trim();
      fm[key.trim()] = val;
    }
  });
  return fm;
}

function getAllTasks() {
  const tasks = [];
  for (const phase of ["phase-1", "phase-2", "phase-3"]) {
    const dir = path.join(TASKS_DIR, phase);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(dir, file), "utf-8");
      const fm = parseFrontmatter(content);
      if (fm) {
        tasks.push({ file: path.join(phase, file), ...fm });
      }
    }
  }
  return tasks;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getNextId(phase) {
  const dir = path.join(TASKS_DIR, `phase-${phase}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return `P${phase}-001`;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const nums = files
    .map((f) => {
      const m = f.match(/^P\d+-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `P${phase}-${String(next).padStart(3, "0")}`;
}

function cmdNew(args) {
  const phase = args["--phase"];
  const title = args["--title"];
  const priority = args["--priority"] || "medium";

  if (!phase || !title) {
    console.error("Usage: tasks.js new --phase <1|2|3> --title <title> [--priority <high|medium|low>]");
    process.exit(1);
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    console.error(`Invalid priority: ${priority}. Use: ${VALID_PRIORITIES.join(", ")}`);
    process.exit(1);
  }

  const id = getNextId(phase);
  const slug = slugify(title);
  const filename = `${id}-${slug}.md`;
  const today = new Date().toISOString().split("T")[0];

  const content = `---
id: ${id}
title: ${title}
phase: ${phase}
status: todo
priority: ${priority}
assignee: ""
depends_on: []
definition_of_done: |
  TODO: Define completion criteria.
verification_steps:
  - TODO: Add verification steps
created: ${today}
updated: ${today}
---

## Description

TODO: Describe what needs to be done.

## Notes

`;

  const dir = path.join(TASKS_DIR, `phase-${phase}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content);
  console.log(`Created: tasks/phase-${phase}/${filename}`);
}

function cmdList(args) {
  const filterStatus = args["--status"];
  const filterPhase = args["--phase"];

  let tasks = getAllTasks();

  if (filterStatus) {
    tasks = tasks.filter((t) => t.status === filterStatus);
  }
  if (filterPhase) {
    tasks = tasks.filter((t) => t.phase === filterPhase);
  }

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const statusIcon = { todo: "[ ]", "in-progress": "[~]", done: "[x]", blocked: "[!]" };

  // Group by phase
  const grouped = {};
  for (const t of tasks) {
    const p = t.phase || "?";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(t);
  }

  for (const phase of Object.keys(grouped).sort()) {
    console.log(`\n--- Phase ${phase} ---`);
    for (const t of grouped[phase]) {
      const icon = statusIcon[t.status] || "[ ]";
      const pri = t.priority ? ` (${t.priority})` : "";
      console.log(`  ${icon} ${t.id} — ${t.title}${pri}`);
    }
  }
  console.log(`\nTotal: ${tasks.length} task(s)`);
}

function cmdUpdateStatus(args) {
  const taskId = args._positional[0];
  const newStatus = args._positional[1];

  if (!taskId || !newStatus) {
    console.error("Usage: tasks.js update-status <task-id> <status>");
    process.exit(1);
  }
  if (!VALID_STATUSES.includes(newStatus)) {
    console.error(`Invalid status: ${newStatus}. Use: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  // Find the task file
  for (const phase of ["phase-1", "phase-2", "phase-3"]) {
    const dir = path.join(TASKS_DIR, phase);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.startsWith(taskId))) {
      const filepath = path.join(dir, file);
      let content = fs.readFileSync(filepath, "utf-8");
      const today = new Date().toISOString().split("T")[0];
      content = content.replace(/^status:\s*.*$/m, `status: ${newStatus}`);
      content = content.replace(/^updated:\s*.*$/m, `updated: ${today}`);
      fs.writeFileSync(filepath, content);
      console.log(`Updated ${taskId} → ${newStatus}`);
      return;
    }
  }
  console.error(`Task not found: ${taskId}`);
  process.exit(1);
}

// Parse CLI args
function parseArgs(argv) {
  const args = { _positional: [] };
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith("--")) {
      args[argv[i]] = argv[i + 1] || true;
      i += 2;
    } else {
      args._positional.push(argv[i]);
      i++;
    }
  }
  return args;
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

switch (command) {
  case "new":
    cmdNew(args);
    break;
  case "list":
    cmdList(args);
    break;
  case "update-status":
    cmdUpdateStatus(args);
    break;
  default:
    console.log("FAS Task Manager");
    console.log("");
    console.log("Commands:");
    console.log("  new             Create a new task");
    console.log("  list            List tasks (--status, --phase)");
    console.log("  update-status   Update task status");
    console.log("");
    console.log("Examples:");
    console.log('  node tasks.js new --phase 1 --title "Set up GTM" --priority high');
    console.log("  node tasks.js list --status todo --phase 1");
    console.log("  node tasks.js update-status P1-001 in-progress");
}
