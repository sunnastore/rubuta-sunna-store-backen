function requireAdmin(req, res, next) {
  const email = req.headers["x-admin-email"];
  const password = req.headers["x-admin-password"];
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: "Admin login required." });
}

module.exports = { requireAdmin };
