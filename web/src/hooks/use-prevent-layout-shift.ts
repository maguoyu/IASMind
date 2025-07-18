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
      // 创建测试元素
      const outer = document.createElement('div');
      outer.style.cssText = `
        visibility: hidden;
        overflow: scroll;
        position: absolute;
        top: -9999px;
        width: 100px;
        height: 100px;
      `;
      document.body.appendChild(outer);
      
      const inner = document.createElement('div');
      inner.style.width = '100%';
      outer.appendChild(inner);
      
      scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
      document.body.removeChild(outer);
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      document.documentElement.style.setProperty('--layout-offset', '0px');
      
      return scrollbarWidth;
    }
    
    // 强制显示滚动条
    function forceScrollbar() {
      // 通过CSS统一处理，这里不再需要JavaScript设置
      document.documentElement.style.setProperty('--prevent-layout-shift', '1');
      // 设置布局偏移为0，确保内容不被挤压
      document.documentElement.style.setProperty('--layout-offset', '0px');
    }
    
    // 监听各种可能导致滚动条变化的事件
    function handleScrollbarChange() {
      // 重新计算滚动条宽度
      calculateScrollbarWidth();
    }
    
    // 初始化
    calculateScrollbarWidth();
    forceScrollbar();
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleScrollbarChange);
    
    // 监听DOM变化，特别是body的样式变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          // 延迟执行以避免频繁触发
          setTimeout(handleScrollbarChange, 16);
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // 监听Radix UI相关的数据属性变化
    const radixObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const attributeName = mutation.attributeName;
          if (attributeName && attributeName.startsWith('data-radix') || 
              attributeName === 'data-state') {
            setTimeout(handleScrollbarChange, 16);
          }
        }
      });
    });
    
    radixObserver.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-radix-scroll-area-viewport', 'data-state']
    });
    
    // 清理函数
    return () => {
      observer.disconnect();
      radixObserver.disconnect();
      window.removeEventListener('resize', handleScrollbarChange);
      document.documentElement.style.removeProperty('--prevent-layout-shift');
      document.documentElement.style.removeProperty('--layout-offset');
    };
  }, []);
} 