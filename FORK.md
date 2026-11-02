# Maintained fork

## Origin and ownership

This is an unofficial fork of [prateekmedia/claude-agent-sdk-pi](https://github.com/prateekmedia/claude-agent-sdk-pi), maintained in [brunoorsolon/claude-agent-sdk-pi-puglab](https://github.com/brunoorsolon/claude-agent-sdk-pi-puglab) and prepared for npm as `@puglab/claude-agent-sdk-pi@1.0.22`. GitHub identifies this repository as a fork of that original repository, with the original Git history intact. The original repository remains the local `upstream` remote; `origin` is this fork. A fresh clone must add `upstream` itself.

The baseline is upstream npm `claude-agent-sdk-pi@1.0.22`, git commit `de1a64373e1c4839a177802eeeb894f611235ca3`, using `@anthropic-ai/claude-agent-sdk@0.2.126`. npm's `gitHead` matches that commit. The published tarball's `index.ts`, `package.json`, `README.md`, and `LICENSE` were compared byte-for-byte with the commit and match. Upstream `HEAD` and `master` also pointed to this commit when inspected; this was verified rather than assumed. The upstream tree contained no agent instructions, contribution guide, test suite, or CI workflow at that revision; its README supplied setup instructions.

The original MIT license and `Copyright (c) 2026 Prateek Sunal` are preserved unchanged in [LICENSE](LICENSE). Upstream authors own the original implementation. The fork's additions are the two compatibility repairs and their tests, followed by the separate distribution layer described below. Neither the original maintainer nor Anthropic endorses this fork. MIT permission covers the extension, not additional rights over Anthropic services, SDK dependencies, branding, or subscription access.

## Two layers, without branding in the upstream contribution

| Branch | Purpose |
| --- | --- |
| `fix/pi-context-tool-contracts` | Upstream-ready repairs, regressions, peer compatibility metadata, and functional README documentation. Keeps the original npm name. No fork banner, scoped package name, release automation, or this document. |
| `fork/npm-distribution` | The clean repair plus the unofficial-fork banner, scoped package metadata, this document, and `.github/workflows/publish.yml`. Intended for this fork's `master`, not upstream. |

The clean repair commit is `d545cd468bbef853dc958da6e08d7bb69382267a`. Propose the clean branch, or cherry-pick that commit, when the maintainer authorizes an upstream contribution. Never propose the distribution branch upstream. No upstream pull request, release tag, or npm publication has been made as part of preparation.

## Repairs and compatibility implications

1. **Effective Pi instructions:** the complete supplied `context.systemPrompt` now reaches the official SDK unchanged. Default mode appends it once to the Claude Code preset. The provider no longer rereads a nearest `AGENTS.md`, extracts only skills, rewrites `pi` into other words, or substitutes `.claude` paths. The matching tool-path alias rewriting is removed; ordinary built-in tool-name and argument-key translation stays intact.
2. **Custom-tool contracts:** the Agent SDK's high-level tool factory expects Zod shapes, not raw JSON Schema. The SDK-created server also exposes the MCP SDK's public low-level request handlers. The fork uses those handlers to advertise Pi's original JSON Schema directly, avoiding conversion altogether. Required fields, nested structures, arrays, unions, enums, references, records, descriptions, and constraints survive discovery. Invalid MCP envelopes report the offending tool by name. The permission callback still denies SDK execution; direct MCP calls still return the existing denial result, and unknown names retain a protocol error. Pi alone validates and executes real tool calls.

**Setting migration:** `appendSystemPrompt: false` no longer omits Pi instructions. It now sends the complete Pi prompt as a replacement system prompt, without the Claude Code preset. The default `true` retains that preset and appends Pi's complete prompt. Claude filesystem setting-source selection and strict-MCP defaults remain unchanged. Explicit Claude resources can add their own instructions; do not symlink duplicate Pi instructions into Claude resources. See the [README](README.md#context-loading) for isolated settings.

Production SDK versions are unchanged. `@modelcontextprotocol/sdk` is declared directly at the same compatible range already required by the installed Agent SDK; the lockfile retains version 1.29.0. Development dependencies retain upstream's Pi 0.74.x versions. The peer range now also admits Pi 1.4 and compatible later 1.x versions. Pi 1.x runtime compatibility is through Pi's extension-loader compatibility view, not a migration to the newer standalone `pi-ai` API. Direct standalone imports or type-checking against the Pi 1.x root API are not supported by this patch.

## Consumer reference and validation

The supplied read-only `ai-agents-sandbox-src-02-11-2026` reference has committed revision `8ec3344cac21e7fd810595fee37543e913e625e1`. Its committed `agents/pi/Dockerfile` pins Pi 1.4.0; the supplied working copy modifies only that pin to 1.5.0. Both were therefore checked. Its package manifest pins `pi-web-access@0.46.0`, `pi-subagents@0.84.0`, `pi-intercom@0.18.1`, and `pi-docparser@4.0.0`, matching the installed source modules inspected for managed schemas. The consumer repository was not modified. Integrating this fork there remains separate work.

| Check | Observed result |
| --- | --- |
| Unmodified 1.0.22, actual Pi 1.4.0 loader and SDK transport | Both defect regressions fail as expected: nearer-file instructions replace the supplied parent/role/project payload, and MCP discovery advertises empty custom-tool properties. |
| `npm test`, Pi 0.74.0 development loader | Six tests pass. |
| `npm test`, external Pi 1.4.0 loader | The same six tests pass. |
| `npm test`, external Pi 1.5.0 loader | The same six tests pass. |
| Disposable managed-schema discovery probe through Pi 1.5.0 and the actual SDK bridge | Exact JSON schema equality for 12 tools: `web_search`, `source_check`, `fetch_content`, `get_search_content`, `web_enable`, `intercom`, `document_parse`, `document_search`, `document_screenshot`, `subagent`, `subagent_wait`, and a distinct execution-blocking fixture. No managed tool was executed. |
| TypeScript 5.9.3, `tsc --noEmit -p tsconfig.json` | Passes against the retained development dependencies. |
| Locally packed scoped npm artifact, installed into a disposable Pi 1.5.0 consumer | All six seam tests pass using the installed package, not the source checkout. The artifact contains the seven expected files and excludes tests, workflows, and scratch data. |
| Distribution preflight | YAML parsing, version/name guard acceptance and rejection cases, lockfile identity, clean/fork code separation, and unchanged MIT license assertions pass. Actual GitHub Actions and npm OIDC execution remain unverified. |

The retained tests exercise parent, subagent-role, and project payload transmission despite a nearer `AGENTS.md`; replacement mode; actual SDK MCP discovery with meaningful schema constraints; custom-call argument delivery through Pi's registered-tool wrapper; SDK permission and execution denial; unknown-tool errors; text/thinking streaming and adaptive-thinking options; historical tool-result content; invalid envelopes; and cancellation. Transport fixtures are disposable and credential-free. They are not live Claude responses, subscription authentication, service-policy approval, or evidence of a successful npm deployment.

To reproduce from a checkout, run `npm ci --ignore-scripts` and `npm test` with Node 24. For a separately installed loader, use `PI_TEST_AGENT_ENTRY=file:///absolute/path/to/pi-coding-agent/dist/index.js npm test`. Development-only type checking can use an externally installed TypeScript 5.9.3 without adding it to package dependencies. The workflow repeats the runtime suite with exact Pi 0.74.0, 1.4.0, and 1.5.0 loaders.

Live subscription testing requires the maintainer's official human-controlled login. Credentials must not be shared in chat, extracted, impersonated, or routed through a custom proxy. Live service access, remote CI execution, and end-to-end npm publishing remain unverified. Thinking checks cover high/adaptive mode rather than every newer Pi reasoning level or live token budget. Initial branch upload was denied to the configured `puglab-agent` GitHub account; repository write permission is needed before remote delivery.

## Automatic npm publishing

The workflow is prepared, not deployed or exercised. It runs tests on pull requests, `master` pushes, and `fork-v*` tag pushes. Only a tag push in `brunoorsolon/claude-agent-sdk-pi-puglab` can publish. Publishing waits for all three Pi test jobs, requires the tagged commit to be reachable from this fork's `master`, and verifies both the scoped package name and `fork-v<package.json version>` tag. It uses GitHub-hosted runners, the `npm` environment, Node 24.22.1, and npm trusted publishing via OIDC rather than a stored publish token. Action revisions are pinned. The npm artifact includes only the extension, TypeScript configuration, documentation, license, screenshot, and standard npm metadata.

The maintainer must complete these steps before making a release:

1. Grant the configured GitHub actor write access, upload both feature branches, review the maintained branch, and merge it into this fork's `master`. Keep the clean upstream-ready branch separate. Protect `master` and the `fork-v*` release-tag pattern appropriately.
2. Confirm control of the npm `@puglab` scope and availability of `@puglab/claude-agent-sdk-pi`. If the package does not yet exist and npm requires a bootstrap publication before package-level publisher settings are available, the maintainer must perform that first publication through their own official npm login; this preparation does not publish it or collect credentials. An already published version cannot be published again by the workflow.
3. In npm's package settings, configure the GitHub trusted publisher with owner `brunoorsolon`, repository `claude-agent-sdk-pi-puglab`, workflow filename `publish.yml`, and environment `npm`. Explicitly allow direct `npm publish`, not stage-only publishing. Configure the matching GitHub environment; required reviewers are optional if fully automatic tag publishing is desired. Newly created npm publisher configurations currently expire unless their first successful publication occurs within two days, so coordinate setup with the intended release.
4. After validation and publication approval, create and push the matching release tag on the merged commit. The prepared first version is `1.0.22`, so its tag is `fork-v1.0.22`. Do not create that tag merely to test automation: it requests a real public npm publication. If 1.0.22 was already bootstrapped manually, use a new package version and matching new tag for the first automated release.

The package version starts at the upstream version as requested. npm versions are immutable: later fork-only changes cannot overwrite the existing scoped version. Each distinct publication needs a distinct version, even if upstream has not advanced. Preserve the upstream baseline in this document when that happens. The workflow does not bump versions or create tags automatically.

Official references: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/). Trusted publishing requires npm 11.5.1 or later and Node 22.14.0 or later. The package's repository URL must match this fork; public provenance also requires the repository and package to be public. No traditional npm token is needed by the prepared workflow.

