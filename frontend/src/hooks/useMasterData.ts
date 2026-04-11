import { useQuery, UseQueryResult } from '@tanstack/react-query';
import api from '../utils/api';

export interface BaseEntity {
  id: number;
  [key: string]: any;
}

export function useParties(): UseQueryResult<BaseEntity[], Error> {
  return useQuery({
    queryKey: ['parties'],
    queryFn: async (): Promise<BaseEntity[]> => {
      const { data } = await api.get('/parties');
      return data.data || [];
    },
  });
}

export function useItems(): UseQueryResult<BaseEntity[], Error> {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<BaseEntity[]> => {
      const { data } = await api.get('/items');
      return data.data || [];
    },
  });
}

export function useMachines(): UseQueryResult<BaseEntity[], Error> {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async (): Promise<BaseEntity[]> => {
      const { data } = await api.get('/machines');
      return data.data || [];
    },
  });
}

export function useProcesses(): UseQueryResult<BaseEntity[], Error> {
  return useQuery({
    queryKey: ['processes'],
    queryFn: async (): Promise<BaseEntity[]> => {
      const { data } = await api.get('/processes');
      return data.data || [];
    },
  });
}

export function useMasterJobCards(): UseQueryResult<BaseEntity[], Error> {
  return useQuery({
    queryKey: ['jobcards'],
    queryFn: async (): Promise<BaseEntity[]> => {
      const { data } = await api.get('/jobcards?limit=200');
      return data.data || [];
    },
  });
}
