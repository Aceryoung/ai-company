// app/api/pipeline/route.ts — GitHub 파이프라인 API (Vercel 호환 — fetch 기반)
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── GitHub API 헬퍼
const GITHUB_API = 'https://api.github.com'

function ghHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN || ''
  return token
    ? { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    : { Accept: 'application/vnd.github+json' }
}

async function ghFetch<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: { ...ghHeaders(), ...(opts?.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ── Gemini AI 헬퍼 (Claude CLI 대체)
async function geminiAI(prompt: string, timeoutMs = 45_000): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return 'AI_ERROR: GEMINI_API_KEY not set'

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    )
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      error?: { message?: string }
    }
    if (data.error) return `AI_ERROR: ${data.error.message?.slice(0, 100)}`
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'AI_ERROR: empty response'
  } catch (e: unknown) {
    return `AI_ERROR: ${(e as { message?: string }).message?.slice(0, 100)}`
  }
}

// ── GitHub Contents API로 파일 읽기
async function readFile(repo: string, filePath: string, ref = 'main'): Promise<string | null> {
  try {
    const data = await ghFetch<{ content?: string; encoding?: string }>(
      `/repos/${repo}/contents/${filePath}?ref=${ref}`
    )
    if (data.content && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return null
  } catch { return null }
}

// ── GitHub Contents API로 파일 존재 확인
async function fileExists(repo: string, filePath: string, ref = 'main'): Promise<boolean> {
  try {
    await ghFetch(`/repos/${repo}/contents/${filePath}?ref=${ref}`)
    return true
  } catch { return false }
}

// ── GitHub API로 파일 목록 조회 (재귀)
async function listFiles(repo: string, dir: string, ref = 'main'): Promise<string[]> {
  try {
    const items = await ghFetch<Array<{ path: string; type: string }>>(
      `/repos/${repo}/contents/${dir}?ref=${ref}`
    )
    return items.filter(i => i.type === 'file').map(i => i.path)
  } catch { return [] }
}

// ── GitHub API로 브랜치 생성 + 파일 커밋 + PR 생성
async function createBranchFromMain(repo: string, branchName: string): Promise<boolean> {
  try {
    const mainRef = await ghFetch<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/main`)
    await ghFetch(`/repos/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: mainRef.object.sha }),
    })
    return true
  } catch { return false }
}

async function commitFiles(
  repo: string,
  branch: string,
  files: Array<{ path: string; content: string }>,
  message: string
): Promise<{ sha: string } | null> {
  try {
    // 1) 현재 브랜치의 HEAD 커밋 가져오기
    const ref = await ghFetch<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${branch}`)
    const headSha = ref.object.sha

    // 2) 현재 트리 가져오기
    const commit = await ghFetch<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${headSha}`)

    // 3) 새 블롭 생성
    const treeItems = await Promise.all(
      files.map(async f => {
        const blob = await ghFetch<{ sha: string }>(`/repos/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
        })
        return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha }
      })
    )

    // 4) 새 트리 생성
    const newTree = await ghFetch<{ sha: string }>(`/repos/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeItems }),
    })

    // 5) 새 커밋 생성
    const newCommit = await ghFetch<{ sha: string }>(`/repos/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [headSha],
        author: { name: 'Pipeline Bot', email: 'pipeline@quickbizlab.com', date: new Date().toISOString() },
      }),
    })

    // 6) 브랜치 ref 업데이트
    await ghFetch(`/repos/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha }),
    })

    return { sha: newCommit.sha.slice(0, 7) }
  } catch { return null }
}

