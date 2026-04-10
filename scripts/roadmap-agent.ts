#!/usr/bin/env npx tsx
/**
 * Roadmap Agent Orchestrator
 *
 * Reads ROADMAP.md, picks the next uncompleted feature, and runs it through
 * a pipeline of specialized agents. Each agent's output feeds into the next.
 * After the code reviewer approves, a PR is created for human review.
 *
 * Usage:
 *   npx tsx scripts/roadmap-agent.ts --feature "MoneyPuck xG adapter"
 *   npx tsx scripts/roadmap-agent.ts --next
 *   npx tsx scripts/roadmap-agent.ts --list
 */

import { query, type AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(ROOT, ".claude", "agents");
const ROADMAP_PATH = path.join(ROOT, "ROADMAP.md");
const WORKTREE_BASE = path.join(ROOT, "worktrees");
const MAX_REVIEW_ROUNDS = 2;
const MAX_BUDGET_PER_AGENT = 2.0; // USD

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoadmapItem {
  section: string;
  name: string;
  description: string;
  completed: boolean;
}

interface AgentMeta {
  slug: string;
  name: string;
  model: string;
  tools: string[];
  description: string;
  prompt: string;
}

interface PipelineResult {
  agent: string;
  output: string;
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  numTurns: number;
}

interface RunLog {
  feature: string;
  branch: string;
  startedAt: string;
  finishedAt?: string;
  results: PipelineResult[];
  totalCostUsd: number;
  prUrl?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// ROADMAP parser
// ---------------------------------------------------------------------------

function parseRoadmap(): RoadmapItem[] {
  const content = fs.readFileSync(ROADMAP_PATH, "utf-8");
  const items: RoadmapItem[] = [];
  let currentSection = "";

  for (const line of content.split("\n")) {
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Match list items: - **Name** - Description  or  - ~~**Name**~~ (completed)
    const completedMatch = line.match(
      /^-\s+~~\*\*(.+?)\*\*\s*[-–]\s*(.+?)~~\s*$/
    );
    if (completedMatch) {
      items.push({
        section: currentSection,
        name: completedMatch[1].trim(),
        description: completedMatch[2].trim(),
        completed: true,
      });
      continue;
    }

    const openMatch = line.match(/^-\s+\*\*(.+?)\*\*\s*[-–]\s*(.+)$/);
    if (openMatch) {
      items.push({
        section: currentSection,
        name: openMatch[1].trim(),
        description: openMatch[2].trim(),
        completed: false,
      });
    }
  }

  return items;
}

function getNextFeature(items: RoadmapItem[]): RoadmapItem | undefined {
  return items.find((i) => !i.completed);
}

function findFeature(
  items: RoadmapItem[],
  name: string
): RoadmapItem | undefined {
  const lower = name.toLowerCase();
  return items.find(
    (i) => !i.completed && i.name.toLowerCase().includes(lower)
  );
}

// ---------------------------------------------------------------------------
// Agent definition loader
// ---------------------------------------------------------------------------

function loadAgentMeta(slug: string): AgentMeta {
  const filePath = path.join(AGENTS_DIR, `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf-8");

  // Parse YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error(`Invalid agent file: ${filePath}`);

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  const getName = (fm: string) =>
    fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? slug;
  const getModel = (fm: string) =>
    fm.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? "claude-opus-4-6";
  const getDesc = (fm: string) =>
    fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const getTools = (fm: string) => {
    const match = fm.match(/^tools:\s*\[(.+)\]$/m);
    if (!match) return ["Read", "Grep", "Glob"];
    return match[1].split(",").map((t) => t.trim());
  };

  return {
    slug,
    name: getName(frontmatter),
    model: getModel(frontmatter),
    tools: getTools(frontmatter),
    description: getDesc(frontmatter),
    prompt: body,
  };
}

function loadAllAgents(): Map<string, AgentMeta> {
  const agents = new Map<string, AgentMeta>();
  const slugs = [
    "sully-pm",
    "gretz-tech-lead",
    "howe-designer",
    "orr-backend",
    "lemieux-frontend",
    "hasek-devops",
    "gabe-reviewer",
    "cherry-hockey",
  ];
  for (const slug of slugs) {
    agents.set(slug, loadAgentMeta(slug));
  }
  return agents;
}

function toAgentDefinition(meta: AgentMeta): AgentDefinition {
  return {
    description: meta.description,
    prompt: meta.prompt,
    model: meta.model,
    tools: meta.tools,
  };
}

// ---------------------------------------------------------------------------
// Git worktree management
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createWorktree(featureName: string): {
  branch: string;
  worktreePath: string;
} {
  const branch = `agent/${slugify(featureName)}`;
  const worktreePath = path.join(WORKTREE_BASE, slugify(featureName));

  if (!fs.existsSync(WORKTREE_BASE)) {
    fs.mkdirSync(WORKTREE_BASE, { recursive: true });
  }

  // Check if branch already exists
  try {
    execSync(`git rev-parse --verify ${branch}`, {
      cwd: ROOT,
      stdio: "ignore",
    });
    // Branch exists, create worktree from it
    if (!fs.existsSync(worktreePath)) {
      execSync(`git worktree add "${worktreePath}" ${branch}`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    }
  } catch {
    // Branch doesn't exist, create new one
    if (fs.existsSync(worktreePath)) {
      execSync(`git worktree remove "${worktreePath}" --force`, {
        cwd: ROOT,
        stdio: "ignore",
      });
    }
    execSync(`git worktree add "${worktreePath}" -b ${branch} main`, {
      cwd: ROOT,
      stdio: "inherit",
    });
  }

  return { branch, worktreePath };
}

function cleanupWorktree(worktreePath: string): void {
  try {
    execSync(`git worktree remove "${worktreePath}" --force`, {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    // Already cleaned up
  }
}

// ---------------------------------------------------------------------------
// Agent runner
// ---------------------------------------------------------------------------

async function runAgent(
  agentMeta: AgentMeta,
  taskPrompt: string,
  cwd: string,
  context?: string
): Promise<PipelineResult> {
  const fullPrompt = context
    ? `## Context from previous agents\n\n${context}\n\n## Your task\n\n${taskPrompt}`
    : taskPrompt;

  const start = Date.now();
  let output = "";
  let costUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let numTurns = 0;

  log(`  Running ${agentMeta.name}...`);

  const q = query({
    prompt: fullPrompt,
    options: {
      model: agentMeta.model,
      cwd,
      tools: agentMeta.tools,
      systemPrompt: agentMeta.prompt,
      permissionMode:
        agentMeta.tools.includes("Edit") || agentMeta.tools.includes("Write")
          ? "acceptEdits"
          : "default",
      maxBudgetUsd: MAX_BUDGET_PER_AGENT,
      thinking: { type: "adaptive" },
    },
  });

  for await (const message of q) {
    if (message.type === "assistant") {
      // Collect text content from assistant messages
      for (const block of message.message.content) {
        if (block.type === "text") {
          output += block.text + "\n";
        }
      }
    }
    if (message.type === "result") {
      if (message.subtype === "success") {
        costUsd = (message as Record<string, unknown>).total_cost_usd as number ?? 0;
        inputTokens = message.usage?.input_tokens ?? 0;
        outputTokens = message.usage?.output_tokens ?? 0;
        numTurns = (message as Record<string, unknown>).num_turns as number ?? 0;
      } else if (message.subtype.startsWith("error")) {
        const errorMsg = (message as Record<string, unknown>).error ?? "Unknown error";
        throw new Error(`Claude Code returned an error result: ${errorMsg}`);
      }
    }
  }

  const durationMs = Date.now() - start;
  const tokenStr = `${(inputTokens / 1000).toFixed(0)}k in / ${(outputTokens / 1000).toFixed(0)}k out`;
  const costStr = costUsd > 0 ? `$${costUsd.toFixed(3)}` : "subscription";
  log(
    `  ${agentMeta.name} finished in ${(durationMs / 1000).toFixed(1)}s (${tokenStr}, ${costStr}, ${numTurns} turns)`
  );

  return { agent: agentMeta.name, output: output.trim(), durationMs, costUsd, inputTokens, outputTokens, numTurns };
}

// ---------------------------------------------------------------------------
// Feature classification
// ---------------------------------------------------------------------------

interface FeatureType {
  hasFrontend: boolean;
  hasBackend: boolean;
  hasDevOps: boolean;
}

function classifyFeature(item: RoadmapItem): FeatureType {
  const name = item.name.toLowerCase();
  const desc = item.description.toLowerCase();
  const combined = `${name} ${desc}`;

  const hasBackend =
    combined.includes("api") ||
    combined.includes("adapter") ||
    combined.includes("import") ||
    combined.includes("integration") ||
    combined.includes("data") ||
    combined.includes("tracking") ||
    combined.includes("feed");

  const hasFrontend =
    combined.includes("ui") ||
    combined.includes("page") ||
    combined.includes("dashboard") ||
    combined.includes("display") ||
    combined.includes("show") ||
    combined.includes("card") ||
    combined.includes("visual");

  const hasDevOps =
    combined.includes("cron") ||
    combined.includes("deploy") ||
    combined.includes("env") ||
    combined.includes("migration") ||
    combined.includes("schedule") ||
    combined.includes("cost");

  return {
    hasFrontend: hasFrontend || (!hasBackend && !hasDevOps),
    hasBackend: hasBackend || true, // Almost everything needs backend
    hasDevOps,
  };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function executePipeline(
  feature: RoadmapItem,
  agents: Map<string, AgentMeta>
): Promise<RunLog> {
  const runLog: RunLog = {
    feature: feature.name,
    branch: "",
    startedAt: new Date().toISOString(),
    results: [],
    totalCostUsd: 0,
  };

  const featureType = classifyFeature(feature);

  log(`\nFeature: ${feature.name}`);
  log(`Section: ${feature.section}`);
  log(
    `Type: backend=${featureType.hasBackend} frontend=${featureType.hasFrontend} devops=${featureType.hasDevOps}`
  );

  // Create worktree
  const { branch, worktreePath } = createWorktree(feature.name);
  runLog.branch = branch;
  log(`Branch: ${branch}`);
  log(`Worktree: ${worktreePath}\n`);

  try {
    const featureDesc = `Feature: "${feature.name}"\nSection: ${feature.section}\nDescription: ${feature.description}`;
    let chainedContext = "";

    // 1. PM: Requirements
    const pm = agents.get("sully-pm")!;
    const pmResult = await runAgent(
      pm,
      `Write requirements for this feature:\n\n${featureDesc}\n\nRead ROADMAP.md and relevant source files to understand the current state.`,
      worktreePath
    );
    runLog.results.push(pmResult);
    chainedContext = `## PM Requirements\n\n${pmResult.output}`;

    // 2. Tech Lead: Architecture
    const techLead = agents.get("gretz-tech-lead")!;
    const archResult = await runAgent(
      techLead,
      `Design the architecture for this feature. Read the relevant source files to understand existing patterns.\n\n${featureDesc}`,
      worktreePath,
      chainedContext
    );
    runLog.results.push(archResult);
    chainedContext += `\n\n## Architecture Plan\n\n${archResult.output}`;

    // 3. Hockey Expert: Domain validation
    const hockey = agents.get("cherry-hockey")!;
    const domainResult = await runAgent(
      hockey,
      `Validate the hockey domain aspects of this plan. Flag any statistical errors, unrealistic thresholds, or missing context.\n\n${featureDesc}`,
      worktreePath,
      chainedContext
    );
    runLog.results.push(domainResult);
    chainedContext += `\n\n## Domain Review\n\n${domainResult.output}`;

    // 4. Designer: UI spec (if frontend work)
    if (featureType.hasFrontend) {
      const designer = agents.get("howe-designer")!;
      const designResult = await runAgent(
        designer,
        `Create UI/UX specifications for this feature. Match the existing design system.\n\n${featureDesc}`,
        worktreePath,
        chainedContext
      );
      runLog.results.push(designResult);
      chainedContext += `\n\n## UI/UX Spec\n\n${designResult.output}`;
    }

    // 5. Backend Dev: Implement
    if (featureType.hasBackend) {
      const backend = agents.get("orr-backend")!;
      const backendResult = await runAgent(
        backend,
        `Implement the backend for this feature. Follow the architecture plan. Write working code and run tsc to verify.\n\n${featureDesc}`,
        worktreePath,
        chainedContext
      );
      runLog.results.push(backendResult);
      chainedContext += `\n\n## Backend Implementation\n\n${backendResult.output}`;
    }

    // 6. Frontend Dev: Implement (if frontend work)
    if (featureType.hasFrontend) {
      const frontend = agents.get("lemieux-frontend")!;
      const frontendResult = await runAgent(
        frontend,
        `Implement the frontend for this feature. Follow the UI spec and architecture plan. Write working TSX and run tsc to verify.\n\n${featureDesc}`,
        worktreePath,
        chainedContext
      );
      runLog.results.push(frontendResult);
      chainedContext += `\n\n## Frontend Implementation\n\n${frontendResult.output}`;
    }

    // 7. DevOps: Config (if needed)
    if (featureType.hasDevOps) {
      const devops = agents.get("hasek-devops")!;
      const devopsResult = await runAgent(
        devops,
        `Handle any infrastructure needs: cron jobs, env vars, prisma migrations, vercel config.\n\n${featureDesc}`,
        worktreePath,
        chainedContext
      );
      runLog.results.push(devopsResult);
      chainedContext += `\n\n## DevOps Changes\n\n${devopsResult.output}`;
    }

    // 8. Code Review (with fix loop)
    const reviewer = agents.get("gabe-reviewer")!;
    for (let round = 0; round < MAX_REVIEW_ROUNDS; round++) {
      const reviewPrompt =
        round === 0
          ? `Review ALL changes in this worktree. Run \`git diff main\` to see what changed. Check every file against project conventions.`
          : `Re-review after fixes. Run \`git diff main\` to check remaining issues.`;

      let reviewResult: PipelineResult;
      try {
        reviewResult = await runAgent(
          reviewer,
          reviewPrompt,
          worktreePath,
          chainedContext
        );
      } catch (err) {
        log(`  Reviewer failed: ${err}. Skipping review.`);
        break;
      }
      runLog.results.push(reviewResult);

      const hasBlockers =
        reviewResult.output.toLowerCase().includes("blocked") ||
        reviewResult.output.toLowerCase().includes("blockers\n- [");

      if (!hasBlockers) {
        log("  Review passed, no blockers.");
        break;
      }

      if (round < MAX_REVIEW_ROUNDS - 1) {
        log("  Review found blockers, sending to backend for fixes...");
        const backend = agents.get("orr-backend")!;
        const fixResult = await runAgent(
          backend,
          `The code reviewer found blockers. Fix them:\n\n${reviewResult.output}`,
          worktreePath,
          chainedContext
        );
        runLog.results.push(fixResult);
        chainedContext += `\n\n## Review Fix Round ${round + 1}\n\n${fixResult.output}`;
      }
    }

    // 9. Commit and create PR
    log("\n  Creating PR...");
    try {
      execSync(`git add -A && git diff --cached --quiet || git commit -m "feat: ${feature.name}"`, {
        cwd: worktreePath,
        stdio: "inherit",
      });

      execSync(`git push -u origin ${branch}`, {
        cwd: worktreePath,
        stdio: "inherit",
      });

      const totalTokens = runLog.results.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
      const agentSummary = runLog.results
        .map((r) => `- ${r.agent}: ${(r.durationMs / 1000).toFixed(0)}s, ${((r.inputTokens + r.outputTokens) / 1000).toFixed(0)}k tokens, ${r.numTurns} turns`)
        .join("\n");

      const prBody = `## Summary\n\nAutonomous implementation of "${feature.name}" from ROADMAP.md.\n\nSection: ${feature.section}\n\n## Agent Pipeline\n\n${agentSummary}\n\nTotal tokens: ${(totalTokens / 1000).toFixed(0)}k\n\n## Review\n\nThis PR was generated by the roadmap agent pipeline and has passed automated code review. Human review is required before merge.`;

      const prUrl = execSync(
        `gh pr create --title "feat: ${feature.name}" --body "${prBody.replace(/"/g, '\\"')}" --base main`,
        { cwd: worktreePath, encoding: "utf-8" }
      ).trim();

      runLog.prUrl = prUrl;
      log(`  PR created: ${prUrl}`);
    } catch (err) {
      log(`  PR creation failed: ${err}`);
      runLog.error = `PR creation failed: ${err}`;
    }
  } catch (err) {
    runLog.error = `Pipeline failed: ${err}`;
    log(`\nPipeline error: ${err}`);
  }

  runLog.finishedAt = new Date().toISOString();
  runLog.totalCostUsd = runLog.results.reduce((s, r) => s + r.costUsd, 0);

  // Write run log
  const logDir = path.join(ROOT, "scripts", "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${slugify(feature.name)}-${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2));
  log(`\nRun log: ${logPath}`);

  return runLog;
}

async function resumePipeline(
  state: ResumeState,
  agents: Map<string, AgentMeta>
): Promise<RunLog> {
  const runLog: RunLog = {
    feature: state.feature.name,
    branch: state.branch,
    startedAt: new Date().toISOString(),
    results: [...state.results],
    totalCostUsd: 0,
  };

  const featureType = classifyFeature(state.feature);
  const featureDesc = `Feature: "${state.feature.name}"\nSection: ${state.feature.section}\nDescription: ${state.feature.description}`;
  let chainedContext = state.chainedContext;

  const done = new Set(state.completedAgents);
  log(`Resuming "${state.feature.name}" from ${state.worktreePath}`);
  log(`Already completed: ${[...done].join(", ") || "none"}`);

  // Pipeline steps in order, with the agent slug and name that maps to completedAgents
  const steps: Array<{
    slug: string;
    displayName: string;
    condition: boolean;
    prompt: string;
    contextLabel: string;
  }> = [
    {
      slug: "sully-pm",
      displayName: "Sully (PM)",
      condition: true,
      prompt: `Write requirements for this feature:\n\n${featureDesc}\n\nRead ROADMAP.md and relevant source files to understand the current state.`,
      contextLabel: "PM Requirements",
    },
    {
      slug: "gretz-tech-lead",
      displayName: "Gretz (Tech Lead)",
      condition: true,
      prompt: `Design the architecture for this feature. Read the relevant source files to understand existing patterns.\n\n${featureDesc}`,
      contextLabel: "Architecture Plan",
    },
    {
      slug: "cherry-hockey",
      displayName: "Cherry (Hockey Expert)",
      condition: true,
      prompt: `Validate the hockey domain aspects of this plan. Flag any statistical errors, unrealistic thresholds, or missing context.\n\n${featureDesc}`,
      contextLabel: "Domain Review",
    },
    {
      slug: "howe-designer",
      displayName: "Howe (Designer)",
      condition: featureType.hasFrontend,
      prompt: `Create UI/UX specifications for this feature. Match the existing design system.\n\n${featureDesc}`,
      contextLabel: "UI/UX Spec",
    },
    {
      slug: "orr-backend",
      displayName: "Orr (Backend Dev)",
      condition: featureType.hasBackend,
      prompt: `Implement the backend for this feature. Follow the architecture plan. Write working code and run tsc to verify.\n\n${featureDesc}`,
      contextLabel: "Backend Implementation",
    },
    {
      slug: "lemieux-frontend",
      displayName: "Lemieux (Frontend Dev)",
      condition: featureType.hasFrontend,
      prompt: `Implement the frontend for this feature. Follow the UI spec and architecture plan. Write working TSX and run tsc to verify.\n\n${featureDesc}`,
      contextLabel: "Frontend Implementation",
    },
    {
      slug: "hasek-devops",
      displayName: "Hasek (DevOps)",
      condition: featureType.hasDevOps,
      prompt: `Handle any infrastructure needs: cron jobs, env vars, prisma migrations, vercel config.\n\n${featureDesc}`,
      contextLabel: "DevOps Changes",
    },
  ];

  try {
    // Run any skipped pipeline steps
    for (const step of steps) {
      if (!step.condition || done.has(step.displayName)) continue;

      const agentMeta = agents.get(step.slug)!;
      const result = await runAgent(agentMeta, step.prompt, state.worktreePath, chainedContext);
      runLog.results.push(result);
      chainedContext += `\n\n## ${step.contextLabel}\n\n${result.output}`;
    }

    // Code review
    const reviewer = agents.get("gabe-reviewer")!;
    for (let round = 0; round < MAX_REVIEW_ROUNDS; round++) {
      const reviewPrompt =
        round === 0
          ? `Review ALL changes in this worktree. Run \`git diff main\` to see what changed. Check every file against project conventions.`
          : `Re-review after fixes. Run \`git diff main\` to check remaining issues.`;

      let reviewResult: PipelineResult;
      try {
        reviewResult = await runAgent(reviewer, reviewPrompt, state.worktreePath, chainedContext);
      } catch (err) {
        log(`  Reviewer failed: ${err}. Skipping review.`);
        break;
      }
      runLog.results.push(reviewResult);

      const hasBlockers =
        reviewResult.output.toLowerCase().includes("blocked") ||
        reviewResult.output.toLowerCase().includes("blockers\n- [");

      if (!hasBlockers) {
        log("  Review passed, no blockers.");
        break;
      }

      if (round < MAX_REVIEW_ROUNDS - 1) {
        log("  Review found blockers, sending to backend for fixes...");
        const backend = agents.get("orr-backend")!;
        const fixResult = await runAgent(
          backend,
          `The code reviewer found blockers. Fix them:\n\n${reviewResult.output}`,
          state.worktreePath,
          chainedContext
        );
        runLog.results.push(fixResult);
        chainedContext += `\n\n## Review Fix Round ${round + 1}\n\n${fixResult.output}`;
      }
    }

    // Commit and PR
    log("\n  Creating PR...");
    try {
      execSync(`git add -A && git diff --cached --quiet || git commit -m "feat: ${state.feature.name}"`, {
        cwd: state.worktreePath,
        stdio: "inherit",
      });
      execSync(`git push -u origin ${state.branch}`, {
        cwd: state.worktreePath,
        stdio: "inherit",
      });

      const totalTokens = runLog.results.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
      const agentSummary = runLog.results
        .map((r) => `- ${r.agent}: ${(r.durationMs / 1000).toFixed(0)}s, ${((r.inputTokens + r.outputTokens) / 1000).toFixed(0)}k tokens, ${r.numTurns} turns`)
        .join("\n");

      const prBody = `## Summary\n\nAutonomous implementation of "${state.feature.name}" from ROADMAP.md.\n\nSection: ${state.feature.section}\n\n## Agent Pipeline\n\n${agentSummary}\n\nTotal tokens: ${(totalTokens / 1000).toFixed(0)}k\n\n## Review\n\nThis PR was generated by the roadmap agent pipeline and has passed automated code review. Human review is required before merge.`;

      const prUrl = execSync(
        `gh pr create --title "feat: ${state.feature.name}" --body "${prBody.replace(/"/g, '\\"')}" --base main`,
        { cwd: state.worktreePath, encoding: "utf-8" }
      ).trim();

      runLog.prUrl = prUrl;
      log(`  PR created: ${prUrl}`);
    } catch (err) {
      log(`  PR creation failed: ${err}`);
      runLog.error = `PR creation failed: ${err}`;
    }
  } catch (err) {
    runLog.error = `Resume pipeline failed: ${err}`;
    log(`\nPipeline error: ${err}`);
  }

  runLog.finishedAt = new Date().toISOString();
  runLog.totalCostUsd = runLog.results.reduce((s, r) => s + r.costUsd, 0);

  const logDir = path.join(ROOT, "scripts", "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${slugify(state.feature.name)}-${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2));
  log(`\nRun log: ${logPath}`);

  return runLog;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Resume support
// ---------------------------------------------------------------------------

interface ResumeState {
  feature: RoadmapItem;
  worktreePath: string;
  branch: string;
  completedAgents: string[];
  chainedContext: string;
  results: PipelineResult[];
}

function loadResumeState(featureName: string, items: RoadmapItem[]): ResumeState | null {
  const logDir = path.join(ROOT, "scripts", "logs");
  if (!fs.existsSync(logDir)) return null;

  // Resolve the full feature name first via fuzzy match
  const matched = findFeature(items, featureName);
  const slug = slugify(matched?.name ?? featureName);
  const logFiles = fs.readdirSync(logDir)
    .filter((f) => f.startsWith(slug) && f.endsWith(".json"))
    .sort()
    .reverse();

  if (logFiles.length === 0) return null;

  const logPath = path.join(logDir, logFiles[0]);
  const runLog: RunLog = JSON.parse(fs.readFileSync(logPath, "utf-8"));

  const feature = items.find((i) => i.name === runLog.feature);
  if (!feature) return null;

  const worktreePath = path.join(WORKTREE_BASE, slug);
  if (!fs.existsSync(worktreePath)) return null;

  // Rebuild chained context from previous results
  const agentRoleMap: Record<string, string> = {
    "Sully (PM)": "PM Requirements",
    "Gretz (Tech Lead)": "Architecture Plan",
    "Cherry (Hockey Expert)": "Domain Review",
    "Howe (Designer)": "UI/UX Spec",
    "Orr (Backend Dev)": "Backend Implementation",
    "Lemieux (Frontend Dev)": "Frontend Implementation",
    "Hasek (DevOps)": "DevOps Changes",
    "Gabe (Code Reviewer)": "Code Review",
  };

  let chainedContext = "";
  const completedAgents: string[] = [];

  for (const r of runLog.results) {
    // Backfill missing fields from older logs
    r.inputTokens = r.inputTokens ?? 0;
    r.outputTokens = r.outputTokens ?? 0;
    r.numTurns = r.numTurns ?? 0;

    if (r.output && r.output.length > 50) {
      const section = agentRoleMap[r.agent] ?? r.agent;
      chainedContext += `\n\n## ${section}\n\n${r.output}`;
      completedAgents.push(r.agent);
    }
  }

  return {
    feature,
    worktreePath,
    branch: runLog.branch,
    completedAgents,
    chainedContext,
    results: runLog.results,
  };
}

function printUsage() {
  console.log(`
Roadmap Agent Orchestrator

Usage:
  npx tsx scripts/roadmap-agent.ts --feature "Feature name"   Run a specific feature
  npx tsx scripts/roadmap-agent.ts --resume "Feature name"    Resume a failed pipeline
  npx tsx scripts/roadmap-agent.ts --next                     Run the next uncompleted feature
  npx tsx scripts/roadmap-agent.ts --list                     List all roadmap items
  npx tsx scripts/roadmap-agent.ts --dry-run "Feature name"   Show pipeline plan without running
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const items = parseRoadmap();

  // --list: Show roadmap items
  if (args.includes("--list")) {
    let currentSection = "";
    for (const item of items) {
      if (item.section !== currentSection) {
        currentSection = item.section;
        console.log(`\n## ${currentSection}`);
      }
      const status = item.completed ? "[done]" : "[open]";
      console.log(`  ${status} ${item.name}`);
    }
    const open = items.filter((i) => !i.completed).length;
    const done = items.filter((i) => i.completed).length;
    console.log(`\n${done} completed, ${open} remaining`);
    process.exit(0);
  }

  // Load agents
  const agents = loadAllAgents();
  log(`Loaded ${agents.size} agents`);

  // --dry-run: Show plan
  const dryRunIdx = args.indexOf("--dry-run");
  if (dryRunIdx !== -1) {
    const name = args[dryRunIdx + 1];
    const feature = name ? findFeature(items, name) : getNextFeature(items);
    if (!feature) {
      console.error("Feature not found or all completed");
      process.exit(1);
    }
    const type = classifyFeature(feature);
    console.log(`Feature: ${feature.name}`);
    console.log(`Section: ${feature.section}`);
    console.log(`Description: ${feature.description}`);
    console.log(`\nPipeline:`);
    console.log(`  1. Sully (PM) -> Requirements`);
    console.log(`  2. Gretz (Tech Lead) -> Architecture`);
    console.log(`  3. Cherry (Hockey Expert) -> Domain validation`);
    if (type.hasFrontend) console.log(`  4. Howe (Designer) -> UI/UX spec`);
    if (type.hasBackend) console.log(`  5. Orr (Backend Dev) -> Implementation`);
    if (type.hasFrontend)
      console.log(`  6. Lemieux (Frontend Dev) -> Implementation`);
    if (type.hasDevOps) console.log(`  7. Hasek (DevOps) -> Infrastructure`);
    console.log(`  8. Gabe (Code Reviewer) -> Review (up to ${MAX_REVIEW_ROUNDS} rounds)`);
    console.log(`  9. -> PR created`);
    console.log(
      `\nEstimated max cost: $${(agents.size * MAX_BUDGET_PER_AGENT).toFixed(2)} (${MAX_BUDGET_PER_AGENT}/agent cap)`
    );
    process.exit(0);
  }

  // --resume: Resume a failed pipeline
  const resumeIdx = args.indexOf("--resume");
  if (resumeIdx !== -1) {
    const name = args[resumeIdx + 1];
    if (!name) {
      console.error("--resume requires a feature name argument");
      process.exit(1);
    }
    const state = loadResumeState(name, items);
    if (!state) {
      console.error(`No resumable state found for "${name}". Check scripts/logs/ and worktrees/.`);
      process.exit(1);
    }
    log(`Resuming pipeline for: ${state.feature.name}`);
    const result = await resumePipeline(state, agents);

    console.log("\n========================================");
    console.log("Pipeline Complete (Resumed)");
    console.log("========================================");
    console.log(`Feature: ${result.feature}`);
    console.log(`Branch: ${result.branch}`);
    const totalTokens = result.results.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
    console.log(`Total tokens: ${(totalTokens / 1000).toFixed(0)}k (included in subscription)`);
    if (result.prUrl) console.log(`PR: ${result.prUrl}`);
    if (result.error) console.log(`Error: ${result.error}`);
    console.log("\nAgent breakdown:");
    for (const r of result.results) {
      const tokens = ((r.inputTokens + r.outputTokens) / 1000).toFixed(0);
      console.log(
        `  ${r.agent}: ${(r.durationMs / 1000).toFixed(0)}s, ${tokens}k tokens, ${r.numTurns} turns`
      );
    }
    process.exit(0);
  }

  // --feature or --next: Run pipeline
  let feature: RoadmapItem | undefined;

  const featureIdx = args.indexOf("--feature");
  if (featureIdx !== -1) {
    const name = args[featureIdx + 1];
    if (!name) {
      console.error("--feature requires a name argument");
      process.exit(1);
    }
    feature = findFeature(items, name);
    if (!feature) {
      console.error(`Feature not found: "${name}"`);
      console.error(
        "Open features:",
        items
          .filter((i) => !i.completed)
          .map((i) => i.name)
          .join(", ")
      );
      process.exit(1);
    }
  } else if (args.includes("--next")) {
    feature = getNextFeature(items);
    if (!feature) {
      log("All roadmap features are completed!");
      process.exit(0);
    }
  } else {
    printUsage();
    process.exit(1);
  }

  log(`Starting pipeline for: ${feature.name}`);
  const result = await executePipeline(feature, agents);

  console.log("\n========================================");
  console.log("Pipeline Complete");
  console.log("========================================");
  console.log(`Feature: ${result.feature}`);
  console.log(`Branch: ${result.branch}`);
  console.log(`Duration: ${((new Date(result.finishedAt!).getTime() - new Date(result.startedAt).getTime()) / 1000 / 60).toFixed(1)} minutes`);
  const totalTokens = result.results.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);
  console.log(`Total tokens: ${(totalTokens / 1000).toFixed(0)}k (included in subscription)`);
  if (result.prUrl) console.log(`PR: ${result.prUrl}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log("\nAgent breakdown:");
  for (const r of result.results) {
    const tokens = ((r.inputTokens + r.outputTokens) / 1000).toFixed(0);
    console.log(
      `  ${r.agent}: ${(r.durationMs / 1000).toFixed(0)}s, ${tokens}k tokens, ${r.numTurns} turns`
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
