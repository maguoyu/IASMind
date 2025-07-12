import { useEffect } from 'react';

/**
 * Hook to prevent layout shift when modals/dropdowns open
 * 防止弹窗打开时的页面抖动
 */
export function usePreventLayoutShift() {
  useEffect(() => {
    let scrollbarWidth = 0;
    
    // 计算滚动条宽度
    function calculateScrollbarWidth() {
      const outer = document.createElement('div');
      outer.style.visibility = 'hidden';
      outer.style.overflow = 'scroll';
      (outer.style as any).msOverflowStyle = 'scrollbar';
      document.body.appendChild(outer);
      
      const inner = document.createElement('div');
      outer.appendChild(inner);
      
      scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
      document.body.removeChild(outer);
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      
      return scrollbarWidth;
    }
    
    // 监听body样式变化
    function handleBodyMutation(mutations: MutationRecord[]) {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          const style = target.getAttribute('style') || '';
          
          // 检查是否有overflow hidden
          if (style.includes('overflow') && style.includes('hidden')) {
            // 确保有padding-right补偿
            if (!style.includes('padding-right')) {
              target.style.paddingRight = `${scrollbarWidth}px`;
            }
            // 强制显示滚动条
            target.style.overflowY = 'scroll';
          }
        }
      });
    }
    
    // 初始化
    calculateScrollbarWidth();
    
    // 创建MutationObserver监听body变化
    const observer = new MutationObserver(handleBodyMutation);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // 监听窗口大小变化
    const handleResize = () => {
      calculateScrollbarWidth();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);
} 