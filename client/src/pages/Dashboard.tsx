import React from 'react';
import MineBuddyApp from '@/components/MineBuddyApp';
import { ThemeProvider } from 'next-themes';

const Dashboard: React.FC = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <MineBuddyApp />
    </ThemeProvider>
  );
};

export default Dashboard;
