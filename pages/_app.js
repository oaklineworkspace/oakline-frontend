import '../styles/globals.css';
import '../styles/button-fixes.css';
import '../styles/responsive.css';
import '../styles/StickyFooter.css';
import '../styles/zelle-improvements.css';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import StickyFooter from '../components/StickyFooter';


const App = function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Component {...pageProps} />
        <StickyFooter />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;