"use strict";

// Client-side rendering for run pages.
// Fetches per-run JSON data and renders sample cards, replicating
// the logic previously done server-side in Python.

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function getScoreDisplay(scores) {
    if (!scores || Object.keys(scores).length === 0) {
        return ["—", "score-na"];
    }
    const keys = ["harmful_action_classifier", "bfcl_scorer", "expression_equivalance"];
    for (const key of keys) {
        if (!(key in scores)) continue;
        const val = scores[key].value;
        if (key === "harmful_action_classifier") {
            if (typeof val === "number") {
                return val > 0.5 ? ["Harmful", "score-harmful"] : ["Not harmful", "score-ok"];
            }
            return [String(val), "score-na"];
        } else if (key === "bfcl_scorer") {
            return val === 1 ? ["Correct", "score-ok"] : ["Incorrect", "score-harmful"];
        } else if (key === "expression_equivalance") {
            if (val === "C") return ["Correct", "score-ok"];
            if (val === "I") return ["Incorrect", "score-harmful"];
            return [String(val), "score-na"];
        }
    }
    const firstKey = Object.keys(scores)[0];
    return [firstKey + ": " + scores[firstKey].value, "score-na"];
}

function renderMessage(msg) {
    const role = msg.role;
    const visible = msg.visible || "";
    const reasoning = msg.reasoning;
    const roleClass = "msg-" + role;

    let cotHtml = "";
    if (reasoning) {
        cotHtml =
            '<div class="cot-section">' +
            '<div class="cot-toggle" onclick="this.parentElement.classList.toggle(\'open\')">&#9654; Chain of thought</div>' +
            '<pre class="cot-text">' + escapeHtml(reasoning) + "</pre>" +
            "</div>";
    }

    let preview = escapeHtml(visible.slice(0, 120)).trim();
    if (visible.length > 120) preview += "...";

    return (
        '<div class="message ' + roleClass + '">' +
        '<div class="msg-header" onclick="this.parentElement.classList.toggle(\'msg-open\')">' +
        '<span class="msg-toggle">&#9654;</span>' +
        '<span class="msg-role">' + escapeHtml(role) + "</span>" +
        '<span class="msg-preview">' + preview + "</span>" +
        "</div>" +
        '<div class="msg-body">' +
        cotHtml +
        '<pre class="msg-text">' + escapeHtml(visible) + "</pre>" +
        "</div>" +
        "</div>"
    );
}

function renderSample(sample, index, sharedMessages) {
    const scores = sample.scores || {};
    const [scoreText, scoreClass] = getScoreDisplay(scores);
    const sampleId = sample.id || "sample_" + index;
    const epoch = sample.epoch || 1;

    // Render shared messages (system/user) then per-sample messages (assistant/tool)
    const allMessages = sharedMessages.concat(sample.messages || []);
    const msgsHtml = allMessages.map(renderMessage).join("\n");

    // Score explanations
    let scoreDetail = "";
    for (const [skey, sval] of Object.entries(scores)) {
        const explanation = sval.explanation;
        const answer = sval.answer;
        if (explanation) {
            scoreDetail += '<div class="score-detail"><strong>' + escapeHtml(skey) + ":</strong> " + escapeHtml(String(sval.value));
            if (answer) {
                scoreDetail += " — answer: " + escapeHtml(String(answer));
            }
            scoreDetail += "<br><em>" + escapeHtml(explanation) + "</em></div>";
        }
    }

    return (
        '<div class="sample">' +
        '<div class="sample-header" onclick="this.parentElement.classList.toggle(\'open\')">' +
        '<span class="sample-toggle">&#9654;</span>' +
        '<span class="sample-id">' + escapeHtml(String(sampleId)) + "</span>" +
        '<span class="sample-epoch">epoch ' + epoch + "</span>" +
        '<span class="score-badge ' + scoreClass + '">' + escapeHtml(scoreText) + "</span>" +
        "</div>" +
        '<div class="sample-body">' +
        msgsHtml +
        scoreDetail +
        "</div></div>"
    );
}

(async function () {
    const meta = JSON.parse(document.getElementById("run-meta").textContent);
    const dataUrl = ROOT_PREFIX + meta.data_file;

    try {
        const resp = await fetch(dataUrl);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();

        const sharedMessages = data.shared_messages || [];
        const samples = data.samples || [];

        // Count harmful
        let nHarmful = 0;
        for (const s of samples) {
            const hac = (s.scores || {}).harmful_action_classifier;
            if (hac && typeof hac.value === "number" && hac.value > 0.5) {
                nHarmful++;
            }
        }

        document.getElementById("sample-count").textContent =
            samples.length + " samples (" + nHarmful + " harmful)";

        // Render in chunks to avoid blocking the main thread on large runs
        const container = document.getElementById("samples");
        container.innerHTML = "";
        const CHUNK = 50;
        for (let i = 0; i < samples.length; i += CHUNK) {
            const chunk = samples.slice(i, i + CHUNK);
            const html = chunk.map((s, j) => renderSample(s, i + j, sharedMessages)).join("");
            container.insertAdjacentHTML("beforeend", html);
            // Yield to browser between chunks
            if (i + CHUNK < samples.length) {
                await new Promise((r) => setTimeout(r, 0));
            }
        }
    } catch (err) {
        document.getElementById("samples").innerHTML =
            '<p style="color:red">Failed to load sample data: ' + escapeHtml(String(err)) + "</p>";
    }
})();
