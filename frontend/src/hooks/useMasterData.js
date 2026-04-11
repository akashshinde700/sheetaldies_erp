import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export function useParties() {
  return useQuery({
    queryKey: ['parties'],
    queryFn: async () => {
      const { data } = await api.get('/parties');
      return data.data || [];
    },
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data } = await api.get('/items');
      return data.data || [];
    },
  });
}

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data } = await api.get('/machines');
      return data.data || [];
    },
  });
}

export function useProcesses() {
  return useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data } = await api.get('/processes');
      return data.data || [];
    },
  });
}
