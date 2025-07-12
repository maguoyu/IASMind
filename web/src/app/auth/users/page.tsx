"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { 
  Settings, 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Eye, 
  LogOut, 
  Menu, 
  X, 
  Info, 
  Database,
  AlertCircle
} from 'lucide-react';

import { Layout } from '~/components/layout';
import { AdminGuard } from '~/components/auth/auth-guard';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import type { UserInfo } from '~/core/api/auth';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { useRouter } from 'next/navigation';

interface UserListItem extends UserInfo {
  password_hash?: string;
}

export default function UsersPage() {
  const { user: currentUser, accessToken, logout, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest'
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();

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

  // 页面加载时获取用户列表
  useEffect(() => {
    loadUsers();
  }, [accessToken]);

  // 过滤用户列表
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取角色显示
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

  // 获取状态显示
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

  // 系统管理侧边栏菜单
  const systemModules = [
    {
      id: 'users',
      title: '用户管理',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      href: '/auth/users',
      disabled: currentUser?.role !== 'admin',
      badge: currentUser?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'general',
      title: '通用设置',
      icon: <Settings className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      href: '/system?tab=general',
    },
    {
      id: 'mcp',
      title: 'MCP 配置',
      icon: <Database className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      href: '/system?tab=mcp',
    },
    {
      id: 'about',
      title: '关于系统',
      icon: <Info className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-gray-500 to-slate-600',
      href: '/system?tab=about',
    }
  ];

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };
  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '管理员',
      'user': '用户',
      'guest': '访客'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };
  const getRoleColor = (role: string) => {
    const colorMap = {
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'user': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'guest': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900">
          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:relative lg:translate-x-0`}>
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  系统管理
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {/* User Info */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(currentUser?.username || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {currentUser?.username}
                  </p>
                  <Badge className={`text-xs ${getRoleColor(currentUser?.role || '')}`}>{getRoleText(currentUser?.role || '')}</Badge>
                </div>
              </div>
            </div>
            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              {systemModules.map((module) => (
                <a
                  key={module.id}
                  href={module.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    module.disabled 
                      ? 'text-slate-400 cursor-not-allowed' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  } ${module.id === 'users' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''}`}
                  onClick={e => {
                    if (module.disabled) e.preventDefault();
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                    {module.icon}
                  </div>
                  <span className="flex-1">{module.title}</span>
                  {module.badge && (
                    <Badge variant="outline" className="text-xs">
                      {module.badge}
                    </Badge>
                  )}
                </a>
              ))}
            </nav>
            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:ml-0 p-6">
            {/* 页面标题和内容区域保留原有内容 */}
            {/* 页面标题 */}
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

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 创建用户表单 */}
            {showCreateForm && (
              <Card className="border-2 border-dashed">
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

            {/* 搜索和过滤 */}
            <Card>
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

            {/* 用户列表 */}
            <Card>
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
                            disabled={user.id === currentUser?.id}
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

            {/* 用户详情模态框 */}
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
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
} 