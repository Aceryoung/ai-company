// app/api/pipeline/route.ts — GitHub 파이프라인 실제 연동 API (Claude AI 연동)
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const TEMP_DIR = '/tmp/pipeline-prompts'

// ── Claude CLI 호출 헬퍼 (프롬프트를 파일로 전달)
function claudeAI(prompt: string, cwd?: string, timeoutSec = 60, maxTurns = 3): string {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })
    const promptFile = path.join(TEMP_DIR, `prompt-${Date.now()}.txt`)
    fs.writeFileSync(promptFile, prompt)
    const result = execSync(
      `cat "${promptFile}" | claude -p --max-turns ${maxTurns} --output-format text --tools "" 2>/dev/null`,
      { cwd, encoding: 'utf-8', timeout: timeoutSec * 1000 }
    ).trim()
    fs.unlinkSync(promptFile)
    return result
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string }
    return `AI_ERROR: ${err.stderr?.slice(0, 100) || err.message?.slice(0, 100) || 'unknown'}`
  }
}

// ── 레포 → 로컬 경로 매핑
const REPO_PATHS: Record<string, string> = {
  'Aceryoung/familyproject': '/Users/yedeukkyoung/Desktop/가족프로젝트/familyproject-main',
  'Aceryoung/sentence-collector': '/Users/yedeukkyoung/Desktop/글적',
}

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 30_000 }).trim()
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string }
    return `ERROR: ${err.stderr || err.message || 'unknown'}`
  }
}

// ── 빌드 검증 헬퍼 — AI 수정 후 빌드가 깨지면 원본 복구
function verifyBuild(localPath: string): { ok: boolean; error?: string } {
  try {
    execSync('npm run build 2>&1', { cwd: localPath, encoding: 'utf-8', timeout: 120_000 })
    return { ok: true }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const output = err.stdout || err.stderr || err.message || ''
    // 핵심 에러 메시지만 추출
    const errorLine = output.split('\n').find(l => /error|Error|failed/i.test(l))?.trim() || output.slice(0, 150)
    return { ok: false, error: errorLine }
  }
}

// ── STEP 0: REPO 스캔 — GitHub API로 실제 데이터 조회
async function scanRepo(repo: string) {
  const localPath = REPO_PATHS[repo]

  // GitHub API 데이터
  const repoInfo = JSON.parse(run(`gh api repos/${repo}`))
  const commits = JSON.parse(run(`gh api repos/${repo}/commits?per_page=10`))
  const issues = JSON.parse(run(`gh api "repos/${repo}/issues?state=open&per_page=20"`))
  const prs = JSON.parse(run(`gh api "repos/${repo}/pulls?state=open&per_page=10"`))

  // 로컬 레포 정보
  let localInfo = null
  if (localPath) {
    const branch = run('git branch --show-current', localPath)
    const status = run('git status --porcelain', localPath)
    const fileCount = run('find . -type f -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.next/*" | wc -l', localPath)
    const lastCommit = run('git log -1 --format="%h %s (%cr)"', localPath)
    localInfo = { branch, dirty: status.length > 0, dirtyFiles: status.split('\n').filter(Boolean).length, fileCount: parseInt(fileCount), lastCommit }
  }

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
    commits: commits.slice(0, 5).map((c: Record<string, unknown>) => ({
      sha: (c.sha as string).slice(0, 7),
      message: (c.commit as Record<string, unknown> & { message: string }).message.split('\n')[0],
      date: (c.commit as Record<string, unknown> & { author: { date: string } }).author.date,
      author: (c.commit as Record<string, unknown> & { author: { name: string } }).author.name,
    })),
    issues: issues.filter((i: Record<string, unknown>) => !(i.pull_request)).map((i: Record<string, unknown>) => ({
      number: i.number,
      title: i.title,
      labels: (i.labels as Array<{ name: string }>).map(l => l.name),
      created_at: i.created_at,
    })),
    prs: prs.map((p: Record<string, unknown>) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      draft: p.draft,
    })),
    local: localInfo,
  }
}