async function createPullRequest(
  repo: string,
  branch: string,
  title: string,
  body: string
): Promise<{ url: string } | null> {
  try {
    const pr = await ghFetch<{ html_url: string }>(`/repos/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, body, head: branch, base: 'main' }),
    })
    return { url: pr.html_url }
  } catch { return null }
}

// ── STEP 0: REPO 스캔 — GitHub API로 실제 데이터 조회
async function scanRepo(repo: string) {
  const [repoInfo, commitsRaw, issuesRaw, prsRaw] = await Promise.all([
    ghFetch<Record<string, unknown>>(`/repos/${repo}`),
    ghFetch<Array<Record<string, unknown>>>(`/repos/${repo}/commits?per_page=10`),
    ghFetch<Array<Record<string, unknown>>>(`/repos/${repo}/issues?state=open&per_page=20`),
    ghFetch<Array<Record<string, unknown>>>(`/repos/${repo}/pulls?state=open&per_page=10`),
  ])

  return {
    name: repoInfo.name,
    full_name: repoInfo.full_name,
    description: repoInfo.description,
    language: repoInfo.language,
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,
    open_issues: repoInfo.open_issues_count,
    default_branch: repoInfo.default_branch,
    updated_at: repoInfo.updated_at,
    commits: commitsRaw.slice(0, 5).map(c => ({
      sha: (c.sha as string).slice(0, 7),
      message: ((c.commit as Record<string, unknown> & { message: string }).message || '').split('\n')[0],
      date: (c.commit as Record<string, unknown> & { author: { date: string } }).author.date,
      author: (c.commit as Record<string, unknown> & { author: { name: string } }).author.name,
    })),
    issues: issuesRaw.filter(i => !i.pull_request).map(i => ({
      number: i.number, title: i.title,
      labels: (i.labels as Array<{ name: string }>).map(l => l.name),
      created_at: i.created_at,
    })),
    prs: prsRaw.map(p => ({ number: p.number, title: p.title, state: p.state, draft: p.draft })),
    local: null,  // Vercel에서는 로컬 정보 없음
  }
}

// ── STEP 1: 개선점 분석 — GitHub API로 원격 분석
async function analyzeRepo(repo: string, useAI = true) {
  const improvements: Array<{
    id: string; title: string; description: string
    type: 'perf' | 'sec' | 'feat' | 'refactor' | 'doc'
    priority: 'high' | 'medium' | 'low'
    effort: 'small' | 'medium' | 'large'
    auto: boolean
    files?: string[]
    aiPrompt?: string
  }> = []

  let idx = 0
  const addImp = (title: string, desc: string, type: string, priority: string, effort: string, auto: boolean, files?: string[]) => {
    improvements.push({
      id: `imp-${++idx}`, title, description: desc,
      type: type as 'perf' | 'sec' | 'feat' | 'refactor' | 'doc',
      priority: priority as 'high' | 'medium' | 'low',
      effort: effort as 'small' | 'medium' | 'large',
      auto, files,
    })
  }

  // 병렬로 파일 존재 확인
  const [hasReadme, hasChangelog, hasEnvExample, hasGitignore, hasTsConfig, hasPkg, hasLicense] = await Promise.all([
    fileExists(repo, 'README.md'),
    fileExists(repo, 'CHANGELOG.md'),
    fileExists(repo, '.env.example'),
    fileExists(repo, '.gitignore'),
    fileExists(repo, 'tsconfig.json'),
    fileExists(repo, 'package.json'),
    fileExists(repo, 'LICENSE'),
  ])

  // 1) README.md
  if (!hasReadme) {
    addImp('README.md 생성', '프로젝트 설명·실행 방법·환경변수 목록이 담긴 README 생성', 'doc', 'high', 'small', true)
  } else {
    const readme = await readFile(repo, 'README.md')
    if (readme && readme.length < 200) {
      addImp('README.md 보강', `현재 ${readme.length}바이트 — 프로젝트 설명·기술스택·실행방법 추가 필요`, 'doc', 'medium', 'small', true, ['README.md'])
    }
  }

  // 2) CHANGELOG.md
  if (!hasChangelog) {
    addImp('CHANGELOG.md 생성', '배포 이력 추적을 위한 CHANGELOG 파일 생성', 'doc', 'medium', 'small', true)
  }

  // 3) .env.example
  if (!hasEnvExample) {
    addImp('.env.example 생성', '.env.example이 없음 — 팀원 온보딩 시 필요', 'doc', 'high', 'small', true)
  }

  // 4) .gitignore
  if (hasGitignore) {
    const gitignore = await readFile(repo, '.gitignore')
    if (gitignore) {
      if (!gitignore.includes('node_modules')) {
        addImp('.gitignore에 node_modules 추가', 'node_modules가 .gitignore에 없음', 'sec', 'high', 'small', true, ['.gitignore'])
      }
      if (!gitignore.includes('.env') && !gitignore.includes('.env.local')) {
        addImp('.gitignore에 .env 추가', '환경변수 파일이 .gitignore에 없음 — 보안 위험', 'sec', 'high', 'small', true, ['.gitignore'])
      }
    }
  }

  // 5) TypeScript strict
  if (hasTsConfig) {
    const tsconfig = await readFile(repo, 'tsconfig.json')
    if (tsconfig && !tsconfig.includes('"strict": true') && !tsconfig.includes('"strict":true')) {
      addImp('TypeScript strict 모드 활성화', 'tsconfig.json에 strict: true 설정 필요', 'refactor', 'medium', 'medium', true, ['tsconfig.json'])
    }
  }

  // 6) package.json 분석
  if (hasPkg) {
    const pkg = await readFile(repo, 'package.json')
    if (pkg) {
      try {
        const parsed = JSON.parse(pkg)
        if (!parsed.scripts?.test || parsed.scripts.test.includes('no test specified')) {
          addImp('테스트 스크립트 추가', 'package.json에 test 스크립트 자동 추가', 'feat', 'medium', 'small', true, ['package.json'])
        }
        const deps = { ...parsed.dependencies, ...parsed.devDependencies }
        if (!parsed.scripts?.lint && deps.next) {
          addImp('린트 스크립트 추가', 'package.json에 "lint": "next lint" 자동 추가', 'refactor', 'medium', 'small', true, ['package.json'])
        }
      } catch { /* ignore */ }
    }
  }

  // 7) GitHub Actions CI
  const workflows = await listFiles(repo, '.github/workflows')
  if (workflows.length === 0) {
    addImp('GitHub Actions CI 워크플로우 생성', '.github/workflows/ci.yml 자동 생성 — PR 시 자동 빌드·린트', 'feat', 'high', 'small', true, ['.github/workflows/ci.yml'])
  }

  // 8) LICENSE
  if (!hasLicense) {
    addImp('LICENSE 파일 생성', 'MIT 라이선스 파일 자동 생성', 'doc', 'low', 'small', true, ['LICENSE'])
  }

  // 9) AI 코드 분석
  if (useAI) {
    try {
      // 주요 소스 파일 목록 (app/ 또는 src/ 디렉토리)
      let sourceFiles: string[] = []
      for (const dir of ['app', 'src']) {
        const files = await listFiles(repo, dir)
        sourceFiles = sourceFiles.concat(files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')))
        if (sourceFiles.length >= 8) break
      }

      if (sourceFiles.length > 0) {
        // 파일 내용 샘플링
        let codeSnapshot = ''
        for (const f of sourceFiles.slice(0, 6)) {
          const content = await readFile(repo, f)
          if (content) {
            const lines = content.split('\n').slice(0, 60).join('\n')
            codeSnapshot += `\n--- ${f} ---\n${lines}\n`
            if (codeSnapshot.length > 3000) break
          }
        }

        if (codeSnapshot.length > 200) {
          const prompt = `You are a senior code reviewer. Analyze these source files and suggest 2-3 concrete, specific improvements.

Rules:
- Only suggest changes that can be implemented by editing files
- Each suggestion must name the exact file(s) to change
- Focus on: error handling, type safety, performance, security, code quality
- Do NOT suggest adding tests, docs, or config changes (those are handled separately)
- Be specific: "Add try-catch to fetchData in api/route.ts" not "improve error handling"

Source files:
${codeSnapshot}

Respond in this exact JSON format (no markdown, no explanation):
[{"title":"short title","description":"what to change and why","type":"refactor|perf|sec|feat","priority":"high|medium|low","effort":"small|medium|large","files":["relative/path.ts"],"prompt":"detailed instruction for making this change"}]`

          const aiResult = await geminiAI(prompt)
          if (aiResult && !aiResult.includes('AI_ERROR') && aiResult.includes('[')) {
            try {
              const jsonMatch = aiResult.match(/\[[\s\S]*\]/)
              if (jsonMatch) {
                const aiImprovements = JSON.parse(jsonMatch[0]) as Array<{
                  title: string; description: string; type: string
                  priority: string; effort: string; files: string[]; prompt: string
                }>
                for (const ai of aiImprovements.slice(0, 3)) {
                  improvements.push({
                    id: `imp-${++idx}`,
                    title: `🤖 ${ai.title}`,
                    description: ai.description,
                    type: (ai.type || 'refactor') as 'perf' | 'sec' | 'feat' | 'refactor' | 'doc',
                    priority: (ai.priority || 'medium') as 'high' | 'medium' | 'low',
                    effort: (ai.effort || 'medium') as 'small' | 'medium' | 'large',
                    auto: true,
                    files: ai.files,
                    aiPrompt: ai.prompt,
                  })
                }
              }
            } catch { /* AI 응답 파싱 실패 */ }
          }
        }
      }
    } catch { /* AI 분석 실패해도 규칙 기반 결과는 유지 */ }
  }

  return { improvements }
}

// ── STEP 3: BUILD — GitHub API로 브랜치 생성 + 파일 수정 + 커밋
async function buildChanges(
  repo: string,
  improvements: Array<{ id: string; title: string; type: string; auto?: boolean; files?: string[]; aiPrompt?: string }>,
  useAI = true
) {
  const repoName = repo.split('/').pop()
  const branchName = `improve/${repoName}-${Date.now()}`
  const results: Array<{ id: string; title: string; status: 'done' | 'skipped'; detail: string }> = []
  const filesToCommit: Array<{ path: string; content: string }> = []

  for (const imp of improvements) {
    if (!imp.auto) {
      results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '수동 작업 필요 — 자동 수정 불가' })
      continue
    }

    try {
      switch (true) {
        case imp.title.includes('README.md 생성'): {
          const pkg = await readFile(repo, 'package.json')
          let name = repoName, desc = '', stack = ''
          if (pkg) {
            try {
              const p = JSON.parse(pkg)
              name = p.name || repoName
              desc = p.description || ''
              const deps = Object.keys(p.dependencies || {})
              stack = deps.filter(d => ['next', 'react', 'vue', 'express', 'supabase', 'prisma'].some(k => d.includes(k))).join(' · ') || 'Node.js'
            } catch { /* ignore */ }
          }
          filesToCommit.push({
            path: 'README.md',
            content: `# ${name}\n\n${desc}\n\n## Tech Stack\n${stack}\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Environment Variables\n\nCopy \`.env.example\` to \`.env.local\` and fill in the values.\n`,
          })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'README.md 생성 완료' })
          break
        }
        case imp.title.includes('README.md 보강'): {
          const existing = await readFile(repo, 'README.md')
          if (existing && !existing.includes('Getting Started') && !existing.includes('## 실행')) {
            filesToCommit.push({
              path: 'README.md',
              content: existing + `\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
            })
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'README.md에 실행 방법 추가' })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '이미 실행 방법 포함됨' })
          }
          break
        }
        case imp.title.includes('CHANGELOG.md 생성'): {
          const today = new Date().toISOString().split('T')[0]
          filesToCommit.push({
            path: 'CHANGELOG.md',
            content: `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n## [0.1.0] — ${today}\n\n### Added\n- Initial project setup\n`,
          })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'CHANGELOG.md 생성 완료' })
          break
        }
        case imp.title.includes('.env.example 생성'): {
          // process.env 변수를 소스에서 추출할 수 없으므로 기본 템플릿 생성
          filesToCommit.push({
            path: '.env.example',
            content: '# Environment Variables\n# Copy this file to .env.local and fill in the values\n\n# Example:\n# DATABASE_URL=\n# API_KEY=\n',
          })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.env.example 생성 완료' })
          break
        }
        case imp.title.includes('.gitignore'): {
          const gitignore = await readFile(repo, '.gitignore') || ''
          let updated = gitignore
          if (imp.title.includes('node_modules') && !gitignore.includes('node_modules')) updated += '\nnode_modules/'
          if (imp.title.includes('.env') && !gitignore.includes('.env')) updated += '\n.env\n.env.local\n.env.production'
          filesToCommit.push({ path: '.gitignore', content: updated })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.gitignore 업데이트 완료' })
          break
        }
        case imp.title.includes('TypeScript strict'): {
          const tsconfig = await readFile(repo, 'tsconfig.json')
          if (tsconfig) {
            const updated = tsconfig.replace(/"strict"\s*:\s*false/, '"strict": true')
            if (updated !== tsconfig) {
              filesToCommit.push({ path: 'tsconfig.json', content: updated })
              results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'tsconfig strict: true 설정' })
            } else {
              results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '이미 설정됨 또는 수동 확인 필요' })
            }
          }
          break
        }
        case imp.title.includes('테스트 스크립트 추가'): {
          const pkg = await readFile(repo, 'package.json')
          if (pkg) {
            const parsed = JSON.parse(pkg)
            parsed.scripts = parsed.scripts || {}
            parsed.scripts.test = 'echo "Tests will be configured — see CI workflow"'
            filesToCommit.push({ path: 'package.json', content: JSON.stringify(parsed, null, 2) + '\n' })
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'package.json에 test 스크립트 추가' })
          }
          break
        }
        case imp.title.includes('린트 스크립트 추가'): {
          const pkg = await readFile(repo, 'package.json')
          if (pkg) {
            const parsed = JSON.parse(pkg)
            parsed.scripts = parsed.scripts || {}
            parsed.scripts.lint = 'next lint'
            filesToCommit.push({ path: 'package.json', content: JSON.stringify(parsed, null, 2) + '\n' })
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'package.json에 lint 스크립트 추가' })
          }
          break
        }
        case imp.title.includes('GitHub Actions CI'): {
          filesToCommit.push({
            path: '.github/workflows/ci.yml',
            content: `name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm ci\n      - run: npm run build\n      - run: npm run lint --if-present\n`,
          })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.github/workflows/ci.yml 생성' })
          break
        }
        case imp.title.includes('LICENSE'): {
          const year = new Date().getFullYear()
          filesToCommit.push({
            path: 'LICENSE',
            content: `MIT License\n\nCopyright (c) ${year} Aceryoung\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`,
          })
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'MIT LICENSE 파일 생성' })
          break
        }
        case imp.title.startsWith('🤖'): {
          if (!useAI) {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: 'AI 수정 건너뜀' })
            break
          }
          const aiPrompt = imp.aiPrompt
          if (!aiPrompt) {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: 'AI 프롬프트 없음' })
            break
          }
          // 대상 파일 내용 가져오기
          let fileContext = ''
          if (imp.files) {
            for (const f of imp.files) {
              const content = await readFile(repo, f)
              if (content) {
                const lines = content.split('\n').slice(0, 100).join('\n')
                fileContext += `--- ${f} ---\n${lines}\n\n`
              }
            }
          }

          const editPrompt = `You are editing source code. Apply this change:\n\n${aiPrompt}\n\n${fileContext ? `Current file contents:\n${fileContext}` : ''}\n\nOutput ONLY the complete modified file content for each file, in this format:\n===FILE: relative/path.ts===\n(full file content)\n===END===\n\nNo explanation. No markdown. Just the file content between markers.`

          const aiOutput = await geminiAI(editPrompt, 60_000)
          if (aiOutput && aiOutput.includes('===FILE:')) {
            let editCount = 0
            for (const block of aiOutput.split('===FILE:').slice(1)) {
              const endIdx = block.indexOf('===END===')
              if (endIdx === -1) continue
              const hEnd = block.indexOf('===\n')
              if (hEnd === -1) continue
              const fp = block.slice(0, hEnd).trim()
              const content = block.slice(hEnd + 4, endIdx).trim()
              if (fp && content) {
                filesToCommit.push({ path: fp, content: content + '\n' })
                editCount++
              }
            }
            if (editCount > 0) {
              results.push({ id: imp.id, title: imp.title, status: 'done', detail: `AI가 ${editCount}개 파일 수정` })
            } else {
              results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: 'AI 출력 파싱 실패' })
            }
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: 'AI 코드 생성 실패' })
          }
          break
        }
        default:
          results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '자동 수정 미지원 항목' })
      }
    } catch (e: unknown) {
      results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: `오류: ${(e as { message?: string }).message?.slice(0, 80)}` })
    }
  }

  // 변경사항이 있으면 브랜치 생성 + 커밋
  if (filesToCommit.length > 0) {
    const branchOk = await createBranchFromMain(repo, branchName)
    if (!branchOk) return { branch: null, commit: null, results, error: '브랜치 생성 실패' }

    const doneCount = results.filter(r => r.status === 'done').length
    const commitResult = await commitFiles(
      repo, branchName, filesToCommit,
      `chore: pipeline improvements — ${doneCount}건 자동 수정\n\nCo-Authored-By: Pipeline Bot <pipeline@quickbizlab.com>`
    )

    return { branch: branchName, commit: commitResult?.sha || null, results, filesChanged: filesToCommit.length }
  }

  return { branch: null, commit: null, results }
}

