"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Eye, 
  Table, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings,
  Clock,
  BarChart3,
  Key,
  Link,
  Archive,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { dataSourceApi } from '~/core/api/datasource';
import type { 
  DataSource, 
  DataSourceCreate, 
  DataSourceUpdate, 
  MetadataResponse,
  SyncConfig,
  SyncStatusResponse,
  SyncHistoryResponse,
  DatabaseMetadata,
  TableMetadata
} from '~/core/api/datasource';

interface DataSourceFormData extends Omit<DataSourceCreate, 'type'> {
  type: 'mysql' | 'oracle';
  confirmPassword?: string;
}

export function DataSourceTab() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [formData, setFormData] = useState<DataSourceFormData>({
    name: '',
    description: '',
    type: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    database_name: '',
    schema_name: '',
    service_name: '',
    ssl: false,
    ssl_ca: '',
    ssl_cert: '',
    ssl_key: '',
  });
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // 元数据相关状态
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryResponse | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMetadataTable, setSelectedMetadataTable] = useState<TableMetadata | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('metadata');


  // 获取数据源列表
  const fetchDataSources = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dataSourceApi.getAll();
      setDataSources(data);
    } catch (error) {
      console.error('获取数据源列表失败:', error);
      toast.error('获取数据源列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDataSources();
  }, [fetchDataSources]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'mysql',
      host: '',
      port: 3306,
      username: '',
      password: '',
      database_name: '',
      schema_name: '',
      service_name: '',
      ssl: false,
      ssl_ca: '',
      ssl_cert: '',
      ssl_key: '',
    });
  };

  // 处理创建数据源
  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.host || !formData.username || !formData.password || !formData.database_name) {
        toast.error('请填写必填字段');
        return;
      }

      const { confirmPassword, ...createData } = formData;
      await dataSourceApi.create(createData);
      toast.success('数据源创建成功');
      setIsCreateDialogOpen(false);
      resetForm();
      void fetchDataSources();
    } catch (error) {
      console.error('创建数据源失败:', error);
      toast.error('创建数据源失败');
    }
  };

  // 处理编辑数据源
  const handleEdit = async () => {
    if (!selectedDataSource) return;

    try {
      const { confirmPassword, type, ...updateData } = formData;
      
      // 只更新有变化的字段
      const changedData: DataSourceUpdate = {};
      Object.keys(updateData).forEach(key => {
        const typedKey = key as keyof typeof updateData;
        if (updateData[typedKey] !== (selectedDataSource as any)[typedKey === 'database_name' ? 'database_name' : typedKey]) {
          (changedData as any)[typedKey] = updateData[typedKey];
        }
      });

      if (Object.keys(changedData).length === 0) {
        toast.info('没有需要更新的内容');
        return;
      }

      await dataSourceApi.update(selectedDataSource.id, changedData);
      toast.success('数据源更新成功');
      setIsEditDialogOpen(false);
      setSelectedDataSource(null);
      resetForm();
      void fetchDataSources();
    } catch (error) {
      console.error('更新数据源失败:', error);
      toast.error('更新数据源失败');
    }
  };

  // 处理删除数据源
  const handleDelete = async (dataSource: DataSource) => {
    if (!confirm(`确定要删除数据源 "${dataSource.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await dataSourceApi.delete(dataSource.id);
      toast.success('数据源删除成功');
      void fetchDataSources();
    } catch (error) {
      console.error('删除数据源失败:', error);
      toast.error('删除数据源失败');
    }
  };

  // 处理测试连接
  const handleTestConnection = async (dataSource: DataSource) => {
    try {
      setTestingConnection(dataSource.id);
      const result = await dataSourceApi.testConnection(dataSource.id);
      
      if (result.success) {
        toast.success(`连接测试成功: ${result.message}`);
      } else {
        toast.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      toast.error('测试连接失败');
    } finally {
      setTestingConnection(null);
      void fetchDataSources(); // 刷新状态
    }
  };



  // 获取元数据（实时查询）
  const fetchMetadata = async (dataSourceId: string) => {
    try {
      setMetadataLoading(true);
      const result = await dataSourceApi.getMetadata(dataSourceId);
      if (result.success) {
        setMetadata(result.data);
        toast.success('元数据获取成功');
      } else {
        toast.error(result.message || '获取元数据失败');
      }
    } catch (error) {
      console.error('获取元数据失败:', error);
      toast.error('获取元数据失败');
    } finally {
      setMetadataLoading(false);
    }
  };

  // 刷新元数据（实时查询）
  const handleRefreshMetadata = async (dataSourceId: string) => {
    try {
      setIsSyncing(true);
      const result = await dataSourceApi.getMetadata(dataSourceId);
      if (result.success) {
        setMetadata(result.data);
        toast.success('元数据刷新成功');
      } else {
        toast.error(result.message || '元数据刷新失败');
      }
    } catch (error) {
      console.error('元数据刷新失败:', error);
      toast.error('元数据刷新失败');
    } finally {
      setIsSyncing(false);
    }
  };

  // 获取同步状态
  const fetchSyncStatus = async (dataSourceId: string) => {
    try {
      const result = await dataSourceApi.getSyncStatus(dataSourceId);
      if (result.success) {
        setSyncStatus(result);
        setSyncConfig(result.config);
      }
    } catch (error) {
      console.error('获取同步状态失败:', error);
    }
  };

  // 获取同步历史
  const fetchSyncHistory = async (dataSourceId: string) => {
    try {
      const result = await dataSourceApi.getSyncHistory(dataSourceId);
      if (result.success) {
        setSyncHistory(result);
      }
    } catch (error) {
      console.error('获取同步历史失败:', error);
    }
  };

  // 更新同步配置
  const handleUpdateSyncConfig = async (dataSourceId: string, config: Partial<SyncConfig>) => {
    try {
      const result = await dataSourceApi.updateSyncConfig(dataSourceId, config);
      setSyncConfig(result);
      toast.success('同步配置已保存');
      setIsConfigDialogOpen(false);
      fetchSyncStatus(dataSourceId);
    } catch (error) {
      console.error('更新同步配置失败:', error);
      toast.error('更新同步配置失败');
    }
  };

  // 打开编辑对话框
  const openEditDialog = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setFormData({
      name: dataSource.name,
      description: dataSource.description,
      type: dataSource.type,
      host: dataSource.host,
      port: dataSource.port,
      username: dataSource.username,
      password: '', // 不显示现有密码
      database_name: dataSource.database_name,
      schema_name: dataSource.schema_name || '',
      service_name: dataSource.service_name || '',
      ssl: dataSource.ssl,
      ssl_ca: '',
      ssl_cert: '',
      ssl_key: '',
    });
    setIsEditDialogOpen(true);
  };

  // 打开详情对话框
  const openDetailDialog = (dataSource: DataSource, defaultTab = 'metadata') => {
    setSelectedDataSource(dataSource);
    // 重置元数据相关状态
    setMetadata(null);
    setSyncStatus(null);
    setSyncHistory(null);
    setSyncConfig(null);
    setSelectedMetadataTable(null);
    
    // 设置默认标签页
    setActiveDetailTab(defaultTab);
    setIsDetailDialogOpen(true);
    
    // 获取同步相关数据
    void fetchSyncStatus(dataSource.id);
    void fetchSyncHistory(dataSource.id);
  };

  // 打开元数据管理
  const openMetadataDialog = (dataSource: DataSource) => {
    openDetailDialog(dataSource, 'metadata');
    // 如果还没有元数据，自动加载
    setTimeout(() => {
      if (!metadata) {
        void fetchMetadata(dataSource.id);
      }
    }, 200);
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">已连接</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">连接失败</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">未连接</Badge>;
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    return <Database className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            数据源管理
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            管理系统中的数据库连接配置
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              新建数据源
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新数据源</DialogTitle>
              <DialogDescription>
                填写数据库连接信息以创建新的数据源
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">数据源名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入数据源名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">数据库类型 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      type: value as 'mysql' | 'oracle',
                      port: value === 'mysql' ? 3306 : 1521 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="oracle">Oracle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入数据源描述"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">主机地址 *</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="例如: localhost 或 192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">端口 *</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                    placeholder={formData.type === 'mysql' ? '3306' : '1521'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名 *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="数据库用户名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="数据库密码"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database_name">数据库名 *</Label>
                <Input
                  id="database_name"
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  placeholder={formData.type === 'mysql' ? '数据库名称' : 'SID 或数据库名称'}
                />
              </div>

              {formData.type === 'oracle' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schema_name">模式名</Label>
                    <Input
                      id="schema_name"
                      value={formData.schema_name}
                      onChange={(e) => setFormData({ ...formData, schema_name: e.target.value })}
                      placeholder="Oracle 模式名（可选）"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_name">服务名</Label>
                    <Input
                      id="service_name"
                      value={formData.service_name}
                      onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                      placeholder="Oracle 服务名（可选）"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="ssl"
                  checked={formData.ssl}
                  onCheckedChange={(checked) => setFormData({ ...formData, ssl: checked })}
                />
                <Label htmlFor="ssl">启用 SSL 连接</Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate}>
                创建数据源
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 数据源列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {dataSources.length === 0 ? (
            <Card className="p-8 text-center">
              <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                暂无数据源
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                点击上方按钮创建第一个数据源
              </p>
            </Card>
          ) : (
            dataSources.map((dataSource) => (
              <Card key={dataSource.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        {getTypeIcon(dataSource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 truncate">
                            {dataSource.name}
                          </h3>
                          {getStatusBadge(dataSource.status)}
                          <Badge variant="outline" className="text-xs">
                            {dataSource.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                          {dataSource.description || '暂无描述'}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">主机:</span>
                            <span className="ml-1 text-slate-900 dark:text-slate-100">
                              {dataSource.host}:{dataSource.port}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">数据库:</span>
                            <span className="ml-1 text-slate-900 dark:text-slate-100">
                              {dataSource.database_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">用户名:</span>
                            <span className="ml-1 text-slate-900 dark:text-slate-100">
                              {dataSource.username}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">最后连接:</span>
                            <span className="ml-1 text-slate-900 dark:text-slate-100">
                              {dataSource.last_connected_at 
                                ? new Date(dataSource.last_connected_at).toLocaleString()
                                : '从未连接'
                              }
                            </span>
                          </div>
                        </div>
                        {dataSource.error_message && (
                          <Alert className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {dataSource.error_message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(dataSource)}
                        disabled={testingConnection === dataSource.id}
                        title="测试连接"
                      >
                        {testingConnection === dataSource.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMetadataDialog(dataSource)}
                        title="元数据管理"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailDialog(dataSource)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"  
                        size="sm"
                        onClick={() => openEditDialog(dataSource)}
                        title="编辑数据源"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(dataSource)}
                        className="text-red-600 hover:text-red-700"
                        title="删除数据源"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑数据源</DialogTitle>
            <DialogDescription>
              修改数据源配置信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">数据源名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入数据源名称"
                />
              </div>
              <div className="space-y-2">
                <Label>数据库类型</Label>
                <Input value={formData.type.toUpperCase()} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入数据源描述"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-host">主机地址 *</Label>
                <Input
                  id="edit-host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="例如: localhost 或 192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-port">端口 *</Label>
                <Input
                  id="edit-port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">用户名 *</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="数据库用户名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">密码（留空保持不变）</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="输入新密码"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-database">数据库名 *</Label>
              <Input
                id="edit-database"
                value={formData.database_name}
                onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                placeholder={formData.type === 'mysql' ? '数据库名称' : 'SID 或数据库名称'}
              />
            </div>

            {formData.type === 'oracle' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-schema">模式名</Label>
                  <Input
                    id="edit-schema"
                    value={formData.schema_name}
                    onChange={(e) => setFormData({ ...formData, schema_name: e.target.value })}
                    placeholder="Oracle 模式名（可选）"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service">服务名</Label>
                  <Input
                    id="edit-service"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    placeholder="Oracle 服务名（可选）"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-ssl"
                checked={formData.ssl}
                onCheckedChange={(checked) => setFormData({ ...formData, ssl: checked })}
              />
              <Label htmlFor="edit-ssl">启用 SSL 连接</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>
              保存更改
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog 
        open={isDetailDialogOpen} 
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            // 对话框关闭时重置状态
            setActiveDetailTab('metadata');
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-none max-h-[95vh] overflow-y-auto" style={{ width: '95vw', maxWidth: 'none' }}>
          <DialogHeader>
            <DialogTitle>元数据管理</DialogTitle>
            <DialogDescription>
              查看数据源数据库结构信息和同步管理
            </DialogDescription>
          </DialogHeader>
          {selectedDataSource && (
            <Tabs 
              value={activeDetailTab} 
              onValueChange={setActiveDetailTab} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metadata">元数据</TabsTrigger>
                <TabsTrigger value="sync">同步管理</TabsTrigger>
              </TabsList>
              
              <TabsContent value="metadata" className="space-y-6 pt-4">
                {/* 元数据操作栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">数据库元数据</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchMetadata(selectedDataSource.id)}
                      disabled={metadataLoading}
                    >
                      {metadataLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      刷新
                    </Button>
                    <Button
                      size="sm"
                                              onClick={() => handleRefreshMetadata(selectedDataSource.id)}
                      disabled={isSyncing || metadataLoading}
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                                              刷新元数据
                    </Button>
                  </div>
                </div>

                {/* 元数据内容 */}
                {metadataLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <div className="text-sm text-slate-500 mt-2">加载元数据中...</div>
                  </div>
                ) : metadata ? (
                  <div className="space-y-4">
                    {/* 数据库概览 */}
                    <Card className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-slate-500 dark:text-slate-400">数据库大小</Label>
                          <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                            {metadata.size_mb.toFixed(2)} MB
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-500 dark:text-slate-400">表数量</Label>
                          <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                            {metadata.tables_count}
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-500 dark:text-slate-400">视图数量</Label>
                          <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                            {metadata.views_count}
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-500 dark:text-slate-400">字符集</Label>
                          <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                            {metadata.charset || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* 表详情 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-900 dark:text-slate-100 font-medium">
                          数据库表 ({metadata.tables.length})
                        </Label>
                        <div className="mt-2 max-h-96 overflow-y-auto border rounded-md">
                          {metadata.tables.map((table) => (
                            <button
                              key={table.table_name}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 border-b last:border-b-0 ${
                                selectedMetadataTable?.table_name === table.table_name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                              onClick={() => setSelectedMetadataTable(table)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Database className="w-4 h-4" />
                                  <span className="font-medium">{table.table_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {table.type}
                                  </Badge>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {table.rows_count} 行 | {table.size_mb.toFixed(2)} MB
                                </div>
                              </div>
                              {table.table_comment && (
                                <div className="text-xs text-slate-500 mt-1 truncate">
                                  {table.table_comment}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-slate-900 dark:text-slate-100 font-medium">
                          表详情 {selectedMetadataTable && `- ${selectedMetadataTable.table_name}`}
                        </Label>
                        <div className="mt-2 max-h-96 overflow-y-auto border rounded-md p-4">
                          {selectedMetadataTable ? (
                            <div className="space-y-4">
                              {/* 表基本信息 */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">类型:</span>
                                  <Badge variant="outline">{selectedMetadataTable.type}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">行数:</span>
                                  <span>{selectedMetadataTable.rows_count.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">大小:</span>
                                  <span>{selectedMetadataTable.size_mb.toFixed(2)} MB</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">列数:</span>
                                  <span>{selectedMetadataTable.columns.length}</span>
                                </div>
                              </div>

                              <Separator />

                              {/* 列信息 */}
                              <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center">
                                  <Table className="w-4 h-4 mr-1" />
                                  列信息
                                </h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {selectedMetadataTable.columns.map((column, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                      <div>
                                        <span className="font-medium">{column.column_name}</span>
                                        <span className="ml-2 text-slate-500">{column.data_type}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        {column.is_nullable === 'NO' && <Badge variant="outline" className="text-xs">NOT NULL</Badge>}
                                        {column.column_key && <Badge variant="outline" className="text-xs">{column.column_key}</Badge>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 索引信息 */}
                              {selectedMetadataTable.indexes.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center">
                                      <Key className="w-4 h-4 mr-1" />
                                      索引 ({selectedMetadataTable.indexes.length})
                                    </h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {selectedMetadataTable.indexes.map((index, idx) => (
                                        <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">{index.index_name}</span>
                                            <Badge variant="outline" className="text-xs">{index.index_type}</Badge>
                                          </div>
                                          <div className="text-slate-500 mt-1">
                                            列: {index.columns.join(', ')}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* 约束信息 */}
                              {selectedMetadataTable.constraints.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center">
                                      <Link className="w-4 h-4 mr-1" />
                                      约束 ({selectedMetadataTable.constraints.length})
                                    </h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {selectedMetadataTable.constraints.map((constraint, idx) => (
                                        <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">{constraint.constraint_name}</span>
                                            <Badge variant="outline" className="text-xs">{constraint.constraint_type}</Badge>
                                          </div>
                                          <div className="text-slate-500 mt-1">
                                            列: {constraint.columns.join(', ')}
                                            {constraint.referenced_table && (
                                              <span> → {constraint.referenced_table}({constraint.referenced_columns?.join(', ')})</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-slate-500 py-8">
                              选择一个表查看详细信息
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      暂无元数据
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      点击"获取元数据"按钮获取最新的数据库结构信息
                    </p>
                    <Button onClick={() => fetchMetadata(selectedDataSource.id)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      获取元数据
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sync" className="space-y-6 pt-4">
                {/* 同步状态概览 */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      同步管理
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsConfigDialogOpen(true)}
                      disabled={!syncConfig}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      配置
                    </Button>
                  </div>
                  
                  {syncStatus ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-slate-500 dark:text-slate-400">同步状态</Label>
                        <div className="mt-1">
                          {syncStatus.status === 'syncing' && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              同步中
                            </Badge>
                          )}
                          {syncStatus.status === 'idle' && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              空闲
                            </Badge>
                          )}
                          {syncStatus.status === 'error' && (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              错误
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-500 dark:text-slate-400">自动同步</Label>
                        <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                          {syncStatus.config.enabled ? '已启用' : '已禁用'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-500 dark:text-slate-400">上次同步</Label>
                        <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                          {syncStatus.last_sync 
                            ? new Date(syncStatus.last_sync).toLocaleString()
                            : '从未同步'
                          }
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-500 dark:text-slate-400">下次同步</Label>
                        <div className="mt-1 text-slate-900 dark:text-slate-100 font-medium">
                          {syncStatus.next_sync 
                            ? new Date(syncStatus.next_sync).toLocaleString()
                            : '未计划'
                          }
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      <div className="text-sm text-slate-500 mt-2">加载同步状态中...</div>
                    </div>
                  )}
                </Card>

                {/* 同步历史 */}
                <Card className="p-4">
                  <h4 className="text-md font-medium mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    同步历史
                  </h4>
                  {syncHistory && syncHistory.history.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {syncHistory.history.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex items-center space-x-3">
                            {record.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {record.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                            {record.status === 'partial' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(record.sync_time).toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-500">
                                同步了 {record.tables_synced} 个表，耗时 {record.duration_seconds}s
                                {record.changes_detected > 0 && ` | 检测到 ${record.changes_detected} 个变更`}
                              </div>
                              {record.error_message && (
                                <div className="text-xs text-red-600 mt-1">
                                  {record.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '部分成功'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>暂无同步历史记录</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* 同步配置对话框 */}
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>元数据配置</DialogTitle>
                <DialogDescription>
                  元数据自动同步功能已弃用，现在始终使用实时查询
                </DialogDescription>
              </DialogHeader>
              {syncConfig && selectedDataSource && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sync-enabled">启用自动同步</Label>
                    <Switch
                      id="sync-enabled"
                      checked={syncConfig.enabled}
                      onCheckedChange={(checked) => setSyncConfig({ ...syncConfig, enabled: checked })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sync-interval">同步间隔（小时）</Label>
                    <Input
                      id="sync-interval"
                      type="number"
                      min="1"
                      max="168"
                      value={syncConfig.interval_hours}
                      onChange={(e) => setSyncConfig({ 
                        ...syncConfig, 
                        interval_hours: parseInt(e.target.value) || 24 
                      })}
                      disabled={!syncConfig.enabled}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>同步选项</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="include-stats" className="text-sm">包含表统计信息</Label>
                        <Switch
                          id="include-stats"
                          checked={syncConfig.include_table_stats}
                          onCheckedChange={(checked) => setSyncConfig({ 
                            ...syncConfig, 
                            include_table_stats: checked 
                          })}
                          disabled={!syncConfig.enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="include-indexes" className="text-sm">包含索引信息</Label>
                        <Switch
                          id="include-indexes"
                          checked={syncConfig.include_indexes}
                          onCheckedChange={(checked) => setSyncConfig({ 
                            ...syncConfig, 
                            include_indexes: checked 
                          })}
                          disabled={!syncConfig.enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="include-constraints" className="text-sm">包含约束信息</Label>
                        <Switch
                          id="include-constraints"
                          checked={syncConfig.include_constraints}
                          onCheckedChange={(checked) => setSyncConfig({ 
                            ...syncConfig, 
                            include_constraints: checked 
                          })}
                          disabled={!syncConfig.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={() => selectedDataSource && syncConfig && handleUpdateSyncConfig(selectedDataSource.id, syncConfig)}
                  disabled={!syncConfig}
                >
                  保存配置
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </div>
  );
} 