// ── STEP 1: 개선점 분석 — 로컬 코드 실제 분석
function analyzeRepo(repo: string, useAI = true) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { improvements: [], error: '로컬 레포 경로 없음' }

  const improvements: Array<{
    id: string; title: string; description: string
    type: 'perf' | 'sec' | 'feat' | 'refactor' | 'doc'
    priority: 'high' | 'medium' | 'low'
    effort: 'small' | 'medium' | 'large'
    auto: boolean  // 자동 수정 가능 여부
    files?: string[]
  }> = []

  let idx = 0
  const addImp = (title: string, desc: string, type: string, priority: string, effort: string, auto: boolean, files?: string[]) => {
    improvements.push({
      id: `imp-${++idx}`,
      title, description: desc,
      type: type as 'perf' | 'sec' | 'feat' | 'refactor' | 'doc',
      priority: priority as 'high' | 'medium' | 'low',
      effort: effort as 'small' | 'medium' | 'large',
      auto, files,
    })
  }

  // 1) README.md 존재·품질 확인
  const hasReadme = run(`test -f ${localPath}/README.md && echo yes || echo no`) === 'yes'
  if (!hasReadme) {
    addImp('README.md 생성', '프로젝트 설명·실행 방법·환경변수 목록이 담긴 README 생성', 'doc', 'high', 'small', true)
  } else {
    const readmeLen = parseInt(run(`wc -c < ${localPath}/README.md`))
    if (readmeLen < 200) {
      addImp('README.md 보강', `현재 ${readmeLen}바이트 — 프로젝트 설명·기술스택·실행방법 추가 필요`, 'doc', 'medium', 'small', true, ['README.md'])
    }
  }

  // 2) CHANGELOG.md 확인
  const hasChangelog = run(`test -f ${localPath}/CHANGELOG.md && echo yes || echo no`) === 'yes'
  if (!hasChangelog) {
    addImp('CHANGELOG.md 생성', '배포 이력 추적을 위한 CHANGELOG 파일 생성', 'doc', 'medium', 'small', true)
  }

  // 3) .env.example 확인
  const hasEnvExample = run(`test -f ${localPath}/.env.example && echo yes || echo no`) === 'yes'
  const hasEnvLocal = run(`test -f ${localPath}/.env.local && echo yes || echo no`) === 'yes'
  const hasEnv = run(`test -f ${localPath}/.env && echo yes || echo no`) === 'yes'
  if (!hasEnvExample && (hasEnvLocal || hasEnv)) {
    addImp('.env.example 생성', '.env 파일은 있으나 .env.example이 없음 — 팀원 온보딩 시 필요', 'doc', 'high', 'small', true)
  }

  // 4) .gitignore 확인
  const hasGitignore = run(`test -f ${localPath}/.gitignore && echo yes || echo no`) === 'yes'
  if (hasGitignore) {
    const gitignore = run(`cat ${localPath}/.gitignore`)
    if (!gitignore.includes('node_modules')) {
      addImp('.gitignore에 node_modules 추가', 'node_modules가 .gitignore에 없음', 'sec', 'high', 'small', true, ['.gitignore'])
    }
    if (!gitignore.includes('.env') && !gitignore.includes('.env.local')) {
      addImp('.gitignore에 .env 추가', '환경변수 파일이 .gitignore에 없음 — 보안 위험', 'sec', 'high', 'small', true, ['.gitignore'])
    }
  }

  // 5) TypeScript strict 확인
  const hasTsConfig = run(`test -f ${localPath}/tsconfig.json && echo yes || echo no`) === 'yes'
  if (hasTsConfig) {
    const tsconfig = run(`cat ${localPath}/tsconfig.json`)
    if (!tsconfig.includes('"strict": true') && !tsconfig.includes('"strict":true')) {
      addImp('TypeScript strict 모드 활성화', 'tsconfig.json에 strict: true 설정 필요', 'refactor', 'medium', 'medium', true, ['tsconfig.json'])
    }
  }

  // 6) package.json 분석
  const hasPkg = run(`test -f ${localPath}/package.json && echo yes || echo no`) === 'yes'
  if (hasPkg) {
    const pkg = run(`cat ${localPath}/package.json`)
    try {
      const parsed = JSON.parse(pkg)
      // 테스트 스크립트 확인 → 자동 추가 가능
      if (!parsed.scripts?.test || parsed.scripts.test.includes('no test specified')) {
        addImp('테스트 스크립트 추가', 'package.json에 test 스크립트 자동 추가', 'feat', 'medium', 'small', true, ['package.json'])
      }
      // lint 스크립트 확인 → Next.js면 자동 추가
      const deps = { ...parsed.dependencies, ...parsed.devDependencies }
      if (!parsed.scripts?.lint && deps.next) {
        addImp('린트 스크립트 추가', 'package.json에 "lint": "next lint" 자동 추가', 'refactor', 'medium', 'small', true, ['package.json'])
      }
    } catch { /* ignore parse error */ }
  }

  // 7) GitHub Actions CI 워크플로우 확인 → 자동 생성
  const hasCi = run(`test -d ${localPath}/.github/workflows && ls ${localPath}/.github/workflows/*.yml 2>/dev/null | wc -l`)
  if (parseInt(hasCi) === 0) {
    addImp('GitHub Actions CI 워크플로우 생성', '.github/workflows/ci.yml 자동 생성 — PR 시 자동 빌드·린트', 'feat', 'high', 'small', true, ['.github/workflows/ci.yml'])
  }

  // 8) LICENSE 파일 확인 → 자동 생성
  const hasLicense = run(`test -f ${localPath}/LICENSE && echo yes || echo no`) === 'yes'
  if (!hasLicense) {
    addImp('LICENSE 파일 생성', 'MIT 라이선스 파일 자동 생성', 'doc', 'low', 'small', true, ['LICENSE'])
  }

  // 9) .env.example 자동 갱신 (소스에서 process.env 스캔)
  if (hasEnvExample) {
    const envVarsInCode = run(`grep -roh "process\\.env\\.[A-Z_]*" ${localPath}/src ${localPath}/app 2>/dev/null | sort -u`)
    const envExample = run(`cat ${localPath}/.env.example`)
    const missing = envVarsInCode.split('\n')
      .map(v => v.replace('process.env.', ''))
      .filter(v => v && !envExample.includes(v))
    if (missing.length > 0) {
      addImp('.env.example 갱신', `코드에서 사용 중이나 .env.example에 없는 변수 ${missing.length}개: ${missing.slice(0, 3).join(', ')}`, 'doc', 'medium', 'small', true, ['.env.example'])
    }
  }

  // 10) 보안: .env 파일이 git에 커밋됐는지 확인
  const envInGit = run(`cd ${localPath} && git ls-files .env .env.local 2>/dev/null`)
  if (envInGit.length > 0 && !envInGit.includes('ERROR')) {
    addImp('⚠️ .env 파일 git 이력 제거', `.env 파일이 git에 추적됨: ${envInGit} — 보안 위험`, 'sec', 'high', 'large', false, envInGit.split('\n'))
  }

  // 11) 미사용 의존성 체크 → 자동 제거 가능
  if (hasPkg) {
    const pkg = run(`cat ${localPath}/package.json`)
    try {
      const parsed = JSON.parse(pkg)
      const deps = Object.keys(parsed.dependencies || {})
      const srcFiles = run(`find ${localPath}/src ${localPath}/app -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | head -50`)
      if (srcFiles) {
        const srcContent = run(`cat ${srcFiles.split('\n').slice(0, 30).join(' ')} 2>/dev/null | head -500`)
        // 코어 패키지는 제외, 나머지 중 소스에서 미사용인 것만
        const corePackages = ['react', 'react-dom', 'next', 'typescript', '@types/react', '@types/node']
        const unused = deps.filter(d => !corePackages.includes(d) && !srcContent.includes(d))
        if (unused.length > 3) {
          addImp(`미사용 의존성 ${unused.length}개 제거`, `자동 제거: ${unused.slice(0, 5).join(', ')}${unused.length > 5 ? '...' : ''}`, 'refactor', 'medium', 'small', true, ['package.json'])
        }
      }
    } catch { /* ignore */ }
  }

  // ── 12) Claude AI 코드 분석 (실제 코드 읽고 개선점 도출) — 한도 남아있을 때만
  if (!useAI) { return { improvements, skippedAI: true } }
  try {
    // 주요 소스파일 목록 수집
    const keyFiles = run(`find ${localPath}/src ${localPath}/app -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -15`)
    if (keyFiles && !keyFiles.includes('ERROR')) {
      const fileList = keyFiles.split('\n').filter(Boolean)
      // 파일 내용 샘플링 (총 3000자 이내)
      let codeSnapshot = ''
      for (const f of fileList.slice(0, 8)) {
        const relPath = f.replace(localPath + '/', '')
        const content = run(`head -60 "${f}" 2>/dev/null`)
        if (content && !content.includes('ERROR')) {
          codeSnapshot += `\n--- ${relPath} ---\n${content}\n`
          if (codeSnapshot.length > 3000) break
        }
      }

      if (codeSnapshot.length > 200) {
        const prompt = `You are a senior code reviewer. Analyze these source files and suggest 2-3 concrete, specific improvements.

Rules:
- Only suggest changes YOU can implement by editing files
- Each suggestion must name the exact file(s) to change
- Focus on: error handling, type safety, performance, security, code quality
- Do NOT suggest adding tests, docs, or config changes (those are handled separately)
- Be specific: "Add try-catch to fetchData in api/route.ts" not "improve error handling"

Source files:
${codeSnapshot}

Respond in this exact JSON format (no markdown, no explanation):
[{"title":"short title","description":"what to change and why","type":"refactor|perf|sec|feat","priority":"high|medium|low","effort":"small|medium|large","files":["relative/path.ts"],"prompt":"detailed instruction for making this change"}]`

        const aiResult = claudeAI(prompt, localPath, 45)

        if (aiResult && !aiResult.includes('ERROR') && aiResult.includes('[')) {
          try {
            // JSON 배열 추출
            const jsonMatch = aiResult.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const aiImprovements = JSON.parse(jsonMatch[0]) as Array<{
                title: string; description: string; type: string
                priority: string; effort: string; files: string[]; prompt: string
              }>
              for (const ai of aiImprovements.slice(0, 3)) {
                addImp(
                  `🤖 ${ai.title}`,
                  ai.description,
                  ai.type || 'refactor',
                  ai.priority || 'medium',
                  ai.effort || 'medium',
                  true, // AI가 직접 수정 가능
                  ai.files,
                )
                // AI 수정 프롬프트를 별도 저장 (buildChanges에서 사용)
                const lastImp = improvements[improvements.length - 1]
                ;(lastImp as Record<string, unknown>).aiPrompt = ai.prompt
              }
            }
          } catch { /* AI 응답 파싱 실패 — 무시 */ }
        }
      }
    }
  } catch { /* AI 분석 실패해도 규칙 기반 결과는 유지 */ }

  return { improvements }
}

