# TODOS

Backlog items identified during /plan-eng-review (2026-06-11) but deferred from MVP scope.

## 거래내역 페이지네이션
- **What**: 거래내역 탭은 현재 "필터 없음, 전체 리스트(거래일 내림차순)"로 명시되어 있고 페이지네이션이 없음.
- **Why**: 1-2주 검증 기간(주 3회 입력 기준 최대 ~30건)에는 문제없지만, 실제 운영 시 거래가 수백 건이 쌓이면 한 페이지에 전부 렌더링하는 것이 느려짐.
- **Pros**: 재접근성 좋은 추후 작업 — LIMIT/OFFSET 쿼리 + "더보기" 버튼 정도면 충분.
- **Cons**: 지금 만들면 검증 기간 동안 전혀 쓰이지 않는 코드.
- **Context**: `transactions` 테이블에 `(user_id, transaction_date)` 인덱스가 이미 계획되어 있어 쿼리 측면은 준비됨.
- **Depends on**: 없음.
- **Status**: Approach B 확장 또는 실거래량 증가 시 착수.

## PIN 입력 실패 잠금 기능
- **What**: PIN 틀렸을 때 N회 이상 실패 시 일정 시간 로그인 잠금.
- **Why**: 4자리 PIN은 조합이 1만 가지뿐이라 brute force에 취약.
- **Pros**: 보안 강화, 향후 외부 판매(Approach B) 시 필수.
- **Cons**: MVP 검증 단계(본인만 사용)에서 우선순위 낮고, 시도 횟수 상태 관리 코드 추가 필요.
- **Context**: Supabase Auth는 이메일당 로그인 요청에 기본 rate limiting을 이미 제공하므로, 앱 레벨 잠금은 추가 보안층.
- **Depends on**: 없음.
- **Status**: Approach B 확장 또는 외부 판매 검토 시 착수.
