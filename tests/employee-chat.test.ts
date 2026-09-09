import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Next.js modules before importing route
vi.mock('next/server', () => {
  class MockNextRequest {
    private body: unknown
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : {}
    }
    async json() { return this.body }
  }
  class MockNextResponse {
    static json(data: unknown, init?: { status?: number }) {
      return { json: async () => data, status: init?.status || 200, _data: data }
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse }
})

// Capture fetch calls for assertions
const fetchCalls: Array<{ url: string; body?: unknown }> = []
const originalFetch = globalThis.fetch

function mockFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
  const body = init?.body ? JSON.parse(init.body as string) : undefined
  fetchCalls.push({ url: urlStr, body })

  // Gemini API mock
  if (urlStr.includes('generativelanguage.googleapis.com')) {
    return Promise.resolve(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: mockGeminiResponse }] } }],
    }), { status: 200 }))
  }

  // Notion API mock
  if (urlStr.includes('api.notion.com/v1/pages')) {
    return Promise.resolve(new Response(JSON.stringify({
      id: 'mock-notion-id-' + Date.now(),
      url: 'https://app.notion.com/p/mock-page-id',
    }), { status: 200 }))
  }
  if (urlStr.includes('api.notion.com/v1/search')) {
    return Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 }))
  }

  // URL fetch mock (for URL analysis feature)
  if (urlStr.includes('example.com/test-article')) {
    return Promise.resolve(new Response(
      '<html><body><h1>Test Article</h1><p>This is test content about AI technology trends in 2026.</p></body></html>',
      { status: 200, headers: { 'content-type': 'text/html' } }
    ))
  }

  // Supabase mock
  if (urlStr.includes('supabase.co') && urlStr.includes('employee_reports')) {
    return Promise.resolve(new Response(JSON.stringify([{ id: 'mock-report-id' }]), { status: 201 }))
  }
  if (urlStr.includes('supabase.co')) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
  }

  // Google Calendar mock
  if (urlStr.includes('googleapis.com/calendar')) {
    return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }))
  }

  // Google OAuth mock
  if (urlStr.includes('oauth2.googleapis.com')) {
    return Promise.resolve(new Response(JSON.stringify({
      access_token: 'mock-token', expires_in: 3600,
    }), { status: 200 }))
  }

  // Default: 404
  return Promise.resolve(new Response('Not Found', { status: 404 }))
}

let mockGeminiResponse = '테스트 응답입니다! 📊'

