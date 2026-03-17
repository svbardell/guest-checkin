import { useState, useMemo } from "react";

const TIMESLOTS = [
  { label: "3–4 PM", value: "3:00–4:00 PM" },
  { label: "4–5 PM", value: "4:00–5:00 PM" },
  { label: "5–6 PM", value: "5:00–6:00 PM" },
  { label: "6–7 PM", value: "6:00–7:00 PM" },
];

const SLOT_COLORS = {
  "3:00–4:00 PM": { label: "Blue", emoji: "🔵", bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  "4:00–5:00 PM": { label: "Yellow", emoji: "🟡", bg: "#fefce8", border: "#fde047", text: "#854d0e" },
  "5:00–6:00 PM": { label: "Green", emoji: "🟢", bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  "6:00–7:00 PM": { label: "Red", emoji: "🔴", bg: "#fff1f2", border: "#fda4af", text: "#be123c" },
};

function getSlotColor(slot) {
  return SLOT_COLORS[slot] || null;
}

function normalizeSlot(s) {
  return (s || "").replace(/\s/g, "").toLowerCase().replace(/[–—-]/g, "-");
}
function slotsMatch(a, b) { return normalizeSlot(a) === normalizeSlot(b); }
function nowPST() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles" });
}
function toTitleCase(str) {
  return (str || "").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function splitCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (...names) => {
    for (const n of names) {
      const i
