// hooks/useSupabaseData.ts
// qbizerp Supabase 테이블 실데이터 연동

'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface Project {
  id: string
  name: string
  status: 'active' | 'proposal' | 'completed'
  category: string
  github_repo: string | null
  url: string | null
  estimated_amount: number | null
  start_date: string | null
  end_date: string | null
  clients?: { name: string } | null
}

export interface Transaction {
  type: 'income' | 'expense'
  amount: number
}

// 프로젝트 훅
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

// 정산 훅
export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
      if (error) throw error
      return data as Transaction[]
    },
  })
}

// 전체 데이터 초기 로드 (오피스 스토어와 연동)
export function useSupabaseData() {
  useEffect(() => {
    // TanStack Query 쪽에서 관리하므로 여기선 Supabase Realtime 구독만
    const supabase = createClient()

    // 프로젝트 실시간 변경 감지
    const channel = supabase
      .channel('office-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        // 변경 감지 시 TanStack Query invalidate (별도 처리)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        // 변경 감지 시 처리
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}
