import { useState, useMemo, useEffect } from "react";

const TIMESLOTS = [
  { label: "3–4 PM", value: "3:00–4:00 PM" },
  { label: "4–5 PM", value: "4:00–5:00 PM" },
  { label: "5–6 PM", value: "5:00–6:00 PM" },
  { label: "6–7 PM", value: "6:00–7:00 PM" },
];

// Sticker color system based on event time windows (PST)
const STICKER_COLORS = [
  { slot: "3:00–4:00 PM", startHour: 15, endHour: 16, color: "Blue",   hex: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", emoji: "🔵" },
  { slot: "4:00–5:00 PM", startHour: 16, endHour: 17, color: "Yellow", hex: "#eab308", bg: "#fefce8", border: "#fef08a", emoji: "🟡" },
  { slot: "5:00–6:00 PM", startHour: 17, endHour: 18, color: "Green",  hex: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", emoji: "🟢" },
  { slot: "6:00–7:00 PM", startHour: 18, endHour: 19, color: "Red",    hex: "#ef4444", bg: "#fff1f2", border: "#fecaca", emoji: "🔴" },
];

function getCurrentStickerColor() {
  const hourPST = new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" });
  const h = parseInt(hourPST, 10);
  return STICKER_COLORS.find((s) => h >= s.startHour && h < s.endHour) || null;
}

function StickerBanner({ currentSlot }) {
  const [active, setActive] = useState(getCurrentStickerColor);

  useEffect(() => {
    const id = setInterval(() => setActive(getCurrentStickerColor()), 60000);
    return () => clearInterval(id);
  }, []);

  const display = currentSlot
    ? STICKER_COLORS.find((s) => s.slot === currentSlot) || active
    : active;

  if (!display) {
    return (
      <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🏷️</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#374151" }}>No active check-in window</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Event hours: 3:00–7:00 PM · Select a timeslot to see the sticker color</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: display.bg, border: `2px solid ${display.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: display.hex, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 0 4px ${display.border}` }}>
        {display.emoji}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 17, color: display.hex, letterSpacing: "-0.01em" }}>
          Issue a {display.color.toUpperCase()} sticker
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
          Current window: <strong style={{ color: "#374151" }}>{display.slot}</strong>
          {!currentSlot && <span style={{ marginLeft: 8, fontSize: 12, background: display.border, color: display.hex, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Live</span>}
          {currentSlot && currentSlot !== active?.slot && <span style={{ marginLeft: 8, fontSize: 12, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Manual override</span>}
        </div>
      </div>
    </div>
  );
}

function normalizeSlot(s) {
  return (s || "").replace(/\s/g, "").toLowerCase().replace(/[–—-]/g, "-");
}

function slotsMatch(a, b) {
  return normalizeSlot(a) === normalizeSlot(b);
}

function nowPST() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
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
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const mloIdx = col("mlo");
  const firstIdx = col("first name", "firstname");
  const lastIdx = col("last name", "lastname");
  const guestIdx = col("guest name");
  const slotIdx = col("arrival window", "arrival", "preferred");
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCSVLine(lines[i]);
    const get = (j) => (j >= 0 && j < cols.length ? cols[j].trim() : "");
    const first = toTitleCase(get(firstIdx));
    const last = toTitleCase(get(lastIdx));
    const mlo = toTitleCase(get(mloIdx));
    const guestName = toTitleCase(get(guestIdx));
    const slot = get(slotIdx);
    if (!first && !last) continue;
    const validSlots = ["3:00","4:00","5:00","6:00"];
    if (!validSlots.some(s => slot.includes(s))) continue;
    parsed.push({ id: i, first, last, fullName: (first + " " + last).trim(), mlo, guestName, slot, checkedIn: false, checkedInTime: null, isWalkIn: false });
  }
  return parsed;
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: accent || "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function GuestRow({ guest, currentSlot, onCheckin, onUndo }) {
  const correctSlot = currentSlot ? slotsMatch(guest.slot, currentSlot) : null;
  const rowBg = guest.checkedIn
    ? (correctSlot === false ? "var(--warn-bg)" : "var(--success-bg)")
    : "var(--surface)";
  const rowBorder = guest.checkedIn
    ? (correctSlot === false ? "var(--warn-border)" : "var(--success-border)")
    : "var(--border)";
  const initials = ((guest.first?.[0] || "") + (guest.last?.[0] || "")).toUpperCase();
  const sticker = STICKER_COLORS.find((s) => slotsMatch(s.slot, guest.slot));

  return (
    <div style={{ background: rowBg, border: `1px solid ${rowBorder}`, borderRadius: 10, padding: "12px 16px", transition: "all 0.15s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: guest.checkedIn ? "var(--success-border)" : (guest.isWalkIn ? "#fef9c3" : "var(--accent-soft)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: guest.checkedIn ? "var(--success-text)" : (guest.isWalkIn ? "#854d0e" : "var(--accent)"), flexShrink: 0 }}>
          {initials || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {guest.fullName}
            {guest.isWalkIn && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#fef9c3", color: "#854d0e", padding: "2px 7px", borderRadius: 20, border: "1px solid #fde68a" }}>Walk-in</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {guest.mlo && <span>MLO: {guest.mlo}</span>}
            {guest.slot && <span>Slot: {guest.slot}</span>}
            {sticker && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: sticker.hex, background: sticker.bg, border: `1px solid ${sticker.border}`, padding: "1px 7px", borderRadius: 20 }}>
                {sticker.emoji} {sticker.color} sticker
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {guest.checkedIn && currentSlot && guest.slot && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: correctSlot ? "var(--success-border)" : "var(--warn-border)", color: correctSlot ? "var(--success-text)" : "var(--warn-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {correctSlot ? "✓ On time" : "Wrong slot"}
            </span>
          )}
          {guest.checkedIn && (
            <button onClick={() => onUndo(guest.id)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>Undo</button>
          )}
          <button
            onClick={() => !guest.checkedIn && onCheckin(guest.id)}
            style={{ fontSize: 13, fontWeight: 500, padding: "6px 16px", borderRadius: 8, border: guest.checkedIn ? "1px solid var(--success-border)" : "1px solid var(--accent)", background: guest.checkedIn ? "transparent" : "var(--accent)", color: guest.checkedIn ? "var(--success-text)" : "#fff", cursor: guest.checkedIn ? "default" : "pointer", transition: "all 0.1s" }}>
            {guest.checkedIn ? (guest.checkedInTime ? `In at ${guest.checkedInTime}` : "Checked in") : "Check in"}
          </button>
        </div>
      </div>
      {guest.guestName && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", paddingLeft: 50 }}>
          + Guest: <span style={{ color: "var(--text)", fontWeight: 500 }}>{guest.guestName}</span>
        </div>
      )}
    </div>
  );
}

export default function GuestCheckIn() {
  const [guests, setGuests] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [nextId, setNextId] = useState(10000);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setGuests(parseCSV(e.target.result));
      setLoaded(true);
    };
    reader.readAsText(file);
  };

  const checkin = (id) => {
    const time = nowPST();
    setGuests((prev) =>
      prev.map((g) => g.id === id ? { ...g, checkedIn: true, checkedInTime: time } : g)
    );
  };

  const undo = (id) => {
    setGuests((prev) =>
      prev.map((g) => g.id === id ? { ...g, checkedIn: false, checkedInTime: null } : g)
    );
  };

  const addWalkIn = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const first = toTitleCase(parts[0] || "");
    const last = toTitleCase(parts.slice(1).join(" ") || "");
    const time = nowPST();
    const newGuest = {
      id: nextId,
      first,
      last,
      fullName: toTitleCase(trimmed),
      mlo: "",
      guestName: "",
      slot: currentSlot || "",
      checkedIn: true,
      checkedInTime: time,
      isWalkIn: true,
    };
    setGuests((prev) => [newGuest, ...prev]);
    setNextId((n) => n + 1);
    setSearch("");
  };

  const exportCSV = () => {
    const headers = ["First Name", "Last Name", "MLO", "Guest Name", "Assigned Slot", "Sticker Color", "Checked In", "Check-In Time (PST)", "Walk-in"];
    const rows = guests.map((g) => {
      const sticker = STICKER_COLORS.find((s) => slotsMatch(s.slot, g.slot));
      return [g.first, g.last, g.mlo, g.guestName, g.slot, sticker ? sticker.color : "", g.checkedIn ? "Yes" : "No", g.checkedInTime || "", g.isWalkIn ? "Yes" : "No"];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((val) => `"${(val || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        g.mlo.toLowerCase().includes(q) ||
        g.guestName.toLowerCase().includes(q)
    );
  }, [guests, search]);

  const noMatch = loaded && search.trim().length > 0 && filtered.length === 0;

  const stats = useMemo(() => ({
    total: guests.length,
    checkedIn: guests.filter((g) => g.checkedIn).length,
    thisSlot: currentSlot ? guests.filter((g) => slotsMatch(g.slot, currentSlot)).length : 0,
    wrongSlot: guests.filter((g) => g.checkedIn && currentSlot && g.slot && !slotsMatch(g.slot, currentSlot)).length,
  }), [guests, currentSlot]);

  const slotGuestCount = currentSlot
    ? guests.filter((g) => slotsMatch(g.slot, currentSlot)).length
    : 0;

  return (
    <div style={{ "--text": "#0f0f0f", "--muted": "#6b7280", "--surface": "#ffffff", "--bg": "#f5f4f1", "--border": "#e5e7eb", "--accent": "#1a56db", "--accent-soft": "#eff6ff", "--success-bg": "#f0fdf4", "--success-border": "#86efac", "--success-text": "#15803d", "--warn-bg": "#fffbeb", "--warn-border": "#fcd34d", "--warn-text": "#92400e", fontFamily: "'Inter', system-ui, sans-serif", background: "var(--bg)", minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Guest Check-In</h1>
            <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Antique &amp; Appraisal Fair · KQED HQ · April 9</p>
          </div>
          {loaded && (
            <button onClick={exportCSV} style={{ fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 8, flexShrink: 0, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}>
              ⬇ Export CSV
            </button>
          )}
        </div>

        <StickerBanner currentSlot={currentSlot} />

        {!loaded && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={{ border: "2px dashed var(--border)", borderRadius: 14, padding: "40px 24px", textAlign: "center", marginBottom: 24, background: "var(--surface)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 500, marginBottom: 6 }}>Drop your Signal CSV here</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>or click to browse — reads First name, Last name, MLO, Guest name, and arrival window</div>
            <label style={{ display: "inline-block", fontSize: 13, fontWeight: 500, padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", cursor: "pointer" }}>
              Choose file
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: "var(--muted)", marginRight: 4 }}>Active timeslot:</span>
          {TIMESLOTS.map((s) => {
            const sc = STICKER_COLORS.find((c) => c.slot === s.value);
            return (
              <button
                key={s.value}
                onClick={() => setCurrentSlot(currentSlot === s.value ? null : s.value)}
                style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", borderRadius: 8, border: currentSlot === s.value ? `1.5px solid ${sc?.hex || "var(--accent)"}` : "1px solid var(--border)", background: currentSlot === s.value ? (sc?.bg || "var(--accent-soft)") : "var(--surface)", color: currentSlot === s.value ? (sc?.hex || "var(--accent)") : "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                {sc && <span>{sc.emoji}</span>}
                {s.label}
              </button>
            );
          })}
        </div>

        {loaded && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 20 }}>
            <StatCard label="Total guests" value={stats.total} />
            <StatCard label="Checked in" value={stats.checkedIn} accent="#f0fdf4" />
            <StatCard label="This slot" value={stats.thisSlot} />
            <StatCard label="Wrong slot" value={stats.wrongSlot} accent={stats.wrongSlot > 0 ? "#fffbeb" : undefined} />
          </div>
        )}

        {loaded && (
          <input
            type="text"
            placeholder="Search by member name, MLO, or guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--text)", marginBottom: 10, outline: "none", boxSizing: "border-box" }}
          />
        )}

        {loaded && currentSlot && (
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
            Active slot: <strong style={{ color: "var(--accent)" }}>{currentSlot}</strong> — {slotGuestCount} guests expected.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loaded ? (
            filtered.length > 0 ? (
              filtered.map((g) => (
                <GuestRow key={g.id} guest={g} currentSlot={currentSlot} onCheckin={checkin} onUndo={undo} />
              ))
            ) : noMatch ? (
              <div style={{ textAlign: "center", padding: "32px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>
                  No guests match "{search}"
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
                  This person is not on the list. You can add them as a walk-in with the current timestamp.
                </div>
                <button
                  onClick={() => addWalkIn(search)}
                  style={{ fontSize: 14, fontWeight: 600, padding: "10px 24px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  ➕ Add "{search}" as walk-in
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 14 }}>No guests to show.</div>
            )
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 14 }}>Upload a CSV to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}
