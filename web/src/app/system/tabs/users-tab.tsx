"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Users, UserPlus, Edit, Trash2, User, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import type { UserInfo } from '~/core/api/auth';

interface UserListItem extends UserInfo {
  password_hash?: string;
}

export function UsersTab() {
  const { user: currentUser, accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest'
  });
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  // 加载用户列表
  const loadUsers = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const response = await authApi.getUserList(accessToken);
      setUsers(response.users);
    } catch (error: any) {
      setError(error.message || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建用户
  const createUser = async () => {
    if (!accessToken) return;
    try {
      const newUser = await authApi.createUser(formData, accessToken);
      setUsers([...users, newUser]);
      setShowCreateForm(false);
      setFormData({ username: '', password: '', email: '', role: 'user' });
    } catch (error: any) {
      setError(error.message || '创建用户失败');
    }
  };

  // 打开编辑用户对话框
  const openEditUser = (user: UserListItem) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email || '',
      role: user.role,
      status: user.status
    });
    setShowEditForm(true);
  };

  // 更新用户
  const updateUser = async () => {
    if (!accessToken || !editingUser) {
      console.error('缺少访问令牌或编辑用户信息');
      setError('缺少必要的权限信息');
      return;
    }
    
    try {
      console.log('开始更新用户:', editingUser.id, editFormData);
      const updatedUser = await authApi.updateUser(editingUser.id, editFormData, accessToken);
      console.log('用户更新成功:', updatedUser);
      
      // 更新本地用户列表
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updatedUser } : u));
      
      // 关闭编辑对话框
      setShowEditForm(false);
      setEditingUser(null);
      setEditFormData({ username: '', email: '', role: 'user', status: 'active' });
      
      // 清除错误信息
      setError('');
      
      // 显示成功提示
      setSuccess('用户信息已成功更新');
      setTimeout(() => setSuccess(''), 3000); // 3秒后自动清除
      
      console.log('用户信息已成功更新');
    } catch (error: any) {
      console.error('更新用户失败:', error);
      setError(error.message || '更新用户失败，请检查网络连接或联系管理员');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [accessToken]);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">管理员</Badge>;
      case 'user':
        return <Badge variant="secondary">用户</Badge>;
      case 'guest':
        return <Badge variant="outline">访客</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">活跃</Badge>;
      case 'inactive':
        return <Badge variant="secondary">不活跃</Badge>;
      case 'suspended':
        return <Badge variant="destructive">已停用</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            用户管理
          </h1>
          <p className="text-gray-600 mt-2">
            管理系统用户账户和权限
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          创建用户
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {showCreateForm && (
        <Card className="border-2 border-dashed mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              创建新用户
            </CardTitle>
            <CardDescription>
              填写用户信息并设置初始密码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-username">用户名</Label>
                <Input
                  id="create-username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="请输入用户名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">邮箱</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="请输入邮箱"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-password">密码</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="请输入密码"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">角色</Label>
                <select
                  id="create-role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="guest">访客</option>
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </Button>
              <Button 
                onClick={createUser}
                disabled={!formData.username || !formData.password}
              >
                创建用户
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>搜索用户</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="按用户名或邮箱搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={loadUsers} variant="outline">
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>
            共 {filteredUsers.length} 个用户
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.username}</h3>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>ID: {user.id}</span>
                        <span>创建时间: {new Date(user.created_at).toLocaleDateString()}</span>
                        {user.last_login && (
                          <span>最后登录: {new Date(user.last_login).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  没有找到匹配的用户
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                用户详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">用户名</Label>
                  <p className="text-sm">{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">邮箱</Label>
                  <p className="text-sm">{selectedUser.email || '未设置'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">角色</Label>
                  <div className="mt-1">
                    {getRoleBadge(selectedUser.role)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">状态</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">创建时间</Label>
                  <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">最后登录</Label>
                  <p className="text-sm">
                    {selectedUser.last_login 
                      ? new Date(selectedUser.last_login).toLocaleString()
                      : '从未登录'
                    }
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">权限</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUser.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedUser(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                编辑用户
              </CardTitle>
              <CardDescription>
                修改用户 {editingUser.username} 的信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">用户名</Label>
                  <Input
                    id="edit-username"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    placeholder="请输入用户名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">角色</Label>
                  <select
                    id="edit-role"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value as any})}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="guest">访客</option>
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">状态</Label>
                  <select
                    id="edit-status"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value as any})}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">不活跃</option>
                    <option value="suspended">已停用</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingUser(null);
                    setEditFormData({ username: '', email: '', role: 'user', status: 'active' });
                  }}
                >
                  取消
                </Button>
                <Button 
                  onClick={updateUser}
                  disabled={!editFormData.username}
                >
                  保存更改
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 