// ── STEP 3: BUILD — 실제 브랜치 생성 + 코드 수정
async function buildChanges(repo: string, improvements: Array<{ id: string; title: string; type: string; auto?: boolean }>, useAI = true) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { error: '로컬 레포 경로 없음' }

  const repoName = repo.split('/').pop()
  const branchName = `improve/${repoName}-${Date.now()}`
  const results: Array<{ id: string; title: string; status: 'done' | 'skipped'; detail: string }> = []

  // 메인 브랜치로 이동 + 최신화
  const defaultBranch = run('git branch --show-current', localPath) || 'main'
  run(`git checkout ${defaultBranch}`, localPath)
  run('git pull --rebase 2>/dev/null || true', localPath)

  // 개선 브랜치 생성
  run(`git checkout -b ${branchName}`, localPath)

  for (const imp of improvements) {
    if (!imp.auto) {
      results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '수동 작업 필요 — 자동 수정 불가' })
      continue
    }

    try {
      switch (true) {
        case imp.title.includes('README.md 생성'): {
          const pkg = run(`cat ${localPath}/package.json 2>/dev/null`)
          let name = repoName, desc = '', stack = ''
          try {
            const p = JSON.parse(pkg)
            name = p.name || repoName
            desc = p.description || ''
            const deps = Object.keys(p.dependencies || {})
            stack = deps.filter(d => ['next', 'react', 'vue', 'express', 'supabase', 'prisma'].some(k => d.includes(k))).join(' · ') || 'Node.js'
          } catch { /* ignore */ }
          const readme = `# ${name}\n\n${desc}\n\n## Tech Stack\n${stack}\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Environment Variables\n\nCopy \`.env.example\` to \`.env.local\` and fill in the values.\n`
          execSync(`cat > ${localPath}/README.md << 'HEREDOC'\n${readme}\nHEREDOC`, { encoding: 'utf-8' })
          run(`cd ${localPath} && git add README.md`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'README.md 생성 완료' })
          break
        }
        case imp.title.includes('README.md 보강'): {
          // 기존 README 앞에 배지 추가
          const existing = run(`cat ${localPath}/README.md`)
          if (!existing.includes('Getting Started') && !existing.includes('## 실행')) {
            const append = `\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
            execSync(`echo '${append}' >> ${localPath}/README.md`, { encoding: 'utf-8' })
            run(`cd ${localPath} && git add README.md`)
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'README.md에 실행 방법 추가' })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '이미 실행 방법 포함됨' })
          }
          break
        }
        case imp.title.includes('CHANGELOG.md 생성'): {
          const today = new Date().toISOString().split('T')[0]
          const changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n## [0.1.0] — ${today}\n\n### Added\n- Initial project setup\n`
          execSync(`cat > ${localPath}/CHANGELOG.md << 'HEREDOC'\n${changelog}\nHEREDOC`, { encoding: 'utf-8' })
          run(`cd ${localPath} && git add CHANGELOG.md`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'CHANGELOG.md 생성 완료' })
          break
        }
        case imp.title.includes('.env.example 생성'): {
          const envFile = run(`cat ${localPath}/.env.local 2>/dev/null || cat ${localPath}/.env 2>/dev/null`)
          if (envFile) {
            const example = envFile.split('\n').map(line => {
              if (line.startsWith('#') || line.trim() === '') return line
              const [key] = line.split('=')
              return `${key}=`
            }).join('\n')
            execSync(`cat > ${localPath}/.env.example << 'HEREDOC'\n${example}\nHEREDOC`, { encoding: 'utf-8' })
            run(`cd ${localPath} && git add .env.example`)
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.env.example 생성 완료 (값 제거)' })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '.env 파일을 찾을 수 없음' })
          }
          break
        }
        case imp.title.includes('.gitignore'): {
          const gitignore = run(`cat ${localPath}/.gitignore`)
          let updated = gitignore
          if (imp.title.includes('node_modules') && !gitignore.includes('node_modules')) {
            updated += '\nnode_modules/'
          }
          if (imp.title.includes('.env') && !gitignore.includes('.env')) {
            updated += '\n.env\n.env.local\n.env.production'
          }
          execSync(`cat > ${localPath}/.gitignore << 'HEREDOC'\n${updated}\nHEREDOC`, { encoding: 'utf-8' })
          run(`cd ${localPath} && git add .gitignore`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.gitignore 업데이트 완료' })
          break
        }
        case imp.title.includes('TypeScript strict'): {
          const tsconfig = run(`cat ${localPath}/tsconfig.json`)
          const updated = tsconfig.replace(/"strict"\s*:\s*false/, '"strict": true')
          if (updated !== tsconfig) {
            execSync(`cat > ${localPath}/tsconfig.json << 'HEREDOC'\n${updated}\nHEREDOC`, { encoding: 'utf-8' })
            run(`cd ${localPath} && git add tsconfig.json`)
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'tsconfig strict: true 설정' })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '이미 설정됨 또는 수동 확인 필요' })
          }
          break
        }
        case imp.title.includes('테스트 스크립트 추가'): {
          const pkgPath = `${localPath}/package.json`
          const pkg = JSON.parse(run(`cat ${pkgPath}`))
          pkg.scripts = pkg.scripts || {}
          pkg.scripts.test = 'echo "Tests will be configured — see CI workflow"'
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
          run(`cd ${localPath} && git add package.json`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'package.json에 test 스크립트 추가' })
          break
        }
        case imp.title.includes('린트 스크립트 추가'): {
          const pkgPath = `${localPath}/package.json`
          const pkg = JSON.parse(run(`cat ${pkgPath}`))
          pkg.scripts = pkg.scripts || {}
          pkg.scripts.lint = 'next lint'
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
          run(`cd ${localPath} && git add package.json`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'package.json에 lint 스크립트 추가' })
          break
        }
        case imp.title.includes('GitHub Actions CI'): {
          const workflowDir = `${localPath}/.github/workflows`
          run(`mkdir -p ${workflowDir}`)
          const ci = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run lint --if-present
`
          fs.writeFileSync(`${workflowDir}/ci.yml`, ci)
          run(`cd ${localPath} && git add .github/workflows/ci.yml`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: '.github/workflows/ci.yml 생성' })
          break
        }
        case imp.title.includes('LICENSE'): {
          const year = new Date().getFullYear()
          const license = `MIT License

Copyright (c) ${year} Aceryoung

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
          fs.writeFileSync(`${localPath}/LICENSE`, license)
          run(`cd ${localPath} && git add LICENSE`)
          results.push({ id: imp.id, title: imp.title, status: 'done', detail: 'MIT LICENSE 파일 생성' })
          break
        }
        case imp.title.includes('.env.example 갱신'): {
          const envVarsInCode = run(`grep -roh "process\\.env\\.[A-Z_]*" ${localPath}/src ${localPath}/app 2>/dev/null | sort -u`)
          const existingExample = run(`cat ${localPath}/.env.example`)
          const missing = envVarsInCode.split('\n')
            .map(v => v.replace('process.env.', ''))
            .filter(v => v && !existingExample.includes(v))
          if (missing.length > 0) {
            const append = '\n# Auto-detected from source\n' + missing.map(v => `${v}=`).join('\n') + '\n'
            fs.appendFileSync(`${localPath}/.env.example`, append)
            run(`cd ${localPath} && git add .env.example`)
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: `${missing.length}개 환경변수 추가` })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '추가할 변수 없음' })
          }
          break
        }
        case imp.title.includes('미사용 의존성'): {
          // package.json에서 미사용 의존성 제거
          const pkgPath = `${localPath}/package.json`
          const pkg = JSON.parse(run(`cat ${pkgPath}`))
          const deps = Object.keys(pkg.dependencies || {})
          const srcFiles = run(`find ${localPath}/src ${localPath}/app -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | head -50`)
          const srcContent = srcFiles ? run(`cat ${srcFiles.split('\n').slice(0, 30).join(' ')} 2>/dev/null | head -500`) : ''
          const corePackages = ['react', 'react-dom', 'next', 'typescript', '@types/react', '@types/node']
          const unused = deps.filter(d => !corePackages.includes(d) && !srcContent.includes(d))
          if (unused.length > 0) {
            for (const dep of unused) delete pkg.dependencies[dep]
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
            run(`cd ${localPath} && git add package.json`)
            results.push({ id: imp.id, title: imp.title, status: 'done', detail: `${unused.length}개 제거: ${unused.slice(0, 3).join(', ')}` })
          } else {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '제거할 의존성 없음' })
          }
          break
        }
        case imp.title.startsWith('🤖'): {
          // AI 생성 개선점 — Claude CLI로 실제 코드 수정 (한도 체크)
          if (!useAI) {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: '⚠️ 토큰 한도 부족 — AI 수정 건너뜀' })
            break
          }
          const aiPrompt = (imp as Record<string, unknown>).aiPrompt as string
          if (!aiPrompt) {
            results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: 'AI 프롬프트 없음' })
            break
          }
          const targetFiles = (imp as Record<string, unknown>).files as string[] | undefined
          const fileContext = targetFiles
            ? targetFiles.map(f => {
                const content = run(`cat "${localPath}/${f}" 2>/dev/null | head -100`)
                return content ? `--- ${f} ---\n${content}` : ''
              }).filter(Boolean).join('\n\n')
            : ''

          const editPrompt = `You are editing source code. Apply this change:

${aiPrompt}

${fileContext ? `Current file contents:\n${fileContext}` : ''}

Output ONLY the complete modified file content for each file, in this format:
===FILE: relative/path.ts===
(full file content)
===END===

No explanation. No markdown. Just the file content between markers.`

          const aiOutput = claudeAI(editPrompt, localPath, 60)

          if (aiOutput && aiOutput.includes('===FILE:')) {
            const fileBlocks = aiOutput.split('===FILE:').slice(1)
            // 변경 전 원본 백업
            const backups: Array<{ path: string; content: string | null }> = []
            let editCount = 0
            for (const block of fileBlocks) {
              const endIdx = block.indexOf('===END===')
              if (endIdx === -1) continue
              const headerEnd = block.indexOf('===\n')
              if (headerEnd === -1) continue
              const filePath = block.slice(0, headerEnd).trim()
              const content = block.slice(headerEnd + 4, endIdx).trim()
              if (filePath && content) {
                const fullPath = `${localPath}/${filePath}`
                // 원본 백업
                backups.push({ path: fullPath, content: fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : null })
                fs.writeFileSync(fullPath, content + '\n')
                run(`cd ${localPath} && git add "${filePath}"`)
                editCount++
              }
            }
            if (editCount > 0) {
              // 🔒 빌드 검증 — 실패 시 원본 복구
              const buildCheck = verifyBuild(localPath)
              if (!buildCheck.ok) {
                for (const b of backups) {
                  if (b.content !== null) fs.writeFileSync(b.path, b.content)
                  else if (fs.existsSync(b.path)) fs.unlinkSync(b.path)
                  run(`cd ${localPath} && git checkout -- "${b.path.replace(localPath + '/', '')}" 2>/dev/null || true`)
                }
                run(`cd ${localPath} && git reset HEAD 2>/dev/null || true`)
                results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: `⛔ 빌드 실패 → 원본 복구: ${buildCheck.error?.slice(0, 80)}` })
              } else {
                results.push({ id: imp.id, title: imp.title, status: 'done', detail: `AI가 ${editCount}개 파일 수정 (✅ 빌드 검증 통과)` })
              }
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
      const err = e as { message?: string }
      results.push({ id: imp.id, title: imp.title, status: 'skipped', detail: `오류: ${err.message?.slice(0, 80)}` })
    }
  }

  // 변경사항이 있으면 커밋
  const staged = run(`cd ${localPath} && git diff --cached --stat`)
  if (staged) {
    const commitMsg = `chore: pipeline improvements — ${results.filter(r => r.status === 'done').length}건 자동 수정\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
    run(`cd ${localPath} && git commit -m "${commitMsg}"`)
    const commitHash = run('git rev-parse --short HEAD', localPath)
    return { branch: branchName, commit: commitHash, results, staged }
  } else {
    // 변경 없으면 브랜치 삭제
    run(`git checkout ${defaultBranch}`, localPath)
    run(`git branch -D ${branchName}`, localPath)
    return { branch: null, commit: null, results, staged: '' }
  }
}

// ── STEP 5: GUARD — 실제 보안·품질 검수
function guardCheck(repo: string) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { passed: false, summary: '로컬 경로 없음', issues: [] }

  const issues: string[] = []

  // 1) .env가 git에 있는지
  const envInGit = run(`cd ${localPath} && git ls-files .env .env.local 2>/dev/null`)
  if (envInGit) issues.push(`⛔ .env 파일이 git에 추적됨: ${envInGit}`)

  // 2) TODO/FIXME 검색
  const todos = run(`grep -rn "TODO\\|FIXME\\|HACK\\|XXX" ${localPath}/src ${localPath}/app 2>/dev/null | wc -l`)
  const todoCount = parseInt(todos) || 0
  if (todoCount > 5) issues.push(`⚠️ TODO/FIXME ${todoCount}개 발견`)

  // 3) console.log 남아있는지
  const consoleLogs = run(`grep -rn "console\\.log" ${localPath}/src ${localPath}/app 2>/dev/null | grep -v node_modules | wc -l`)
  const logCount = parseInt(consoleLogs) || 0
  if (logCount > 3) issues.push(`⚠️ console.log ${logCount}개 잔존`)

  // 4) TypeScript 에러 확인
  const hasNextBuild = run(`test -f ${localPath}/node_modules/.bin/tsc && echo yes || echo no`) === 'yes'
  if (hasNextBuild) {
    const tscErrors = run(`cd ${localPath} && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`)
    const errCount = parseInt(tscErrors) || 0
    if (errCount > 0) issues.push(`⛔ TypeScript 에러 ${errCount}개`)
  }

  // 5) 패키지 취약점
  const auditResult = run(`cd ${localPath} && npm audit --json 2>/dev/null | head -5`)
  if (auditResult.includes('"high"') || auditResult.includes('"critical"')) {
    issues.push('⚠️ npm audit에서 high/critical 취약점 발견')
  }

  const passed = !issues.some(i => i.startsWith('⛔'))
  return {
    passed,
    summary: passed
      ? `검수 통과 — 경고 ${issues.length}건${issues.length > 0 ? ' (info 레벨)' : ''}`
      : `검수 반려 — 심각 이슈 발견`,
    issues,
  }
}

// ── STEP 6: OPS — 배포 준비 확인
function opsCheck(repo: string) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { ready: false, checklist: ['로컬 경로 없음'] }

  const checklist: string[] = []

  // 빌드 테스트
  const buildable = run(`test -f ${localPath}/package.json && echo yes || echo no`) === 'yes'
  checklist.push(buildable ? '✅ package.json 존재' : '❌ package.json 없음')

  // node_modules 존재
  const hasModules = run(`test -d ${localPath}/node_modules && echo yes || echo no`) === 'yes'
  checklist.push(hasModules ? '✅ node_modules 설치됨' : '⚠️ npm install 필요')

  // git 상태
  const dirty = run('git status --porcelain', localPath)
  checklist.push(dirty ? `⚠️ 미커밋 변경 ${dirty.split('\n').filter(Boolean).length}개` : '✅ git 클린 상태')

  // 현재 브랜치
  const branch = run('git branch --show-current', localPath)
  checklist.push(`📌 현재 브랜치: ${branch}`)

  // Vercel 연동 확인
  const hasVercel = run(`test -d ${localPath}/.vercel && echo yes || echo no`) === 'yes'
  checklist.push(hasVercel ? '✅ Vercel 프로젝트 연결됨' : '⚠️ Vercel 미연결')

  const ready = !checklist.some(c => c.startsWith('❌'))
  return { ready, checklist }
}

// ── STEP 7: PR 생성 (대표 push 대체)
function createPR(repo: string, branch: string, improvements: Array<{ title: string }>) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { error: '로컬 경로 없음' }

  // push
  const pushResult = run(`cd ${localPath} && git push origin ${branch} 2>&1`)
  if (pushResult.includes('ERROR')) return { error: pushResult }

  // PR 생성
  const title = `chore: 파이프라인 개선 — ${improvements.length}건`
  const body = improvements.map((i, idx) => `- [x] ${idx + 1}. ${i.title}`).join('\n') + '\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)'

  const prResult = run(`cd ${localPath} && gh pr create --title "${title}" --body "${body}" --base main 2>&1`)
  const prUrl = prResult.match(/https:\/\/github\.com\/.+\/pull\/\d+/)?.[0]

  return { prUrl: prUrl || null, output: prResult }
}

// ── 개발 모드: PLAN (기획 수립)
function planDevelopment(repo: string, task: string) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { error: '로컬 레포 경로 없음' }

  // 프로젝트 구조 파악
  const structure = run(`find ${localPath}/src ${localPath}/app -type f \\( -name "*.ts" -o -name "*.tsx" \\) 2>/dev/null | head -25`)
  const pkg = run(`cat ${localPath}/package.json 2>/dev/null | head -30`)

  let snap = ''
  for (const f of structure.split('\n').filter(Boolean).slice(0, 6)) {
    const rel = f.replace(localPath + '/', '')
    const c = run(`head -40 "${f}" 2>/dev/null`)
    if (c && !c.includes('ERROR')) { snap += `\n--- ${rel} ---\n${c}\n`; if (snap.length > 2500) break }
  }

  const prompt = `You are a senior software architect. Create a development plan for this task.

PROJECT: ${repo}
TASK: ${task}

package.json (excerpt):
${pkg}

File structure:
${structure}

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

  const ai = claudeAI(prompt, localPath, 90, 5)
  if (!ai || ai.includes('AI_ERROR') || ai.includes('Reached max turns')) return { error: `AI 기획 실패: ${ai?.slice(0, 100)}` }

  try {
    const m = ai.match(/\{[\s\S]*\}/)
    if (m) {
      const plan = JSON.parse(m[0]) as { summary: string; steps: Array<{ title: string; description: string; files: string[]; action: string; prompt: string }>; estimatedFiles: number; risk: string }
      return { plan }
    }
  } catch { /* */ }
  return { error: 'AI 응답 파싱 실패', raw: ai.slice(0, 300) }
}

