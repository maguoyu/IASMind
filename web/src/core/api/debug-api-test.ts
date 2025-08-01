// API调试测试工具
import { DataExplorationAPI } from './data-exploration';
import { apiClient } from './config';

export const debugApiTest = {
  // 测试基础连接
  async testBasicConnection() {
    try {
      console.log('🔍 测试基础API连接...');
      const response = await fetch('/api/health', { method: 'GET' });
      console.log('基础连接状态:', response.status, response.statusText);
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('❌ 基础连接失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 测试数据探索API连接
  async testDataExplorationConnection() {
    try {
      console.log('🔍 测试数据探索API连接...');
      
      // 尝试调用文件列表API（应该比分析API更简单）
      const response = await DataExplorationAPI.getFiles({ limit: 1 });
      console.log('数据探索API响应:', response);
      
      if (response.data || response.error) {
        console.log('✅ 数据探索API连接正常');
        return { success: true, response };
      } else {
        console.log('⚠️ 数据探索API返回异常格式');
        return { success: false, response };
      }
    } catch (error) {
      console.error('❌ 数据探索API连接失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 测试原始analyze端点
  async testAnalyzeEndpointDirect() {
    try {
      console.log('🔍 直接测试analyze端点...');
      
      const testRequest = {
        file_id: 'test-file-id',
        output_type: 'html',
        task_type: 'visualization',
        user_prompt: '测试分析',
        language: 'zh'
      };
      
      const response = await apiClient.post('/api/data-exploration/analyze', testRequest);
      console.log('analyze端点响应:', response);
      
      return { success: true, response };
    } catch (error) {
      console.error('❌ analyze端点测试失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 检查服务URL配置
  async checkServiceConfig() {
    try {
      console.log('🔍 检查服务URL配置...');
      
      // 检查当前域名和端口
      console.log('当前location:', window.location.href);
      console.log('API base URL:', window.location.origin);
      
      // 检查配置
      const configResponse = await fetch('/api/config');
      if (configResponse.ok) {
        const config = await configResponse.json();
        console.log('服务配置:', config);
        return { success: true, config };
      } else {
        console.log('配置端点状态:', configResponse.status);
        return { success: false, status: configResponse.status };
      }
    } catch (error) {
      console.error('❌ 检查服务配置失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 运行完整诊断
  async runFullDiagnosis() {
    console.log('🚀 开始运行完整API诊断...');
    console.log('=====================================');
    
    const results = {
      basicConnection: await this.testBasicConnection(),
      serviceConfig: await this.checkServiceConfig(),
      dataExplorationConnection: await this.testDataExplorationConnection(),
      analyzeEndpoint: await this.testAnalyzeEndpointDirect(),
    };
    
    console.log('=====================================');
    console.log('📊 诊断结果汇总:');
    Object.entries(results).forEach(([test, result]) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${test}:`, result.success ? 'PASS' : 'FAIL');
      if (!result.success && result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    console.log('=====================================');
    
    return results;
  }
};

// 在开发环境中自动加载到window对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugApiTest = debugApiTest;
  console.log('🔧 API调试工具已加载到 window.debugApiTest');
  console.log('💡 使用 debugApiTest.runFullDiagnosis() 运行完整诊断');
} 