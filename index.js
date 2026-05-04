import core from '@actions/core';
import { context } from '@actions/github';
import fetch from 'node-fetch';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import axios from 'axios';

async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = 'sethcohen/github-releases-to-discord';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';
  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m✓ Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');
  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

/**
 * Removes carriage return characters.
 * @param {string} text The input text.
 * @returns {string} The text without carriage return characters.
 */
const removeCarriageReturn = (text) => text.replace(/\r/g, '');

/**
 * Removes HTML comments.
 * @param {string} text The input text.
 * @returns {string} The text without HTML comments.
 */
const removeHTMLComments = (text) => {
    let result = text;
    let prev;
    do {
        prev = result;
        result = prev.replace(/<!--.*?-->/gs, '');
    } while (result !== prev);
    return result;
};

/**
 * Reduces redundant newlines and spaces.
 * Keeps a maximum of 2 newlines to provide spacing between paragraphs.
 * @param {string} text The input text.
 * @returns {string} The text with reduced newlines.
 */
const reduceNewlines = (text) => text.replace(/\n\s*\n/g, (ws) => {
    const nlCount = (ws.match(/\n/g) || []).length;
    return nlCount >= 2 ? '\n\n' : '\n';
});

/**
 * Converts @mentions to GitHub profile links for valid GitHub usernames.
 * @param {string} text The input text.
 * @returns {string} The text with valid @mentions converted to links.
 */
const convertMentionsToLinks = (text) => text.replace(
    /(?<![/@\w])@((?!-)(?!.*?--)[a-zA-Z0-9](?:-?[a-zA-Z0-9]){0,37})(?![.\w/-])(?!.*\])/g,
    (match, name) => `[@${name}](https://github.com/${name})`
);

/**
 * Removes any GitHub PR, commit, or issue links from the text, including markdown links.
 * @param {string} text The input text.
 * @returns {string} The text without GitHub PR and commit links.
 */
const removeGithubReferenceLinks = (text) => text
    // Remove markdown links to PRs, commits, and issues
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^(\s)]+\/pull\/\d+\)/g, '')
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^(\s)]+\/commit\/\w+\)/g, '')
    .replace(/\[[^\]]*\]\(https:\/\/github\.com\/[^(\s)]+\/issues\/\d+\)/g, '')
    // Remove bare PR, commit, and issue URLs
    .replace(/https:\/\/github\.com\/[^(\s)]+\/pull\/\d+/g, '')
    .replace(/https:\/\/github\.com\/[^(\s)]+\/commit\/\w+/g, '')
    .replace(/https:\/\/github\.com\/[^(\s)]+\/issues\/\d+/g, '')
    // Remove empty parentheses left behind
    .replace(/\(\s*\)/g, '');

/**
 * Reduces headings to a smaller format if 'reduce_headings' is enabled.
 * Converts H3 to bold+underline, H2 to bold.
 * @param {string} text The input text.
 * @returns {string} The text with reduced heading sizes.
 */