// ── STEP 5: GUARD — 보안·품질 검수 (GitHub API 기반)
async function guardCheck(repo: string) {
  const issues: string[] = []

  // 1) .env가 git에 있는지 (GitHub Contents API로 확인)
  const envInGit = await fileExists(repo, '.env')
  const envLocalInGit = await fileExists(repo, '.env.local')
  if (envInGit) issues.push('⛔ .env 파일이 git에 추적됨')
  if (envLocalInGit) issues.push('⛔ .env.local 파일이 git에 추적됨')

  // 2) 소스 파일에서 TODO/FIXME 검색 (샘플링)
  let todoCount = 0
  let consoleLogCount = 0
  const sourceFiles: string[] = []
  for (const dir of ['app', 'src']) {
    const files = await listFiles(repo, dir)
    sourceFiles.push(...files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')))
  }
  for (const f of sourceFiles.slice(0, 15)) {
    const content = await readFile(repo, f)
    if (content) {
      todoCount += (content.match(/TODO|FIXME|HACK|XXX/g) || []).length
      consoleLogCount += (content.match(/console\.log/g) || []).length
    }
  }
  if (todoCount > 5) issues.push(`⚠️ TODO/FIXME ${todoCount}개 발견`)
  if (consoleLogCount > 3) issues.push(`⚠️ console.log ${consoleLogCount}개 잔존`)

  // 3) package.json 취약점 (간접 확인)
  const pkg = await readFile(repo, 'package.json')
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg)
      const deps = { ...parsed.dependencies, ...parsed.devDependencies }
      // 알려진 취약 패키지 체크 (간단한 규칙)
      if (deps['lodash'] && deps['lodash'].startsWith('3.')) issues.push('⚠️ lodash 구버전 사용')
    } catch { /* ignore */ }
  }

  const passed = !issues.some(i => i.startsWith('⛔'))
  return {
    passed,
    summary: passed
      ? `검수 통과 — 경고 ${issues.length}건${issues.length > 0 ? ' (info 레벨)' : ''}`
      : '검수 반려 — 심각 이슈 발견',
    issues,
  }
}

