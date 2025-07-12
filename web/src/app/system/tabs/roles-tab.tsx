"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import { Checkbox } from '~/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  AlertCircle,
  Users,
  Key,
  Settings,
  Search,
  Filter
} from 'lucide-react';
import { useAuthStore } from '~/core/store/auth-store';
import { rbacApi, type Role, type Permission, type CreateRoleRequest, type UpdateRoleRequest } from '~/core/api/rbac';
import { toast } from 'sonner';

export function RolesTab() {
  const { accessToken } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as string[]
  });

  // 加载角色列表
  const LoadRoles = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        rbacApi.GetRoles(accessToken),
        rbacApi.GetPermissions(accessToken)
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error: any) {
      setError(error.message || '加载角色列表失败');
      toast.error(error.message || '加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建角色
  const CreateRole = async () => {
    if (!accessToken) return;
    try {
      const request: CreateRoleRequest = {
        name: formData.name,
        description: formData.description,
        permission_ids: formData.permission_ids
      };
      const newRole = await rbacApi.CreateRole(request, accessToken);
      setRoles([...roles, newRole]);
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', permission_ids: [] });
      toast.success('角色创建成功');
    } catch (error: any) {
      setError(error.message || '创建角色失败');
      toast.error(error.message || '创建角色失败');
    }
  };

  // 更新角色
  const UpdateRole = async () => {
    if (!accessToken || !editingRole) return;
    try {
      const request: UpdateRoleRequest = {
        name: formData.name,
        description: formData.description,
        permission_ids: formData.permission_ids
      };
      const updatedRole = await rbacApi.UpdateRole(editingRole.id, request, accessToken);
      setRoles(roles.map(r => r.id === editingRole.id ? updatedRole : r));
      setShowEditDialog(false);
      setEditingRole(null);
      setFormData({ name: '', description: '', permission_ids: [] });
      toast.success('角色更新成功');
    } catch (error: any) {
      setError(error.message || '更新角色失败');
      toast.error(error.message || '更新角色失败');
    }
  };

  // 删除角色
  const DeleteRole = async (roleId: string) => {
    if (!accessToken) return;
    if (!confirm('确定要删除这个角色吗？')) return;
    
    try {
      await rbacApi.DeleteRole(roleId, accessToken);
      setRoles(roles.filter(r => r.id !== roleId));
      toast.success('角色删除成功');
    } catch (error: any) {
      setError(error.message || '删除角色失败');
      toast.error(error.message || '删除角色失败');
    }
  };

  // 打开编辑对话框
  const OpenEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permission_ids: role.permissions.map(p => p.id)
    });
    setShowEditDialog(true);
  };

  // 权限选择处理
  const HandlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permission_ids: [...prev.permission_ids, permissionId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permission_ids: prev.permission_ids.filter(id => id !== permissionId)
      }));
    }
  };

  useEffect(() => {
    LoadRoles();
  }, [accessToken]);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按资源分组权限
  const groupedPermissions = permissions.reduce((acc, permission) => {
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

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            角色管理
          </h1>
          <p className="text-gray-600 mt-2">
            管理系统角色和权限分配
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              创建角色
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新角色</DialogTitle>
              <DialogDescription>
                填写角色信息并分配权限
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">角色名称</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="请输入角色名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">角色描述</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="请输入角色描述"
                    rows={3}
                  />
                </div>
              </div>
              
              {/* 权限选择 */}
              <div className="space-y-3">
                <Label>权限分配</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                    <div key={resource} className="mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        {getResourceName(resource)}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        {resourcePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permission_ids.includes(permission.id)}
                              onCheckedChange={(checked) => 
                                HandlePermissionChange(permission.id, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={permission.id} 
                              className="text-sm cursor-pointer"
                              title={permission.description}
                            >
                              {getActionName(permission.action)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setFormData({ name: '', description: '', permission_ids: [] });
                  }}
                >
                  取消
                </Button>
                <Button 
                  onClick={CreateRole}
                  disabled={!formData.name || !formData.description}
                >
                  创建角色
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
            搜索角色
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="按角色名称或描述搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={LoadRoles} variant="outline">
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 角色列表 */}
      <Card>
        <CardHeader>
          <CardTitle>角色列表</CardTitle>
          <CardDescription>
            共 {filteredRoles.length} 个角色
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRoles.map((role) => (
                <div 
                  key={role.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{role.name}</h3>
                        {role.is_system && (
                          <Badge variant="secondary">系统角色</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{role.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>权限数量: {role.permissions.length}</span>
                        <span>创建时间: {new Date(role.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedRole(role)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => OpenEditDialog(role)}
                      disabled={role.is_system}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => DeleteRole(role.id)}
                      disabled={role.is_system}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredRoles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  没有找到匹配的角色
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 角色详情模态框 */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                角色详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">角色名称</Label>
                  <p className="text-sm">{selectedRole.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">角色描述</Label>
                  <p className="text-sm">{selectedRole.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">角色类型</Label>
                  <div className="mt-1">
                    {selectedRole.is_system ? (
                      <Badge variant="secondary">系统角色</Badge>
                    ) : (
                      <Badge variant="outline">自定义角色</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">创建时间</Label>
                  <p className="text-sm">{new Date(selectedRole.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">更新时间</Label>
                  <p className="text-sm">{new Date(selectedRole.updated_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">权限列表</Label>
                <div className="mt-2 space-y-3">
                  {Object.entries(
                    selectedRole.permissions.reduce((acc, permission) => {
                      if (!acc[permission.resource]) {
                        acc[permission.resource] = [];
                      }
                      acc[permission.resource]!.push(permission);
                      return acc;
                    }, {} as Record<string, Permission[]>)
                  ).map(([resource, resourcePermissions]) => (
                    <div key={resource} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">
                        {getResourceName(resource)}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {resourcePermissions.map((permission) => (
                          <Badge key={permission.id} variant="outline" className="text-xs">
                            {getActionName(permission.action)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedRole(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑角色对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑角色</DialogTitle>
            <DialogDescription>
              修改角色信息和权限分配
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">角色名称</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="请输入角色名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">角色描述</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="请输入角色描述"
                  rows={3}
                />
              </div>
            </div>
            
            {/* 权限选择 */}
            <div className="space-y-3">
              <Label>权限分配</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                  <div key={resource} className="mb-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {getResourceName(resource)}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      {resourcePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${permission.id}`}
                            checked={formData.permission_ids.includes(permission.id)}
                            onCheckedChange={(checked) => 
                              HandlePermissionChange(permission.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`edit-${permission.id}`} 
                            className="text-sm cursor-pointer"
                            title={permission.description}
                          >
                            {getActionName(permission.action)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingRole(null);
                  setFormData({ name: '', description: '', permission_ids: [] });
                }}
              >
                取消
              </Button>
              <Button 
                onClick={UpdateRole}
                disabled={!formData.name || !formData.description}
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