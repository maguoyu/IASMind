"use client";

import { UploadOutlined, EyeOutlined, BarChartOutlined, FileTextOutlined, DeleteOutlined } from "@ant-design/icons";
import { useState, useCallback } from "react";

interface DataFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadTime: Date;
  preview?: Record<string, unknown>[];
}

export default function DataExplorationMain() {
  const [uploadedFiles, setUploadedFiles] = useState<DataFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'visualization' | 'insights'>('preview');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    
    // 模拟文件上传处理
    setTimeout(() => {
      const newFiles: DataFile[] = Array.from(files).map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date(),
        preview: generateMockPreview(file.name)
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
      setIsUploading(false);
    }, 2000);
  }, []);

  const generateMockPreview = (fileName: string) => {
    // 生成模拟数据预览
    if (fileName.includes('.csv') || fileName.includes('.xlsx') || fileName.includes('.json')) {
      return [
        { id: 1, name: "示例数据1", value: 100, category: "A", date: "2024-01-01" },
        { id: 2, name: "示例数据2", value: 200, category: "B", date: "2024-01-02" },
        { id: 3, name: "示例数据3", value: 150, category: "A", date: "2024-01-03" },
        { id: 4, name: "示例数据4", value: 300, category: "C", date: "2024-01-04" },
        { id: 5, name: "示例数据5", value: 250, category: "B", date: "2024-01-05" }
      ];
    }
    return [];
  };

  const handleFileSelect = (file: DataFile) => {
    setSelectedFile(file);
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex h-full w-full pt-12">
      {/* 左侧文件列表 */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">数据文件</h2>
          <div className="space-y-2">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                <UploadOutlined className="text-2xl mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isUploading ? "上传中..." : "点击上传数据文件"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  支持 CSV, Excel, JSON 格式
                </p>
              </div>
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedFile?.id === file.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleFileSelect(file)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)} • {file.uploadTime.toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileDelete(file.id);
                  }}
                >
                  <DeleteOutlined className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800">
        {selectedFile ? (
          <div className="h-full">
            {/* 标签页导航 */}
            <div className="flex space-x-1 mb-4">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'preview' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                <EyeOutlined />
                数据预览
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'visualization' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('visualization')}
              >
                <BarChartOutlined />
                可视化
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'insights' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab('insights')}
              >
                <FileTextOutlined />
                智能洞察
              </button>
            </div>

            {/* 内容区域 */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
              {activeTab === 'preview' && (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <EyeOutlined />
                      数据预览 - {selectedFile.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      查看数据文件的前几行内容
                    </p>
                  </div>
                  {selectedFile.preview && selectedFile.preview.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            {Object.keys(selectedFile.preview[0]).map((key) => (
                              <th key={key} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFile.preview.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      暂无预览数据
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'visualization' && (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <BarChartOutlined />
                      数据可视化
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      生成图表和可视化分析
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">柱状图</h4>
                      <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">图表区域 - 展示分类数据</p>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">饼图</h4>
                      <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">图表区域 - 展示比例关系</p>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">折线图</h4>
                      <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">图表区域 - 展示趋势变化</p>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">散点图</h4>
                      <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">图表区域 - 展示相关性</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <FileTextOutlined />
                      智能洞察
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      AI 生成的数据洞察和建议
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">数据质量</span>
                        <div>
                          <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">数据完整性良好</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            检测到 5 条记录，无缺失值，数据格式规范，字段类型一致。
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">趋势分析</span>
                        <div>
                          <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">数值分布分析</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            数值范围在 100-300 之间，平均值为 200，分布相对均匀，无明显异常值。
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs font-medium">可视化建议</span>
                        <div>
                          <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">图表类型推荐</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            建议使用柱状图展示分类数据，折线图展示时间序列趋势，饼图展示比例关系。
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs font-medium">业务洞察</span>
                        <div>
                          <h4 className="font-medium mb-1 text-gray-900 dark:text-gray-100">关键发现</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            类别 C 的数值最高，类别 A 和 B 分布相对均匀，建议重点关注类别 C 的业务表现。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <UploadOutlined className="text-6xl text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-gray-100">开始数据探索</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                从左侧上传数据文件开始智能分析之旅
              </p>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                <p>• 支持 CSV、Excel、JSON 格式</p>
                <p>• 自动生成数据预览和洞察</p>
                <p>• 智能推荐可视化方案</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 