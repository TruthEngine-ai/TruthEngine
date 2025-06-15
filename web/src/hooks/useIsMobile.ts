import { useState, useEffect } from 'react';

/**
 * 判断当前设备是否为移动设备的 Hook
 * @param breakpoint 断点宽度，默认为 768px
 * @returns 是否为移动设备
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    // 设置初始值
    setIsMobile(mediaQuery.matches);

    // 监听变化
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