beforeEach(() => {
  fetchCalls.length = 0
  mockGeminiResponse = '테스트 응답입니다! 📊'
  globalThis.fetch = mockFetch as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

// Import after mocks set up
async function callAPI(body: Record<string, unknown>) {
  // Dynamic import to pick up mocks
  const { POST } = await import('../app/api/employee-chat/route')
  const { NextRequest } = await import('next/server')
  const req = new NextRequest('http://localhost/api/employee-chat', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const res = await POST(req)
  return (res as unknown as { _data: unknown })._data as Record<string, unknown>
}

describe('employee-chat API', () => {

  describe('개별 대화', () => {
    it('기본 대화 응답 반환', async () => {
      const data = await callAPI({
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: '안녕하세요',
      })

      expect(data.reply).toBeTruthy()
      expect(data.model).toBe('gemini')
    })

    it('URL 포함 메시지 시 fetch 호출', async () => {
      await callAPI({
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: 'https://example.com/test-article 이거 분석해줘',
      })

      const urlFetch = fetchCalls.find(c => c.url.includes('example.com/test-article'))
      expect(urlFetch).toBeTruthy()
    })

    it('보고서 키워드 시 Notion 저장 트리거', async () => {
      mockGeminiResponse = '# 시장조사 보고서\n시장 분석 결과입니다.'

      const data = await callAPI({
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: '시장 보고서 작성해줘',
      })

      expect(data.reply).toBeTruthy()
      expect(data.report).toBeTruthy()
    })
  })

  describe('회의 모드', () => {
    it('회의 응답 배열 반환', async () => {
      mockGeminiResponse = `[경영] 정하준: 전략적으로 접근해야 합니다 📊
[기획] 김도현: PRD 작성 준비하겠습니다 📝
[비서] 이수연: 경영과 기획 팀이 의견을 내셨습니다 📋`

      const data = await callAPI({
        action: 'meeting',
        employeeId: 'meeting',
        employeeName: '회의',
        dept: '',
        role: '',
        speech: '',
        message: '신규 서비스 기획 논의',
      })

      expect(data.model).toBe('gemini')
      expect(Array.isArray(data.replies)).toBe(true)
      expect((data.replies as string[]).length).toBeGreaterThan(0)
    })

    it('업로드 키워드 시 부서별 Notion 저장', async () => {
      mockGeminiResponse = `[경영] 정하준: 보고서 작성하겠습니다 📊
[마케팅] 서지원: 마케팅 현황 정리합니다 📡
[비서] 이수연: 정리 완료 📋`

      const data = await callAPI({
        action: 'meeting',
        employeeId: 'meeting',
        employeeName: '회의',
        dept: '',
        role: '',
        speech: '',
        message: '각 부서 보고서 노션에 업로드해주세요',
      })

      expect(data.notionResults).toBeTruthy()
      const results = data.notionResults as Array<{ dept: string }>
      expect(results.length).toBeGreaterThan(0)

      // 부서별 Notion 페이지에 저장되는지 확인
      const notionCalls = fetchCalls.filter(c => c.url.includes('api.notion.com/v1/pages') && c.body)
      expect(notionCalls.length).toBeGreaterThan(0)
    })

    it('URL 포함 안건 시 내용 가져오기', async () => {
      mockGeminiResponse = `[시장조사] 박서준: 분석 결과입니다 🔍
[비서] 이수연: 시장조사팀이 분석했습니다 📋`

      await callAPI({
        action: 'meeting',
        employeeId: 'meeting',
        employeeName: '회의',
        dept: '',
        role: '',
        speech: '',
        message: 'https://example.com/test-article 이 사이트 검토해주세요',
      })

      const urlFetch = fetchCalls.find(c => c.url.includes('example.com/test-article'))
      expect(urlFetch).toBeTruthy()
    })
  })

  describe('자율 업무', () => {
    it('자율 업무 결과 반환', async () => {
      mockGeminiResponse = `[진행] 시장 데이터 수집 시작합니다! 🔍
경쟁사 A사 매출 120억, B사 95억으로 확인했습니다.
[완료] 시장 분석 완료했습니다!`

      const data = await callAPI({
        action: 'autonomous-task',
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: '경쟁사 분석해줘',
      })

      expect(data.progress).toBeTruthy()
      expect(data.result).toBeTruthy()
      expect(data.model).toBe('gemini')
    })

    it('보고서 키워드 시 부서별 Notion 저장', async () => {
      mockGeminiResponse = `[진행] 보고서 작성 시작합니다!
# 시장조사 보고서
경쟁사 분석 결과입니다.
[완료] 보고서 작성 완료!`

      const data = await callAPI({
        action: 'autonomous-task',
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: '시장 보고서 작성해줘',
      })

      expect(data.notionSaved).toBeTruthy()
    })
  })

  describe('Gemini fallback', () => {
    it('Gemini 실패 시 fallback 응답', async () => {
      // Mock all Gemini models to fail
      globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlStr.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve(new Response(JSON.stringify({
            error: { message: 'high demand', code: 503 },
          }), { status: 503 }))
        }
        // Anthropic also fails (no key)
        if (urlStr.includes('api.anthropic.com')) {
          return Promise.resolve(new Response(JSON.stringify({
            error: { message: 'invalid api key' },
          }), { status: 401 }))
        }
        return mockFetch(url, init)
      }) as typeof fetch

      const data = await callAPI({
        employeeId: 'emp1',
        employeeName: '박서준',
        dept: '시장조사',
        role: '팀장',
        speech: '데이터가 말해주죠~',
        message: '안녕하세요',
      })

      expect(data.model).toBe('fallback')
      expect(data.reply).toBeTruthy()
    })
  })
})
