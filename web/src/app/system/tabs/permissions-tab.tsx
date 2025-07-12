"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  AlertCircle,
  Search,
  Filter,
  Shield,
  Database,
  User,
  Settings
} from 'lucide-react';
import { useAuthStore } from '~/core/store/auth-store';
import { rbacApi, type Permission, type CreatePermissionRequest, type UpdatePermissionRequest } from '~/core/api/rbac';
import { toast } from 'sonner';

export function PermissionsTab() {
  const { accessToken } = useAuthStore();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    resource: '',
    action: ''
  });

  // 预定义的资源和操作选项
  const resourceOptions = [
    { value: 'user', label: '用户管理', icon: User },
    { value: 'role', label: '角色管理', icon: Shield },
    { value: 'system', label: '系统管理', icon: Settings },
    { value: 'data', label: '数据管理', icon: Database },
  ];

  const actionOptions = [
    { value: 'create', label: '创建' },
    { value: 'read', label: '查看' },
    { value: 'update', label: '更新' },
    { value: 'delete', label: '删除' },
    { value: 'config', label: '配置' },
    { value: 'monitor', label: '监控' },
    { value: 'export', label: '导出' },
  ];

  // 加载权限列表
  const LoadPermissions = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const permissionsData = await rbacApi.GetPermissions(accessToken);
      setPermissions(permissionsData);
    } catch (error: any) {
      setError(error.message || '加载权限列表失败');
      toast.error(error.message || '加载权限列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建权限
  const CreatePermission = async () => {
    if (!accessToken) return;
    try {
      const request: CreatePermissionRequest = {
        name: formData.name,
        description: formData.description,
        resource: formData.resource,
        action: formData.action
      };
      const newPermission = await rbacApi.CreatePermission(request, accessToken);
      setPermissions([...permissions, newPermission]);
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', resource: '', action: '' });
      toast.success('权限创建成功');
    } catch (error: any) {
      setError(error.message || '创建权限失败');
      toast.error(error.message || '创建权限失败');
    }
  };

  // 更新权限
  const UpdatePermission = async () => {
    if (!accessToken || !editingPermission) return;
    try {
      const request: UpdatePermissionRequest = {
        name: formData.name,
        description: formData.description,
        resource: formData.resource,
        action: formData.action
      };
      const updatedPermission = await rbacApi.UpdatePermission(editingPermission.id, request, accessToken);
      setPermissions(permissions.map(p => p.id === editingPermission.id ? updatedPermission : p));
      setShowEditDialog(false);
      setEditingPermission(null);
      setFormData({ name: '', description: '', resource: '', action: '' });
      toast.success('权限更新成功');
    } catch (error: any) {
      setError(error.message || '更新权限失败');
      toast.error(error.message || '更新权限失败');
    }
  };

  // 删除权限
  const DeletePermission = async (permissionId: string) => {
    if (!accessToken) return;
    if (!confirm('确定要删除这个权限吗？删除后可能影响相关角色的权限。')) return;
    
    try {
      await rbacApi.DeletePermission(permissionId, accessToken);
      setPermissions(permissions.filter(p => p.id !== permissionId));
      toast.success('权限删除成功');
    } catch (error: any) {
      setError(error.message || '删除权限失败');
      toast.error(error.message || '删除权限失败');
    }
  };

  // 打开编辑对话框
  const OpenEditDialog = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action
    });
    setShowEditDialog(true);
  };

  useEffect(() => {
    LoadPermissions();
  }, [accessToken]);

  // 过滤权限
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResource = resourceFilter === 'all' || permission.resource === resourceFilter;
    const matchesAction = actionFilter === 'all' || permission.action === actionFilter;
    
    return matchesSearch && matchesResource && matchesAction;
  });

  // 按资源分组权限
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource]!.push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getResourceName = (resource: string) => {
    const resourceMap: Record<string, string> = {
      'user': '用户管理',
      'role': '角色管理',
      'system': '系统管理',
      'data': '数据管理'
    };
    return resourceMap[resource] || resource;
  };

  const getActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      'create': '创建',
      'read': '查看',
      'update': '更新',
      'delete': '删除',
      'config': '配置',
      'monitor': '监控',
      'export': '导出'
    };
    return actionMap[action] || action;
  };

  const getResourceIcon = (resource: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'user': User,
      'role': Shield,
      'system': Settings,
      'data': Database
    };
    const IconComponent = iconMap[resource] || Key;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'read': 'bg-blue-100 text-blue-800',
      'update': 'bg-yellow-100 text-yellow-800',
      'delete': 'bg-red-100 text-red-800',
      'config': 'bg-purple-100 text-purple-800',
      'monitor': 'bg-gray-100 text-gray-800',
      'export': 'bg-orange-100 text-orange-800'
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8" />
            权限管理
          </h1>
          <p className="text-gray-600 mt-2">
            管理系统权限定义和配置
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              创建权限
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>创建新权限</DialogTitle>
              <DialogDescription>
                定义新的系统权限
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">权限名称</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="请输入权限名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">权限描述</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="请输入权限描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-resource">资源类型</Label>
                  <Select value={formData.resource} onValueChange={(value) => setFormData({...formData, resource: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择资源类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-action">操作类型</Label>
                  <Select value={formData.action} onValueChange={(value) => setFormData({...formData, action: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择操作类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setFormData({ name: '', description: '', resource: '', action: '' });
                  }}
                >
                  取消
                </Button>
                <Button 
                  onClick={CreatePermission}
                  disabled={!formData.name || !formData.description || !formData.resource || !formData.action}
                >
                  创建权限
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 搜索和过滤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            搜索和过滤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="搜索权限名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有资源</SelectItem>
                {resourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="操作类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有操作</SelectItem>
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={LoadPermissions} variant="outline">
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 权限列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
              <Card key={resource}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getResourceIcon(resource)}
                    {getResourceName(resource)}
                    <Badge variant="secondary">{resourcePermissions.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {resourcePermissions.map((permission) => (
                      <div 
                        key={permission.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Key className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{permission.name}</h4>
                              <Badge className={getActionColor(permission.action)}>
                                {getActionName(permission.action)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>ID: {permission.id}</span>
                              <span>创建时间: {new Date(permission.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedPermission(permission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => OpenEditDialog(permission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => DeletePermission(permission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredPermissions.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">没有找到匹配的权限</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 权限详情模态框 */}
      {selectedPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                权限详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">权限名称</Label>
                  <p className="text-sm">{selectedPermission.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">权限描述</Label>
                  <p className="text-sm">{selectedPermission.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">资源类型</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getResourceIcon(selectedPermission.resource)}
                    <span className="text-sm">{getResourceName(selectedPermission.resource)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">操作类型</Label>
                  <div className="mt-1">
                    <Badge className={getActionColor(selectedPermission.action)}>
                      {getActionName(selectedPermission.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">权限ID</Label>
                  <p className="text-sm font-mono">{selectedPermission.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">创建时间</Label>
                  <p className="text-sm">{new Date(selectedPermission.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">更新时间</Label>
                  <p className="text-sm">{new Date(selectedPermission.updated_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPermission(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑权限对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑权限</DialogTitle>
            <DialogDescription>
              修改权限信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">权限名称</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="请输入权限名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">权限描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="请输入权限描述"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-resource">资源类型</Label>
                <Select value={formData.resource} onValueChange={(value) => setFormData({...formData, resource: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择资源类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-action">操作类型</Label>
                <Select value={formData.action} onValueChange={(value) => setFormData({...formData, action: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择操作类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingPermission(null);
                  setFormData({ name: '', description: '', resource: '', action: '' });
                }}
              >
                取消
              </Button>
              <Button 
                onClick={UpdatePermission}
                disabled={!formData.name || !formData.description || !formData.resource || !formData.action}
              >
                保存更改
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 