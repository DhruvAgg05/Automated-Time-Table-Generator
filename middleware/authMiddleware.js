function preventCache(req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
}

function requireApiAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

module.exports = {
  preventCache,
  requireAuth,
  requireApiAuth,
  requireRole
};
