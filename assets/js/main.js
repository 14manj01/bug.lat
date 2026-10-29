(() => {
  "use strict";

  // Mobile navigation
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Scroll reveal
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("in"));
  }

  // Toast + copy Discord username
  let toastEl;
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  };

  // Copy buttons: data-copy="literal" (Discord) or data-copy-target="#id" (citations)
  document.querySelectorAll("[data-copy], [data-copy-target]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-copy-target");
      const value = target ? document.querySelector(target).textContent.trim() : btn.getAttribute("data-copy");
      const label = btn.getAttribute("data-copy-label") || "Discord username";
      try {
        await navigator.clipboard.writeText(value);
        toast(target ? `Copied ${label}` : `Copied ${label}: ${value}`);
      } catch {
        toast(target ? `Select the text to copy the ${label}` : `${label}: ${value}`);
      }
    })
  );

  // Live citation counts from OpenAlex (publications page). Baked-in numbers stay if the API fails.
  const citeLinks = [...document.querySelectorAll(".pub-cites[data-doi]")];
  if (citeLinks.length) {
    const filter = citeLinks.map((a) => a.getAttribute("data-doi")).join("|");
    fetch(`https://api.openalex.org/works?filter=doi:${filter}&select=doi,cited_by_count&per-page=50`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ results }) => {
        const byDoi = new Map(results.map((w) => [w.doi.replace("https://doi.org/", "").toLowerCase(), w.cited_by_count]));
        const counts = [];
        for (const a of citeLinks) {
          const n = byDoi.get(a.getAttribute("data-doi").toLowerCase());
          if (typeof n !== "number") return; // incomplete response: keep every static value consistent
          counts.push([a, n]);
        }
        for (const [a, n] of counts) {
          a.querySelector("[data-cites]").textContent = n;
          a.lastChild.textContent = n === 1 ? " citation" : " citations";
        }
        const values = counts.map(([, n]) => n).sort((x, y) => y - x);
        const total = values.reduce((s, n) => s + n, 0);
        const h = values.filter((n, i) => n >= i + 1).length;
        document.querySelectorAll("[data-total-cites]").forEach((el) => (el.textContent = total));
        document.querySelectorAll("[data-h-index]").forEach((el) => (el.textContent = h));
        document.querySelectorAll("[data-cites-updated]").forEach(
          (el) => (el.textContent = ` (as of ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })})`)
        );
      })
      .catch(() => {
        /* keep static values */
      });
  }

  // Print button (résumé)
  document.querySelectorAll("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Live GitHub repositories (programming page). Static content stays if the API fails.
  const repoList = document.getElementById("repo-list");
  if (repoList) {
    const colors = { Java: "#b07219", Python: "#3572A5", "Jupyter Notebook": "#DA5B0B", JavaScript: "#f1e05a", TypeScript: "#3178c6", "C#": "#178600", "C++": "#f34b7d" };
    const users = (repoList.getAttribute("data-users") || "").split(",").filter(Boolean);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });

    Promise.all(
      users.map((u) =>
        fetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=pushed`, { headers: { Accept: "application/vnd.github+json" } })
          .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      )
    )
      .then((lists) => {
        const repos = lists
          .flat()
          .filter((r) => !r.fork && !r.archived && r.size > 0)
          .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
        if (!repos.length) return;
        repoList.innerHTML = repos
          .map(
            (r) => `<a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener">
  <h3>${esc(r.name)}</h3>
  <p>${esc(r.description || "No description yet.")}</p>
  <div class="project-meta">
    ${r.language ? `<span><span class="lang-dot" style="background:${colors[r.language] || "#8e8e93"}"></span>${esc(r.language)}</span>` : ""}
    ${r.stargazers_count ? `<span>★ ${r.stargazers_count}</span>` : ""}
    <span>Updated ${fmt(r.pushed_at)}</span>
  </div>
</a>`
          )
          .join("");
      })
      .catch(() => {
        /* keep static fallback */
      });
  }
})();