// ── STEP 6: OPS — 배포 준비 확인 (GitHub API 기반)
async function opsCheck(repo: string) {
  const checklist: string[] = []

  const hasPkg = await fileExists(repo, 'package.json')
  checklist.push(hasPkg ? '✅ package.json 존재' : '❌ package.json 없음')

  // git 상태 — 오픈 PR 수
  try {
    const prs = await ghFetch<Array<Record<string, unknown>>>(`/repos/${repo}/pulls?state=open&per_page=5`)
    checklist.push(prs.length > 0 ? `⚠️ 오픈 PR ${prs.length}개` : '✅ 오픈 PR 없음')
  } catch { checklist.push('⚠️ PR 확인 실패') }

  // 기본 브랜치
  try {
    const repoInfo = await ghFetch<{ default_branch: string }>(`/repos/${repo}`)
    checklist.push(`📌 기본 브랜치: ${repoInfo.default_branch}`)
  } catch { /* ignore */ }

  // Vercel 연동 — 환경 기반 간접 확인
  const hasVercelJson = await fileExists(repo, 'vercel.json')
  checklist.push(hasVercelJson ? '✅ vercel.json 존재' : '⚠️ vercel.json 미설정')

  const ready = !checklist.some(c => c.startsWith('❌'))
  return { ready, checklist }
}

