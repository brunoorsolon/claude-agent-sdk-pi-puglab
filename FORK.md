# Maintained fork

## Origin and ownership

This is an unofficial fork of [prateekmedia/claude-agent-sdk-pi](https://github.com/prateekmedia/claude-agent-sdk-pi), maintained in [brunoorsolon/claude-agent-sdk-pi-puglab](https://github.com/brunoorsolon/claude-agent-sdk-pi-puglab). Its npm package name is `@puglab/claude-agent-sdk-pi`. The fork preserves the original Git history. Use `origin` for this fork and `upstream` for the original repository; a fresh clone must add `upstream` itself.

The baseline is upstream npm `claude-agent-sdk-pi@1.0.22`, git commit `de1a64373e1c4839a177802eeeb894f611235ca3`, using `@anthropic-ai/claude-agent-sdk@0.2.126`. The upstream package's npm `gitHead` identifies that commit.

The original MIT license and `Copyright (c) 2026 Prateek Sunal` are preserved unchanged in [LICENSE](LICENSE). Upstream authors own the original implementation. The fork's additions are the two compatibility repairs and their tests, followed by the separate distribution layer described below. Neither the original maintainer nor Anthropic endorses this fork. MIT permission covers the extension, not additional rights over Anthropic services, SDK dependencies, branding, or subscription access.

## Two layers, without branding in the upstream contribution

| Branch | Purpose |
| --- | --- |
| `fix/pi-context-tool-contracts` | Upstream-ready repairs, regressions, peer compatibility metadata, and functional README documentation. Keeps the original npm name. No fork banner, scoped package name, release automation, or this document. |
| `fork/npm-distribution` | The clean repair plus the unofficial-fork banner, scoped package metadata, this document, and `.github/workflows/publish.yml`. Intended for this fork's `master`, not upstream. |

Propose the clean branch when offering the repairs upstream. Never propose the distribution branch upstream. Keep commit-specific preparation history, review evidence, and publication status in the corresponding pull request or release record, not in the shipped package documentation.

## Repairs and compatibility implications

1. **Effective Pi instructions:** the complete supplied `context.systemPrompt` now reaches the official SDK unchanged. Default mode appends it once to the Claude Code preset. The provider no longer rereads a nearest `AGENTS.md`, extracts only skills, rewrites `pi` into other words, or substitutes `.claude` paths. The matching tool-path alias rewriting is removed; ordinary built-in tool-name and argument-key translation stays intact.
2. **Custom-tool contracts:** the Agent SDK's high-level tool factory expects Zod shapes, not raw JSON Schema. The SDK-created server also exposes the MCP SDK's public low-level request handlers. The fork uses those handlers to advertise Pi's original JSON Schema directly, avoiding conversion altogether. Required fields, nested structures, arrays, unions, enums, references, records, descriptions, and constraints survive discovery. Invalid MCP envelopes report the offending tool by name. The permission callback still denies SDK execution; direct MCP calls still return the existing denial result, and unknown names return a protocol error. Pi alone validates and executes real tool calls.

**Setting migration:** `appendSystemPrompt: false` no longer omits Pi instructions. It now sends the complete Pi prompt as a replacement system prompt, without the Claude Code preset. The default `true` retains that preset and appends Pi's complete prompt. Claude filesystem setting-source selection and strict-MCP defaults remain unchanged. Explicit Claude resources can add their own instructions; do not symlink duplicate Pi instructions into Claude resources. See the [README](README.md#context-loading) for isolated settings.

Production SDK versions are unchanged. `@modelcontextprotocol/sdk` is declared directly at the same compatible range already required by the installed Agent SDK; the lockfile retains version 1.29.0. Development dependencies retain upstream's Pi 0.74.x versions. The peer range now also admits Pi 1.4 and compatible later 1.x versions. Pi 1.x runtime compatibility is through Pi's extension-loader compatibility view, not a migration to the newer standalone `pi-ai` API. Direct standalone imports or type-checking against the Pi 1.x root API are not supported by this patch.

## Verification and consumer integration

Consumer integration is separate from maintaining this package. Check the consumer's current Pi, managed-tool, and Claude Code executable pins before validating a release. Record the exact candidate, commands, results, and unavailable evidence in its pull request and release records.

The retained tests exercise parent, subagent-role, and project payload transmission despite a nearer `AGENTS.md`; replacement mode; actual SDK MCP discovery with meaningful schema constraints; custom-call argument delivery through Pi's registered-tool wrapper; SDK permission and execution denial; unknown-tool errors; text/thinking streaming and adaptive-thinking options; historical tool-result content; invalid envelopes; and cancellation. Transport fixtures are disposable and credential-free. They are not live Claude responses, subscription authentication, service-policy approval, or evidence of a successful npm deployment. Schema discovery checks establish transport preservation, not acceptance of every JSON Schema keyword by Claude Code or the remote API.

To reproduce from a checkout, run `npm ci --ignore-scripts` and `npm test` with Node 24. For a separately installed loader, use `PI_TEST_AGENT_ENTRY=file:///absolute/path/to/pi-coding-agent/dist/index.js npm test`. Development-only type checking can use an externally installed TypeScript 5.9.3 without adding it to package dependencies. The workflow repeats the runtime suite with exact Pi 0.74.0, 1.4.0, and 1.5.0 loaders.

Live subscription testing requires the maintainer's official human-controlled login. Credentials must not be shared in chat, extracted, impersonated, or routed through a custom proxy. Verify live service access and end-to-end npm publishing separately from the transport fixtures. Thinking checks cover high/adaptive mode rather than every newer Pi reasoning level or live token budget.

## Automatic npm publishing

The workflow runs tests on pull requests, `master` pushes, and published GitHub Releases. Only a published GitHub Release with a `fork-v*` tag in `brunoorsolon/claude-agent-sdk-pi-puglab` can publish to npm; pushing a tag alone does not publish. Publishing waits for all three Pi test jobs, requires the tagged commit to be reachable from this fork's `master`, and verifies both the scoped package name and `fork-v<package.json version>` release tag. It uses GitHub-hosted runners, Node 24.22.1, and npm trusted publishing via OIDC rather than a stored publish token. No GitHub environment is required. Action revisions are pinned. The npm artifact includes only the extension, TypeScript configuration, documentation, license, screenshot, and standard npm metadata.

The maintainer must complete these steps before making a release:

1. Review the maintained feature branch and merge it into this fork's `master`. Keep the clean upstream-ready branch separate. Protect `master` and the `fork-v*` release-tag pattern appropriately.
2. Confirm control of the npm `@puglab` scope and package name `@puglab/claude-agent-sdk-pi`. If the package does not yet exist and npm requires a bootstrap publication before package-level publisher settings are available, the maintainer must perform that first publication through their own official npm login. An already published version cannot be published again by the workflow.
3. In npm's package settings, configure the GitHub trusted publisher with owner `brunoorsolon`, repository `claude-agent-sdk-pi-puglab`, and workflow filename `publish.yml`. Leave the environment field blank. Explicitly allow direct `npm publish`, not stage-only publishing. No GitHub environment or stored npm token is required. Newly created npm publisher configurations currently expire unless their first successful publication occurs within two days, so coordinate setup with the intended release.
4. After validation and publication approval, publish a GitHub Release whose tag points to the merged commit and matches the unused package version. For example, package version `1.1.0` requires release tag `fork-v1.1.0`. Publishing the GitHub Release requests a real public npm publication; creating or pushing a tag alone does not. Never reuse an already published npm version, including one published manually.

Fork versions can match their upstream baseline, but npm versions are immutable: fork-only changes cannot overwrite an existing scoped version. Each distinct publication needs a distinct version, even if upstream has not advanced. Preserve the upstream baseline in this document when that happens. The workflow does not bump versions or create tags automatically.

Official references: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/). Trusted publishing requires npm 11.5.1 or later and Node 22.14.0 or later. The package's repository URL must match this fork; public provenance also requires the repository and package to be public. No traditional npm token is needed by the workflow.

