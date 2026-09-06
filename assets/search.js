"use strict";
(() => {
  const form = document.querySelector(".search-form");
  if (!form) return;
  const query = document.getElementById("query");
  const category = document.getElementById("category");
  const status = document.getElementById("search-status");
  const results = document.getElementById("search-results");
  const more = document.getElementById("load-more");
  const params = new URLSearchParams(location.search);
  query.value = (params.get("q") || "").slice(0, 200);
  category.value = params.get("category") || "";
  let rows = [];
  let matches = [];
  let count = 24;
  let ready = false;
  let timer;
  const normalize = text => text.normalize("NFKC").toLocaleLowerCase("ja");
  const indexURL = new URL(form.dataset.index, location.href);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function card(row) {
    const link = new URL(row.path, indexURL);
    const article = element("article", `news-card cat-${row.category}`);
    const catLink = element("a", "category-name");
    catLink.href = new URL(`categories/${row.category}/`, indexURL).href;
    catLink.append(element("span", "category-dot"), document.createTextNode(row.category_name));
    const heading = element("h3");
    const title = element("a", "", row.headline);
    title.href = link.href;
    heading.append(title);
    const meta = element("div", "article-meta");
    const date = element("time", "", row.date.replaceAll("-", "."));
    date.dateTime = row.date;
    meta.append(element("span", `badge ${row.label_class}`, row.label), element("span", "", row.source), date);
    article.append(catLink, heading, element("p", "excerpt", row.excerpt), meta);
    return article;
  }
  function render() {
    results.replaceChildren();
    if (!matches.length) {
      results.append(element("p", "empty-state", "該当する記事はありませんでした。"));
    } else {
      results.append(...matches.slice(0, count).map(card));
    }
    const searching = query.value.trim() || category.value;
    status.textContent = `${searching ? `${matches.length}件の記事が見つかりました` : `新しい順に全${matches.length}記事`} · ${Math.min(count, matches.length)}件を表示`;
    more.hidden = count >= matches.length;
  }
  function search(updateURL = true) {
    if (!ready) return;
    const tokens = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    matches = rows.filter(row => (!category.value || row.category === category.value) && tokens.every(token => row.searchText.includes(token)));
    count = 24;
    if (updateURL) {
      const url = new URL(location.href);
      url.search = "";
      if (query.value.trim()) url.searchParams.set("q", query.value.trim());
      if (category.value) url.searchParams.set("category", category.value);
      history.replaceState(null, "", url);
    }
    render();
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    clearTimeout(timer);
    search();
  });
  query.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(search, 150);
  });
  category.addEventListener("change", () => search());
  more.addEventListener("click", () => { count += 24; render(); });
  window.addEventListener("popstate", () => {
    const state = new URLSearchParams(location.search);
    query.value = (state.get("q") || "").slice(0, 200);
    category.value = state.get("category") || "";
    search(false);
  });
  fetch(indexURL)
    .then(response => {
      if (!response.ok) throw new Error("index unavailable");
      return response.json();
    })
    .then(data => {
      rows = data.map(row => ({ ...row, searchText: normalize(`${row.headline} ${row.text} ${row.source}`) }));
      ready = true;
      search(false);
    })
    .catch(() => {
      status.textContent = "記事を読み込めませんでした。時間をおいて再読み込みしてください。";
    });
})();
