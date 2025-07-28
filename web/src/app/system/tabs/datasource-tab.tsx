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
  ExternalLink
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
import { dataSourceApi, DataSource, DataSourceCreate, DataSourceUpdate, TablesResponse, ColumnsResponse } from '~/core/api/datasource';

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
  const [tables, setTables] = useState<TablesResponse | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<ColumnsResponse | null>(null);

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
    fetchDataSources();
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
      fetchDataSources();
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
      fetchDataSources();
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
      fetchDataSources();
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
      fetchDataSources(); // 刷新状态
    }
  };

  // 获取表列表
  const fetchTables = async (dataSourceId: string) => {
    try {
      const result = await dataSourceApi.getTables(dataSourceId);
      setTables(result);
      setSelectedTable('');
      setColumns(null);
    } catch (error) {
      console.error('获取表列表失败:', error);
      toast.error('获取表列表失败');
    }
  };

  // 获取表列信息
  const fetchColumns = async (dataSourceId: string, tableName: string) => {
    try {
      const result = await dataSourceApi.getTableColumns(dataSourceId, tableName);
      setColumns(result);
    } catch (error) {
      console.error('获取表结构失败:', error);
      toast.error('获取表结构失败');
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
  const openDetailDialog = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setTables(null);
    setColumns(null);
    setSelectedTable('');
    setIsDetailDialogOpen(true);
    fetchTables(dataSource.id);
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
                        onClick={() => openDetailDialog(dataSource)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"  
                        size="sm"
                        onClick={() => openEditDialog(dataSource)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(dataSource)}
                        className="text-red-600 hover:text-red-700"
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
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>数据源详情</DialogTitle>
            <DialogDescription>
              查看数据源配置和数据库结构信息
            </DialogDescription>
          </DialogHeader>
          {selectedDataSource && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">基本信息</TabsTrigger>
                <TabsTrigger value="tables">表结构</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">数据源名称</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.name}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">数据库类型</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.type.toUpperCase()}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">主机地址</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.host}:{selectedDataSource.port}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">数据库名</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.database_name}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">用户名</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.username}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">连接状态</Label>
                    <div className="mt-1">{getStatusBadge(selectedDataSource.status)}</div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">创建时间</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">
                      {new Date(selectedDataSource.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">最后连接</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedDataSource.last_connected_at 
                        ? new Date(selectedDataSource.last_connected_at).toLocaleString()
                        : '从未连接'
                      }
                    </div>
                  </div>
                </div>
                {selectedDataSource.schema_name && (
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">模式名</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.schema_name}</div>
                  </div>
                )}
                {selectedDataSource.service_name && (
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">服务名</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.service_name}</div>
                  </div>
                )}
                {selectedDataSource.description && (
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">描述</Label>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selectedDataSource.description}</div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tables" className="space-y-4">
                {tables ? (
                  tables.success ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-900 dark:text-slate-100 font-medium">表列表 ({tables.count})</Label>
                        <div className="mt-2 max-h-64 overflow-y-auto border rounded-md">
                          {tables.tables.map((tableName) => (
                            <button
                              key={tableName}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 border-b last:border-b-0 ${
                                selectedTable === tableName ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                              onClick={() => {
                                setSelectedTable(tableName);
                                fetchColumns(selectedDataSource.id, tableName);
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <Table className="w-4 h-4" />
                                <span>{tableName}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-900 dark:text-slate-100 font-medium">
                          表结构 {selectedTable && `- ${selectedTable}`}
                        </Label>
                        <div className="mt-2 max-h-64 overflow-y-auto border rounded-md">
                          {columns ? (
                            columns.success ? (
                              <div className="p-2 space-y-1">
                                {columns.columns.map((column, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                    <div>
                                      <span className="font-medium">{column.name}</span>
                                      <span className="ml-2 text-slate-500">{column.type}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      {!column.null && <Badge variant="outline" className="text-xs">NOT NULL</Badge>}
                                      {column.key && <Badge variant="outline" className="text-xs">{column.key}</Badge>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-slate-500">
                                {columns.message || '获取表结构失败'}
                              </div>
                            )
                          ) : selectedTable ? (
                            <div className="p-4 text-center">
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                              <div className="text-sm text-slate-500 mt-2">加载表结构中...</div>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-slate-500">
                              选择一个表查看结构
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {tables.message || '无法获取表列表，请检查数据源连接'}
                      </AlertDescription>
                    </Alert>
                  )
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <div className="text-sm text-slate-500 mt-2">加载表列表中...</div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 