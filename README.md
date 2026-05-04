[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# GitHub Releases to Discord Action

Easily notify your Discord community about new GitHub releases! This GitHub Action automatically sends a beautifully formatted Discord embed message with your release notes whenever you publish a release on GitHub.

**Main Benefits:**

- Instantly share release changelogs with your Discord server.
- Highly customizable message appearance and content.
- Simple setup—no coding required.
- Supports advanced formatting and filtering for professional notifications.

---

## Features

- **Automatic Release Notifications:** Sends a Discord embed when a GitHub release is published.
- **Clean Formatting:**
  - Removes carriage returns and HTML comments.
  - Optimizes whitespace and paragraph spacing.
- **Mention & Link Handling:**
  - Converts `@mentions` to clickable GitHub profile links.
  - Converts PR, issue, and changelog URLs to Markdown links.
  - Optionally removes PR, commit, and issue links for cleaner messages.
- **Heading Reduction:**
  - Optionally reduces heading sizes for compact display.
- **Custom Embed Appearance:**
  - Set color, username, avatar, footer, and more.
- **Length Management:**
  - Ensures messages fit Discord's embed limits, trimming and linking as needed.
- **Error Handling:**
  - Clear errors for missing or invalid inputs.
- **Easy Integration:**
  - Works with any public or private repository.

---

## Quick Start

### 1. Create a Discord Webhook

- Go to your Discord server settings → **Integrations** → **Webhooks**.
- Click **Create Webhook** and copy the webhook URL.

### 2. Add the Action to Your Workflow

Create (or update) `.github/workflows/github-releases-to-discord.yml`:

```yaml
on:
  release:
    types: [published]

jobs:
  github-releases-to-discord:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: GitHub Releases to Discord
        uses: step-security/github-releases-to-discord@v1
        with:
          webhook_url: ${{ secrets.WEBHOOK_URL }}
          color: "2105893"
          username: "Release Changelog"
          avatar_url: "https://cdn.discordapp.com/avatars/487431320314576937/bd64361e4ba6313d561d54e78c9e7171.png"
          content: "||@everyone||"
          footer_title: "Changelog"
          reduce_headings: true
```

### 3. Optional: Test with `workflow_dispatch`

If you want to test the action manually without relying on cloning and using `act`, you can add `workflow_dispatch` and pass release fields into the action:

Example inputs:

```yaml
release_name: v1.2.3
release_body: |
  ## Changes
  - Added manual testing support
  - Verified Discord webhook output
release_html_url: https://github.com/owner/repo/releases/tag/v1.2.3
```

```yaml
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      release_name:
        description: Release title to post
        required: true
      release_body:
        description: Release notes body to post
        required: true
      release_html_url:
        description: Release URL to link in Discord
        required: false

jobs:
  github-releases-to-discord:
    runs-on: ubuntu-latest
    steps:
      - name: GitHub Releases to Discord
        uses: step-security/github-releases-to-discord@v1
        with:
          webhook_url: ${{ secrets.WEBHOOK_URL }}
          release_name: ${{ inputs.release_name }}
          release_body: ${{ inputs.release_body }}
          release_html_url: ${{ inputs.release_html_url }}
```

### 4. Add Your Webhook URL as a Secret

- In your GitHub repo, go to **Settings → Secrets and variables → Actions**.
- Add a new secret named `WEBHOOK_URL` and paste your Discord webhook URL.

---

## Configuration Options

| Input Name                     | Required | Default     | Description                                                        |
|--------------------------------|----------|-------------|--------------------------------------------------------------------|
| `webhook_url`                  | ✔        |             | Discord webhook URL (use a GitHub secret).                         |
| `color`                        | ❌       | 2105893     | Embed color (decimal).                                             |
| `username`                     | ❌       |             | Webhook username.                                                  |
| `avatar_url`                   | ❌       |             | Webhook avatar image URL.                                          |
| `custom_html_url`              | ❌       |             | Custom URL for the embed title (overrides GitHub release URL).     |
| `content`                      | ❌       |             | Additional message content (e.g., `@everyone`).                    |
| `release_name`                 | ❌       |             | Manual release title for `workflow_dispatch` testing.              |
| `release_body`                 | ❌       |             | Manual release body for `workflow_dispatch` testing.               |
| `release_html_url`             | ❌       |             | Manual release URL for `workflow_dispatch` testing.                |
| `footer_title`                 | ❌       |             | Footer title.                                                      |
| `footer_icon_url`              | ❌       |             | Footer icon image URL.                                             |
| `footer_timestamp`             | ❌       | false       | Show timestamp in footer (`true`/`false`).                         |
| `max_description`              | ❌       | 4096        | Max description length (Discord limit: 4096).                      |
| `remove_github_reference_links`| ❌       | false       | Remove PR, commit, and issue links from the description.           |
| `reduce_headings`              | ❌       | false       | Reduce heading sizes for compact display.                          |

---

## Example Output

![Discord Embed Example](https://i.imgur.com/ovr0gTL.png)

---

## Best Practices & Notes

- **Use Secrets for Webhook URLs:** Never commit your Discord webhook URL directly to your repository.
- **Discord Embed Limits:**
  - Title: 256 characters max
  - Description: 4096 characters max
  - The action will trim and link if limits are exceeded.
- **Release Body Formatting:**
  - Use Markdown in your release notes for best results.
- **Private Repos:**
  - The action works for both public and private repositories.
- **Manual Testing:**
  - Use `release_name`, `release_body`, and optionally `release_html_url` when triggering the workflow with `workflow_dispatch`.

---

## Troubleshooting & FAQ

**Q: The action didn't post to Discord!**

- Check that your webhook URL is correct and not expired.
- Ensure the `webhook_url` secret is set in your repository.
- Review the Actions log for error messages.

**Q: My message is cut off.**

- Discord has strict embed limits. The action trims long messages and adds a link if needed.

**Q: How do I customize the embed?**

- Use the configuration options above to set color, username, avatar, footer, and more.

**Q: Can I mention everyone or specific roles?**

- Use the `content` input (e.g., `content: "@everyone"`).

---

## License

[MIT License](LICENSE)
