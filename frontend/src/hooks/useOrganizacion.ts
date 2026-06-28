import { useQuery } from '@tanstack/react-query'
import { orgApi } from '../api/organizacion'

export function useOrganizacion() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organizacion'],
    queryFn: orgApi.getMiOrg,
    staleTime: 5 * 60 * 1000,
  })
  return { org, isLoading }
}