## Exact consumer pin and upstream maintenance

After publication, use `pi install npm:@puglab/claude-agent-sdk-pi@1.0.22`, or the equivalent exact package source in the consumer's own configuration. Keep any consumer dependency lockfile. A git alternative is `pi install git:github.com/brunoorsolon/claude-agent-sdk-pi-puglab@fork-v1.0.22` after that tag exists; an exact full commit SHA is preferable if tag mutability is a concern. Neither installing nor updating the sandbox is part of this change.

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

Review upstream changes to the prompt/settings seam, MCP contracts, tool denial, and SDK version before resolving conflicts. Drop repairs that upstream has independently implemented rather than maintaining competing versions. Repeat the focused checks against the consumer's current pins, update the baseline and evidence here, and use a feature-branch pull request to update this fork's `master`. Reconcile package metadata and choose an unused release version before tagging. Never merge the distribution layer into the clean contribution branch.

If upstream releases equivalent fixes, validate that exact upstream release with the same seams and current consumer pins. Remove the scoped fork source using `pi remove npm:@puglab/claude-agent-sdk-pi`, then install `pi install npm:claude-agent-sdk-pi@<verified-upstream-version>` and reload Pi. Update declarative consumer configuration instead if it owns installation. Avoid loading both packages simultaneously: they register the same provider ID. Replacement-mode settings still need an explicit review when returning to upstream, because upstream's semantics may differ.
