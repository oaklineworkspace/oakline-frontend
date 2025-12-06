import { useSessionTimeoutContext } from '../contexts/SessionTimeoutContext';

export const useSessionTimeout = () => {
  return useSessionTimeoutContext();
};
