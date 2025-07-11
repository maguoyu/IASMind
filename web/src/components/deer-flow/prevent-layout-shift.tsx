"use client";

import { useEffect } from 'react';

/**
 * 防止页面抖动的客户端组件
 * 专门处理弹窗打开时的滚动条变化导致的页面抖动
 */
export function PreventLayoutShift() {
  useEffect(() => {
    let scrollbarWidth = 0;
    
    // 计算滚动条宽度
    function calculateScrollbarWidth() {
      const outer = document.createElement('div');
      outer.style.visibility = 'hidden';
      outer.style.overflow = 'scroll';
      outer.style.msOverflowStyle = 'scrollbar';
      outer.style.position = 'absolute';
      outer.style.top = '-9999px';
      document.body.appendChild(outer);
      
      const inner = document.createElement('div');
      outer.appendChild(inner);
      
      scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
      document.body.removeChild(outer);
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      
      return scrollbarWidth;
    }
    
    // 强制显示滚动条 - 由CSS处理，这里不再重复设置
    function forceScrollbar() {
      // 不再设置，由CSS统一处理
    }
    
    // 处理body样式变化
    function handleBodyStyleChange() {
      const bodyStyle = document.body.getAttribute('style') || '';
      
      if (bodyStyle.includes('overflow') && bodyStyle.includes('hidden')) {
        // 补偿滚动条宽度
        if (!bodyStyle.includes('padding-right')) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        // 滚动条由CSS统一处理，这里只补偿宽度
      }
    }
    
    // 监听body的style属性变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          handleBodyStyleChange();
        }
      });
    });
    
    // 初始化
    calculateScrollbarWidth();
    
    // 开始监听
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    // 监听窗口大小变化
    const handleResize = () => {
      calculateScrollbarWidth();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return null;
} 