(function () {
  var pageRole = document.body && document.body.getAttribute("data-role");

  function hideBoot() {
    var boot = document.getElementById("boot");
    if (boot) boot.style.display = "none";
  }

  async function run() {
    if (!window.eq) { window.location.href = "index.html"; return; }
    var res = await eq.getSession();
    var session = res.data && res.data.session;
    if (!session || !session.user) {
      window.location.href = eq.url("index.html");
      return;
    }
    var profile = session.profile || await eq.getProfile(session.user.id);
    if (!profile) {
      window.location.href = eq.url("index.html");
      return;
    }
    if (pageRole && profile.role !== pageRole) {
      var dest = profile.role === "lender" ? "lender/dashboard.html" : "farmer/dashboard.html";
      window.location.href = eq.url(dest);
      return;
    }
    window.EQ_USER = session.user;
    window.EQ_PROFILE = profile;
    hideBoot();
    document.dispatchEvent(new CustomEvent("eq:ready"));
  }

  run().catch(function () {
    window.location.href = eq.url("index.html");
  });
})();
