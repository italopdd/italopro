import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SwipeHandlerProps {
  children: React.ReactNode;
}

export const SwipeHandler: React.FC<SwipeHandlerProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Touch state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Configuration
  const minSwipeDistance = 50;
  
  // Routes Definition (Must match BottomNav order)
  const clientRoutes = ['/client-dashboard', '/mural'];
  const professionalRoutes = ['/profile', '/clients', '/agenda', '/mural'];

  // Logic: Ignore swipe on Admin route (handled internally) or Login
  const isIgnoredRoute = location.pathname.startsWith('/admin') || location.pathname === '/' || location.pathname === '/settings';

  const onTouchStart = (e: React.TouchEvent) => {
    if (isIgnoredRoute) return;
    setTouchEnd(null); // Reset
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isIgnoredRoute) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (isIgnoredRoute || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
        handleSwipe(isLeftSwipe ? 'next' : 'prev');
    }
  };

  const handleSwipe = (direction: 'next' | 'prev') => {
      const isClient = localStorage.getItem('isClient') === 'true';
      const isUser = localStorage.getItem('isUser') === 'true';

      let routes: string[] = [];

      if (isClient) routes = clientRoutes;
      else if (isUser) routes = professionalRoutes;
      else return; // Fallback

      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex === -1) return; // Not in a swipeable route

      let nextIndex = currentIndex;
      if (direction === 'next') {
          nextIndex = currentIndex + 1;
      } else {
          nextIndex = currentIndex - 1;
      }

      // Boundary Checks (Prevent going out of bounds or to login)
      if (nextIndex >= 0 && nextIndex < routes.length) {
          navigate(routes[nextIndex]);
      }
  };

  return (
    <div 
        className="min-h-screen w-full page-transition"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
        {children}
    </div>
  );
};