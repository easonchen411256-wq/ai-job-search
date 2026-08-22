import process from "node:process";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  return { status: response.status, finalUrl: response.url, text };
}

export async function bingSearch(query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&mkt=zh-CN&setlang=zh-hans&cc=cn&count=15`;
  const { status, text } = await request(url);
  if (status !== 200) throw new Error(`Bing HTTP ${status}`);
  const results = [];
  const blockPattern = /<li class="b_algo"[\s\S]*?<\/li>/g;
  for (const block of text.match(blockPattern) || []) {
    const linkMatch = block.match(/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    results.push({
      title: decodeEntities(linkMatch[2]),
      url: linkMatch[1],
      snippet: snippetMatch ? decodeEntities(snippetMatch[1]) : "",
    });
  }
  return results;
}

export async function ddgSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const { status, text } = await request(url);
  if (status !== 200 && status !== 202) throw new Error(`DDG HTTP ${status}`);
  const results = [];
  const blockPattern = /<div class="result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
  for (const block of text.match(blockPattern) || []) {
    const linkMatch = block.match(/class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    let href = linkMatch[1];
    const real = href.match(/uddg=([^&]+)/);
    if (real) {
      try { href = decodeURIComponent(real[1]); } catch { /* keep original */ }
    }
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    results.push({
      title: decodeEntities(linkMatch[2]),
      url: href,
      snippet: snippetMatch ? decodeEntities(snippetMatch[1]) : "",
    });
  }
  return results;
}

export async function fetchText(url) {
  const { status, finalUrl, text } = await request(url);
  return { status, finalUrl, text };
}

export async function sogouSearch(query) {
  const url = `https://m.sogou.com/web/searchList.jsp?keyword=${encodeURIComponent(query)}`;
  const { status, text } = await request(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    },
  });
  if (status !== 200) throw new Error(`Sogou HTTP ${status}`);
  const results = [];
  const seen = new Set();
  const re = /href="\.\/id=[^"]*?url=(https?%3A%2F%2F[^&]+)[^"]*?title=([^&"]+)/g;
  for (const match of text.matchAll(re)) {
    let target;
    try { target = decodeURIComponent(match[1]); } catch { continue; }
    if (seen.has(target)) continue;
    seen.add(target);
    let title;
    try { title = decodeURIComponent(match[2]); } catch { title = match[2]; }
    results.push({ title, url: target, snippet: "" });
  }
  return results;
}

async function main() {
  const [command, input] = process.argv.slice(2);
  try {
    if (command === "bing") {
      process.stdout.write(JSON.stringify(await bingSearch(input)));
    } else if (command === "ddg") {
      process.stdout.write(JSON.stringify(await ddgSearch(input)));
    } else if (command === "sogou") {
      process.stdout.write(JSON.stringify(await sogouSearch(input)));
    } else if (command === "fetch") {
      const { status, finalUrl, text } = await fetchText(input);
      process.stdout.write(JSON.stringify({ status, finalUrl, text }));
    } else {
      throw new Error("unknown command");
    }
  } catch (error) {
    process.stderr.write(error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
