// app/data/helpers/session-store-fix.js
//
// Fixes stale pages after a form submit or redirect (found testing Decide, 9 November 2026).
//
// The Prototype Kit (13.18.1) saves sessions with a file store whose set() first reads EVERY stored
// session file to delete expired ones, then writes. express-session sends a redirect's headers
// before that save finishes, so the browser can request the next page while the old session is
// still on disk — the next page then shows data from before the submit. The more sessions are
// stored, the slower the save and the more often it happens. The store also deletes any session
// file it cannot parse, which can remove a session caught mid-write.
//
// Two fixes, both in app code (node_modules is untouched):
// 1. saveBeforeRedirect: every res.redirect in the app router waits for the session to be saved.
// 2. patchFileStore: the store writes first (atomically, via a temp file and rename), then clears
//    expired sessions in the background at most once a minute, and never deletes a file it
//    cannot parse.

const fs = require("fs/promises");
const path = require("path");

const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = 0;

function isExpired(session) {
  const expires = session && session.cookie && session.cookie.expires;
  return Boolean(expires) && new Date(expires) < new Date();
}

async function cleanupExpired(dir) {
  const files = await fs.readdir(dir).catch(() => []);
  await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const session = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
          if (isExpired(session)) await fs.unlink(path.join(dir, f));
        } catch (err) {
          // Unreadable (possibly mid-write): leave it alone.
        }
      })
  );
}

function patchFileStore() {
  let FileStore;
  try {
    FileStore = require("govuk-prototype-kit/lib/session-file-store");
  } catch (err) {
    console.warn("[session-store-fix] Prototype Kit file store not found; not patched.");
    return;
  }
  if (FileStore.prototype.__decidePatched) return;
  FileStore.prototype.set = async function set(sessionId, session, callback = () => {}) {
    try {
      await fs.mkdir(this.path, { recursive: true });
      const filename = path.join(this.path, sessionId + ".json");
      const tmp = filename + "." + process.pid + "." + Date.now() + "." + Math.random().toString(36).slice(2) + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(session));
      await fs.rename(tmp, filename); // atomic: readers never see a half-written file
      callback();
    } catch (err) {
      return callback(err);
    }
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
      lastCleanup = now;
      cleanupExpired(this.path).catch(() => {});
    }
  };
  FileStore.prototype.__decidePatched = true;
}

// Middleware: make res.redirect wait until the session is saved.
function saveBeforeRedirect(req, res, next) {
  const redirect = res.redirect.bind(res);
  res.redirect = function redirectAfterSave(...args) {
    if (!req.session || typeof req.session.save !== "function") return redirect(...args);
    req.session.save(() => redirect(...args));
    return res;
  };
  next();
}

module.exports = { patchFileStore, saveBeforeRedirect };
