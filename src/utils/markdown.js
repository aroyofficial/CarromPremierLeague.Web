// Small Markdown renderer for assistant replies. Everything is HTML-escaped first, so model output
// can never inject markup; only the tags produced here reach v-html.

const escapeHtml = (text) =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const inline = (text) => {
	const codes = [];
	let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
		codes.push(code);
		return `\u0000${codes.length - 1}\u0000`;
	});
	html = html
		.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_]+)__/g, "<strong>$1</strong>")
		.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
		.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
		.replace(/~~([^~]+)~~/g, "<del>$1</del>");
	return html.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`);
};

const isTableDivider = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const cells = (line) =>
	line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());

export function renderMarkdown(source) {
	const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
	const out = [];
	let paragraph = [];
	let list = null;

	const flushParagraph = () => {
		if (paragraph.length) out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.tag}>`);
		list = null;
	};
	const flush = () => {
		flushParagraph();
		flushList();
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];

		if (/^\s*```/.test(line)) {
			flush();
			const code = [];
			index += 1;
			while (index < lines.length && !/^\s*```/.test(lines[index])) {
				code.push(lines[index]);
				index += 1;
			}
			out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
			continue;
		}

		if (line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
			flush();
			const head = cells(line);
			const rows = [];
			index += 2;
			while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
				rows.push(cells(lines[index]));
				index += 1;
			}
			index -= 1;
			const headHtml = head.map((cell) => `<th scope="col">${inline(cell)}</th>`).join("");
			const bodyHtml = rows
				.map((row) => `<tr>${head.map((_, column) => `<td>${inline(row[column] ?? "")}</td>`).join("")}</tr>`)
				.join("");
			out.push(`<div class="md-table"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
			continue;
		}

		const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
		if (heading) {
			flush();
			out.push(`<p class="md-heading">${inline(heading[1])}</p>`);
			continue;
		}

		const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
		const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
		if (bullet || numbered) {
			flushParagraph();
			const tag = bullet ? "ul" : "ol";
			if (!list || list.tag !== tag) {
				flushList();
				list = { tag, items: [] };
			}
			list.items.push((bullet || numbered)[1]);
			continue;
		}

		if (!line.trim()) {
			flush();
			continue;
		}

		if (list && /^\s{2,}\S/.test(line)) {
			list.items[list.items.length - 1] += ` ${line.trim()}`;
			continue;
		}
		flushList();
		paragraph.push(line.trim());
	}
	flush();
	return out.join("");
}