// ── STEP 7: PR 생성
async function pushAndCreatePR(
  repo: string,
  branch: string,
  improvements: Array<{ title: string }>
) {
  const title = `chore: 파이프라인 개선 — ${improvements.length}건`
  const body = improvements.map((i, idx) => `- [x] ${idx + 1}. ${i.title}`).join('\n') +
    '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)'

  const pr = await createPullRequest(repo, branch, title, body)
  return pr ? { prUrl: pr.url } : { error: 'PR 생성 실패' }
}

// ── 개발 모드: PLAN (기획 수립)
async function planDevelopment(repo: string, task: string) {
  // 프로젝트 구조 파악
  let sourceFiles: string[] = []
  for (const dir of ['app', 'src']) {
    const files = await listFiles(repo, dir)
    sourceFiles = sourceFiles.concat(files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')))
  }
  const pkg = await readFile(repo, 'package.json')

  let snap = ''
  for (const f of sourceFiles.slice(0, 6)) {
    const content = await readFile(repo, f)
    if (content) {
      snap += `\n--- ${f} ---\n${content.split('\n').slice(0, 40).join('\n')}\n`
      if (snap.length > 2500) break
    }
  }

  const prompt = `You are a senior software architect. Create a development plan for this task.

PROJECT: ${repo}
TASK: ${task}

package.json (excerpt):
${pkg?.split('\n').slice(0, 30).join('\n') || 'N/A'}

File structure:
${sourceFiles.slice(0, 25).join('\n')}

Key file excerpts:
${snap}

Create a concrete plan in JSON (no markdown):
{
  "summary": "one-line summary of the plan",
  "steps": [
    {
      "title": "step title",
      "description": "what to do",
      "files": ["file/to/create-or-modify.ts"],
      "action": "create|modify|delete",
      "prompt": "detailed instruction for implementing this step"
    }
  ],
  "estimatedFiles": 3,
  "risk": "low|medium|high"
}`

  const ai = await geminiAI(prompt, 90_000)
  if (!ai || ai.includes('AI_ERROR')) return { error: `AI 기획 실패: ${ai?.slice(0, 100)}` }

  try {
    const m = ai.match(/\{[\s\S]*\}/)
    if (m) return { plan: JSON.parse(m[0]) }
  } catch { /* */ }
  return { error: 'AI 응답 파싱 실패', raw: ai.slice(0, 300) }
}

// ── 개발 모드: DEVELOP (구현)
async function executeDevelopment(
  repo: string,
  steps: Array<{ title: string; files: string[]; prompt: string; action: string }>
) {
  const repoName = repo.split('/').pop()
  const branchName = `dev/${repoName}-${Date.now()}`
  const results: Array<{ title: string; status: 'done' | 'skipped'; detail: string }> = []
  const filesToCommit: Array<{ path: string; content: string }> = []

  for (const step of steps) {
    try {
      const ctx = (await Promise.all(
        step.files.map(async f => {
          const content = await readFile(repo, f)
          return content
            ? `--- ${f} ---\n${content.split('\n').slice(0, 120).join('\n')}`
            : `--- ${f} --- (new file)`
        })
      )).join('\n\n')

      const devPrompt = `You are implementing a development step. ${step.action === 'create' ? 'Create new file(s)' : 'Modify existing file(s)'}.

TASK: ${step.prompt}

${ctx}

Output ONLY file content:
===FILE: relative/path.ts===
(full file content)
===END===

No explanation. No markdown. Just file content between markers.`

      const out = await geminiAI(devPrompt, 120_000)
      if (out && !out.includes('AI_ERROR') && out.includes('===FILE:')) {
        let count = 0
        for (const block of out.split('===FILE:').slice(1)) {
          const endIdx = block.indexOf('===END===')
          if (endIdx === -1) continue
          const hEnd = block.indexOf('===\n')
          if (hEnd === -1) continue
          const fp = block.slice(0, hEnd).trim()
          const content = block.slice(hEnd + 4, endIdx).trim()
          if (fp && content) {
            filesToCommit.push({ path: fp, content: content + '\n' })
            count++
          }
        }
        if (count > 0) {
          results.push({ title: step.title, status: 'done', detail: `${count}개 파일 ${step.action === 'create' ? '생성' : '수정'}` })
        } else {
          results.push({ title: step.title, status: 'skipped', detail: 'AI 파싱 실패' })
        }
      } else {
        results.push({ title: step.title, status: 'skipped', detail: `AI 구현 실패: ${(out || '').slice(0, 60)}` })
      }
    } catch (e: unknown) {
      results.push({ title: step.title, status: 'skipped', detail: `오류: ${(e as { message?: string }).message?.slice(0, 60)}` })
    }
  }

  if (filesToCommit.length > 0) {
    const branchOk = await createBranchFromMain(repo, branchName)
    if (!branchOk) return { branch: null, commit: null, results, error: '브랜치 생성 실패' }

    const doneCount = results.filter(r => r.status === 'done').length
    const commitResult = await commitFiles(
      repo, branchName, filesToCommit,
      `feat: ${steps[0]?.title || 'development'} — ${doneCount}건 구현\n\nCo-Authored-By: Pipeline Bot <pipeline@quickbizlab.com>`
    )
    return { branch: branchName, commit: commitResult?.sha || null, results, filesChanged: filesToCommit.length }
  }

  return { branch: null, commit: null, results }
}

// ── API 핸들러
export async function POST(req: NextRequest) {
  try {
    const { action, repo, improvements, branch, useAI, task, steps } = await req.json()

    if (!repo) return NextResponse.json({ error: 'repo 파라미터 필요' }, { status: 400 })

    switch (action) {
      case 'scan':
        return NextResponse.json(await scanRepo(repo))

      case 'analyze':
        return NextResponse.json(await analyzeRepo(repo, useAI !== false))

      case 'build':
        return NextResponse.json(await buildChanges(repo, improvements, useAI !== false))

      case 'guard':
        return NextResponse.json(await guardCheck(repo))

      case 'ops':
        return NextResponse.json(await opsCheck(repo))

      case 'plan':
        return NextResponse.json(await planDevelopment(repo, task))

      case 'develop':
        return NextResponse.json(await executeDevelopment(repo, steps))

      case 'push':
        return NextResponse.json(await pushAndCreatePR(repo, branch, improvements))

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string }).message?.slice(0, 200) || 'Unknown error' }, { status: 500 })
  }
}