## Exact consumer pin and upstream maintenance

After publication, use `pi install npm:@puglab/claude-agent-sdk-pi@1.0.22`, or the equivalent exact package source in the consumer's own configuration. Keep any consumer dependency lockfile. A git alternative is `pi install git:github.com/brunoorsolon/claude-agent-sdk-pi-puglab@fork-v1.0.22` after that tag exists; an exact full commit SHA is preferable if tag mutability is a concern. Manage consumer installation and updates in the consumer repository.

To incorporate upstream updates without sending fork metadata back:

```bash
git remote add upstream https://github.com/prateekmedia/claude-agent-sdk-pi.git # once per clone
git fetch upstream
git switch fix/pi-context-tool-contracts
git merge upstream/master
npm ci --ignore-scripts
npm test
git switch fork/npm-distribution
git merge fix/pi-context-tool-contracts
```

Review upstream changes to the prompt/settings seam, MCP contracts, tool denial, and SDK version before resolving conflicts. Drop repairs that upstream has independently implemented rather than maintaining competing versions. Repeat the focused checks against the consumer's current pins, update the baseline here, record validation evidence in the pull request, and use that feature-branch pull request to update this fork's `master`. Reconcile package metadata and choose an unused release version before tagging. Never merge the distribution layer into the clean contribution branch.

If upstream releases equivalent fixes, validate that exact upstream release with the same seams and current consumer pins. Remove the scoped fork source using `pi remove npm:@puglab/claude-agent-sdk-pi`, then install `pi install npm:claude-agent-sdk-pi@<verified-upstream-version>` and reload Pi. Update declarative consumer configuration instead if it owns installation. Avoid loading both packages simultaneously: they register the same provider ID. Replacement-mode settings still need an explicit review when returning to upstream, because upstream's semantics may differ.
