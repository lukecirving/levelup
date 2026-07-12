const PREFIX = "golfapp:";
const SCHEMA_VERSION = 1;

const KEYS = [
  "schemaVersion",
  "settings",
  "gymPlan",
  "gymSessions",
  "measurements",
  "golfDrillsCustom",
  "golfPracticeLogs",
  "dayPlans",
  "checklistItems",
  "checklistLogs",
  "dietEntries",
];

function readRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeRaw(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function defaultSettings() {
  return {
    goalDate: null,
    units: "lb",
    onboardingComplete: false,
    themePreference: "system",
  };
}

function defaultGymPlan() {
  return { id: "plan-1", name: "My Program", days: [] };
}

function defaultChecklistItems() {
  return [
    { id: "sleep8", category: "habit", label: "Slept 7+ hrs", icon: "🛌", active: true, order: 1 },
    { id: "stretch10", category: "habit", label: "Stretched / mobility", icon: "🤸", active: true, order: 2 },
    { id: "practiceDone", category: "habit", label: "Completed planned practice", icon: "⛳", active: true, order: 3 },
    { id: "proteinTarget", category: "diet", label: "Hit protein target", icon: "🥩", active: true, order: 1 },
    { id: "veggies", category: "diet", label: "Veggies at 2+ meals", icon: "🥦", active: true, order: 2 },
    { id: "water", category: "diet", label: "Water goal", icon: "💧", active: true, order: 3 },
  ];
}

function ensureInitialized() {
  if (readRaw("schemaVersion", null) === null) {
    writeRaw("schemaVersion", SCHEMA_VERSION);
    writeRaw("settings", defaultSettings());
    writeRaw("gymPlan", defaultGymPlan());
    writeRaw("gymSessions", []);
    writeRaw("measurements", []);
    writeRaw("golfDrillsCustom", []);
    writeRaw("golfPracticeLogs", []);
    writeRaw("dayPlans", {});
    writeRaw("checklistItems", defaultChecklistItems());
    writeRaw("checklistLogs", {});
    writeRaw("dietEntries", {});
  }
}
ensureInitialized();

export const store = {
  getSettings: () => readRaw("settings", defaultSettings()),
  setSettings: (v) => writeRaw("settings", v),

  getGymPlan: () => readRaw("gymPlan", defaultGymPlan()),
  setGymPlan: (v) => writeRaw("gymPlan", v),

  getGymSessions: () => readRaw("gymSessions", []),
  setGymSessions: (v) => writeRaw("gymSessions", v),

  getMeasurements: () => readRaw("measurements", []),
  setMeasurements: (v) => writeRaw("measurements", v),

  getGolfDrillsCustom: () => readRaw("golfDrillsCustom", []),
  setGolfDrillsCustom: (v) => writeRaw("golfDrillsCustom", v),

  getGolfPracticeLogs: () => readRaw("golfPracticeLogs", []),
  setGolfPracticeLogs: (v) => writeRaw("golfPracticeLogs", v),

  getDayPlans: () => readRaw("dayPlans", {}),
  setDayPlans: (v) => writeRaw("dayPlans", v),

  getChecklistItems: () => readRaw("checklistItems", defaultChecklistItems()),
  setChecklistItems: (v) => writeRaw("checklistItems", v),

  getChecklistLogs: () => readRaw("checklistLogs", {}),
  setChecklistLogs: (v) => writeRaw("checklistLogs", v),

  getDietEntries: () => readRaw("dietEntries", {}),
  setDietEntries: (v) => writeRaw("dietEntries", v),

  exportAll() {
    const snapshot = {};
    for (const key of KEYS) snapshot[key] = readRaw(key, null);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `levelup-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  importAll(json) {
    const data = JSON.parse(json);
    for (const key of KEYS) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        writeRaw(key, data[key]);
      }
    }
  },

  resetAll() {
    for (const key of KEYS) localStorage.removeItem(PREFIX + key);
    ensureInitialized();
  },
};