const reduceHeadings = (text) => text
    .split('\n')
    .map((line) => {
        const h3 = line.match(/^\s*###\s+(.+?)\s*#*\s*$/);
        if (h3) {
            return `**__${h3[1].trim()}__**`;
        }

        const h2 = line.match(/^\s*##\s+(.+?)\s*#*\s*$/);
        if (h2) {
            return `**${h2[1].trim()}**`;
        }

        return line;
    })
    .join('\n');

/**
 * Converts PR, issue, and changelog links to markdown format, ignoring existing markdown links.
 * - PR links: `https://github.com/OWNER/REPO/pull/1` -> `[PR #1](https://github.com/OWNER/REPO/pull/1)`
 * - Issue links: `https://github.com/OWNER/REPO/issues/1` -> `[Issue #30](https://github.com/OWNER/REPO/issues/1)`
 * - Changelog links: `https://github.com/OWNER/REPO/compare/v1.0.0...v1.1.0` -> `[v1.0.0...v1.1.0](https://github.com/OWNER/REPO/compare/v1.0.0...v1.1.0)`
 * @param {string} text The input text.
 * @returns {string} The text with links converted to markdown format.
 */
const convertLinksToMarkdown = (text) => {
    // Extract existing markdown links and replace them with placeholders
    const markdownLinks = [];
    const textWithoutMarkdownLinks = text.replace(/\[.*?\]\(.*?\)/g, (link) => {
        markdownLinks.push(link);
        return `__MARKDOWN_LINK_PLACEHOLDER_${markdownLinks.length - 1}__`;
    });

    // Convert standalone PR, issue, and changelog URLs to markdown format
    let processedText = textWithoutMarkdownLinks
        .replace(/https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/pull\/(\d+)/g, (match, owner, repo, prNumber) => `[PR #${prNumber}](${match})`)
        .replace(/https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/issues\/(\d+)/g, (match, owner, repo, issueNumber) => `[Issue #${issueNumber}](${match})`)
        .replace(/https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/compare\/([v\w.-]+)\.\.\.([v\w.-]+)/g, (match, owner, repo, fromVersion, toVersion) => `[${fromVersion}...${toVersion}](${match})`);

    // Reinsert the original markdown links
    return processedText.replace(/__MARKDOWN_LINK_PLACEHOLDER_(\d+)__/g, (match, index) => markdownLinks[parseInt(index, 10)]);
};

/**
 * Stylizes a markdown body into an appropriate embed message style.
 * @param {string} description The description to format.
 * @returns {string} The formatted description.
 */
const formatDescription = (description) => {
    let edit = removeCarriageReturn(description ?? '');
    edit = removeHTMLComments(edit);
    edit = reduceNewlines(edit);

    if (core.getBooleanInput('remove_github_reference_links')) {
        edit = removeGithubReferenceLinks(edit);
    }
    edit = convertMentionsToLinks(edit);
    edit = convertLinksToMarkdown(edit);
    edit = edit.trim();

    if (core.getBooleanInput('reduce_headings')) {
        edit = reduceHeadings(edit);
    }

    return edit;
};

/**
 * Gets the max description length, defaulting to 4096 if not set or invalid.
 * @returns {number} The max description length.
 */
const getMaxDescription = () => {
    try {
        const max = core.getInput('max_description');
        if (max && !isNaN(max)) {
            return Math.min(parseInt(max, 10), 4096);
        }
    } catch (err) {
        core.warning(`Invalid max_description: ${err}`);
    }
    return 4096;
};

/**
 * Get the context of the action, returning a GitHub Release payload.
 * @returns {object} The context with release details.
 */
const getContext = () => {
    return resolveReleaseContext(context.payload.release, {
        body: core.getInput('release_body'),
        name: core.getInput('release_name'),
        html_url: core.getInput('release_html_url')
    });
};

/**
 * Resolves release data from either a GitHub release event or manual inputs.
 * @param {object|null|undefined} release The release payload from the event.
 * @param {object} manualInputs Manual fallback inputs.
 * @returns {object} The resolved release context.
 */
const resolveReleaseContext = (release, manualInputs) => {
    if (release) {
        return {
            body: release.body || '',
            name: release.name || '',
            html_url: release.html_url || ''
        };
    }

    return {
        body: manualInputs.body || '',
        name: manualInputs.name || '',
        html_url: manualInputs.html_url || ''
    };
};

/**
 * Limits the string to a maximum length, optionally adding a URL or clipping at a newline.
 * @param {string} str The string to limit.
 * @param {number} maxLength The maximum allowed length.
 * @param {string} [url] Optional URL for linking the truncated text.
 * @param {boolean} [clipAtLine=false] Whether to clip at the nearest newline.
 * @returns {string} The limited string.
 */
const limitString = (str, maxLength, url, clipAtLine = false) => {
    if (str.length <= maxLength) return str;

    const replacement = url
        ? `${clipAtLine ? '\n' : ''}([…](${url}))`
        : (clipAtLine ? '\n…' : '…');

    maxLength -= replacement.length;
    str = str.substring(0, maxLength);

    const lastNewline = str.search(new RegExp(`[^${clipAtLine ? '\\n' : '\\s'}]*$`));
    if (lastNewline > -1) {
        str = str.substring(0, lastNewline);
    }

    return str + replacement;
};

/**
 * Builds the embed message for the Discord webhook.
 * @param {string} name The title or name of the release.
 * @param {string} html_url The URL of the release.
 * @param {string} description The formatted description of the release.
 * @returns {object} The embed message to send in the webhook.
 */
const buildEmbedMessage = (name, html_url, description) => {
    const embedMsg = {
        title: limitString(name, 256),
        color: core.getInput('color'),
        description: limitString(description, Math.min(getMaxDescription(), 6000 - name.length)),
        footer: {}
    };

    if (html_url) {
        embedMsg.url = html_url;
    }

    if (core.getInput('custom_html_url')) {
        embedMsg.url = core.getInput('custom_html_url');
    }
    if (core.getInput('footer_title')) {
        embedMsg.footer.text = limitString(core.getInput('footer_title'), 2048);
    }
    if (core.getInput('footer_icon_url')) {
        embedMsg.footer.icon_url = core.getInput('footer_icon_url');
    }
    if (core.getInput('footer_timestamp') === 'true') {
        embedMsg.timestamp = new Date().toISOString();
    }

    return embedMsg;
};

/**
 * Sends the webhook request to Discord, handling rate limits (429) with retries.
 * @param {string} webhookUrl The URL of the Discord webhook.
 * @param {object} requestBody The payload to send in the webhook.
 * @param {number} [maxRetries=3] Maximum number of retries on rate limit.
 */
const sendWebhook = async (webhookUrl, requestBody, maxRetries = 3) => {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await fetch(`${webhookUrl}?wait=true`, {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.status === 429) {
                // Rate limited, get retry-after
                const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
                core.warning(`Rate limited by Discord. Retrying after ${retryAfter} seconds (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(res => setTimeout(res, retryAfter * 1000));
                attempt++;
                continue;
            }
            const data = await response.json();
            if (!response.ok) {
                core.setFailed(`Discord webhook error: ${JSON.stringify(data)}`);
            } else {
                core.info(JSON.stringify(data));
            }
            break;
        } catch (err) {
            core.setFailed(err.message);
            break;
        }
    }
    if (attempt > maxRetries) {
        core.setFailed('Exceeded maximum Discord webhook retry attempts due to rate limiting.');
    }
};

/**
 * Builds the request body for the Discord webhook.
 * @param {object} embedMsg The embed message to include in the request body.
 * @returns {object} The request body for the webhook.
 */
const buildRequestBody = (embedMsg) => {
    return {
        embeds: [embedMsg],
        ...(core.getInput('username') && { username: core.getInput('username') }),
        ...(core.getInput('avatar_url') && { avatar_url: core.getInput('avatar_url') }),
        ...(core.getInput('content') && { content: core.getInput('content') })
    };
};


/**
 * Main function to handle the action: get inputs, format the message, and send the webhook.
 */
const run = async () => {
    await validateSubscription();

    const webhookUrl = core.getInput('webhook_url');
    if (!webhookUrl) return core.setFailed('webhook_url not set.');

    const { body, html_url, name } = getContext();

    if (!name) {
        return core.setFailed('No GitHub release payload found. When using workflow_dispatch, pass release_name to the action.');
    }

    const description = formatDescription(body);

    const embedMsg = buildEmbedMessage(name, html_url, description);

    const requestBody = buildRequestBody(embedMsg);

    await sendWebhook(webhookUrl, requestBody);
};

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
    run()
        .then(() => core.info('Action completed successfully'))
        .catch(err => core.setFailed(err.message));
}

// Export utility functions for testing
export {
    removeCarriageReturn,
    removeHTMLComments,
    reduceNewlines,
    convertMentionsToLinks,
    removeGithubReferenceLinks,
    reduceHeadings,
    convertLinksToMarkdown,
    limitString,
    formatDescription,
    resolveReleaseContext,
    getContext,
    run
};