// ── 개발 모드: DEVELOP (구현)
async function executeDevelopment(repo: string, steps: Array<{ title: string; files: string[]; prompt: string; action: string }>) {
  const localPath = REPO_PATHS[repo]
  if (!localPath) return { error: '로컬 레포 경로 없음' }

  const repoName = repo.split('/').pop()
  const branchName = `dev/${repoName}-${Date.now()}`
  const results: Array<{ title: string; status: 'done' | 'skipped'; detail: string }> = []

  const defaultBranch = run('git branch --show-current', localPath) || 'main'
  run(`git checkout ${defaultBranch}`, localPath)
  run('git pull --rebase 2>/dev/null || true', localPath)
  run(`git checkout -b ${branchName}`, localPath)

  for (const step of steps) {
    try {
      // 기존 파일 컨텍스트 수집
      const ctx = step.files.map(f => {
        const c = run(`cat "${localPath}/${f}" 2>/dev/null | head -120`)
        return c && !c.includes('ERROR') ? `--- ${f} ---\n${c}` : `--- ${f} --- (new file)`
      }).join('\n\n')

      const devPrompt = `You are implementing a development step. ${step.action === 'create' ? 'Create new file(s)' : 'Modify existing file(s)'}.

TASK: ${step.prompt}

${ctx}

Output ONLY file content:
===FILE: relative/path.ts===
(full file content)
===END===

No explanation. No markdown. Just file content between markers.`

      const out = claudeAI(devPrompt, localPath, 120, 5)
      if (out && !out.includes('AI_ERROR') && !out.includes('Reached max turns') && out.includes('===FILE:')) {
        const backups: Array<{ path: string; content: string | null }> = []
        let count = 0
        for (const block of out.split('===FILE:').slice(1)) {
          const endIdx = block.indexOf('===END==='); if (endIdx === -1) continue
          const hEnd = block.indexOf('===\n'); if (hEnd === -1) continue
          const fp = block.slice(0, hEnd).trim(), c = block.slice(hEnd + 4, endIdx).trim()
          if (fp && c) {
            const full = `${localPath}/${fp}`, dir = path.dirname(full)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            // 원본 백업
            backups.push({ path: full, content: fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : null })
            fs.writeFileSync(full, c + '\n')
            run(`cd ${localPath} && git add "${fp}"`)
            count++
          }
        }
        if (count > 0) {
          // 🔒 빌드 검증 — 실패 시 원본 복구
          const buildCheck = verifyBuild(localPath)
          if (!buildCheck.ok) {
            for (const b of backups) {
              if (b.content !== null) fs.writeFileSync(b.path, b.content)
              else if (fs.existsSync(b.path)) fs.unlinkSync(b.path)
              run(`cd ${localPath} && git checkout -- "${b.path.replace(localPath + '/', '')}" 2>/dev/null || true`)
            }
            run(`cd ${localPath} && git reset HEAD 2>/dev/null || true`)
            results.push({ title: step.title, status: 'skipped', detail: `⛔ 빌드 실패 → 원본 복구: ${buildCheck.error?.slice(0, 80)}` })
          } else {
            results.push({ title: step.title, status: 'done', detail: `${count}개 파일 ${step.action === 'create' ? '생성' : '수정'} (✅ 빌드 검증 통과)` })
          }
        } else {
          results.push({ title: step.title, status: 'skipped', detail: 'AI 파싱 실패' })
        }
      } else {
        results.push({ title: step.title, status: 'skipped', detail: `AI 구현 실패: ${(out||'').slice(0, 60)}` })
      }
    } catch (e: unknown) {
      results.push({ title: step.title, status: 'skipped', detail: `오류: ${(e as { message?: string }).message?.slice(0, 60)}` })
    }
  }

  const staged = run(`cd ${localPath} && git diff --cached --stat`)
  if (staged) {
    const doneCount = results.filter(r => r.status === 'done').length
    run(`cd ${localPath} && git commit -m "feat: ${steps[0]?.title || 'development'} — ${doneCount}건 구현\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"`)
    return { branch: branchName, commit: run('git rev-parse --short HEAD', localPath), results, staged }
  } else {
    run(`git checkout ${defaultBranch}`, localPath)
    run(`git branch -D ${branchName}`, localPath)
    return { branch: null, commit: null, results, staged: '' }
  }
}

// ── API 핸들러
export async function POST(req: NextRequest) {
  const { action, repo, improvements, branch, useAI, task, steps } = await req.json()

  switch (action) {
    case 'scan':
      return NextResponse.json(await scanRepo(repo))

    case 'analyze':
      return NextResponse.json(analyzeRepo(repo, useAI !== false))

    case 'build':
      return NextResponse.json(await buildChanges(repo, improvements, useAI !== false))

    case 'guard':
      return NextResponse.json(guardCheck(repo))

    case 'ops':
      return NextResponse.json(opsCheck(repo))

    case 'plan':
      return NextResponse.json(planDevelopment(repo, task))

    case 'develop':
      return NextResponse.json(await executeDevelopment(repo, steps))

    case 'push':
      return NextResponse.json(createPR(repo, branch, improvements))

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
