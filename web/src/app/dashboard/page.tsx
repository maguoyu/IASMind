"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { 
  User, 
  Shield, 
  Settings, 
  Users, 
  LogOut, 
  Key,
  Clock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

import { AuthGuard, ConditionalRender } from '~/components/auth/auth-guard';
import { useAuthStore } from '~/core/store/auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const { 
    user, 
    isAuthenticated, 
    permissions, 
    role, 
    loginTime, 
    lastActivity, 
    logout,
    hasPermission,
    hasRole 
  } = useAuthStore();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigateToUsers = () => {
    router.push('/auth/users');
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'inactive':
        return 'text-yellow-600';
      case 'suspended':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 顶部导航 */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Shield className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🧠 IAS_Mind 仪表板
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium">{user?.username}</span>
                  {user?.role && getRoleBadge(user.role)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? '登出中...' : '登出'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="container mx-auto px-6 py-8">
          <div className="grid gap-6">
            {/* 欢迎信息 */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                欢迎回来，{user?.username}！您已成功登录到 IAS_Mind 系统。
                系统采用国密加密技术保护您的数据安全。
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 用户信息卡片 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">用户信息</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">用户名</span>
                      <span className="font-medium">{user?.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">邮箱</span>
                      <span className="font-medium">{user?.email || '未设置'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">角色</span>
                      <div>{user?.role && getRoleBadge(user.role)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">状态</span>
                      <span className={`font-medium ${getStatusColor(user?.status || 'unknown')}`}>
                        {user?.status === 'active' ? '活跃' : 
                         user?.status === 'inactive' ? '不活跃' : 
                         user?.status === 'suspended' ? '已停用' : '未知'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 权限信息卡片 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">权限信息</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">权限数量</span>
                      <span className="font-medium">{permissions.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 会话信息卡片 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">会话信息</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">登录时间</span>
                      <span className="font-medium text-xs">
                        {loginTime ? new Date(loginTime).toLocaleString() : '未知'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">最后活动</span>
                      <span className="font-medium text-xs">
                        {lastActivity ? new Date(lastActivity).toLocaleString() : '未知'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">认证状态</span>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">已认证</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 功能菜单 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  功能菜单
                </CardTitle>
                <CardDescription>
                  根据您的权限，以下功能可供使用
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 管理员功能 */}
                  <ConditionalRender condition="role" role="admin">
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-medium">用户管理</h3>
                          <p className="text-sm text-gray-600">管理系统用户和权限</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3" 
                        size="sm"
                        onClick={navigateToUsers}
                      >
                        进入管理
                      </Button>
                    </div>
                  </ConditionalRender>

                  {/* 系统设置 */}
                  <ConditionalRender condition="permission" permissions={['admin', 'settings']}>
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Settings className="h-6 w-6 text-green-600" />
                        <div>
                          <h3 className="font-medium">系统设置</h3>
                          <p className="text-sm text-gray-600">配置系统参数</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3" 
                        size="sm"
                        variant="outline"
                        disabled
                      >
                        开发中
                      </Button>
                    </div>
                  </ConditionalRender>

                  {/* 个人资料 */}
                  <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-purple-600" />
                      <div>
                        <h3 className="font-medium">个人资料</h3>
                        <p className="text-sm text-gray-600">编辑个人信息</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-3" 
                      size="sm"
                      variant="outline"
                      disabled
                    >
                      开发中
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 权限测试 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  权限测试
                </CardTitle>
                <CardDescription>
                  测试不同权限级别的功能访问
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span>读取权限</span>
                    </div>
                    <Badge variant={hasPermission('read') ? 'default' : 'destructive'}>
                      {hasPermission('read') ? '允许' : '拒绝'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-green-500" />
                      <span>写入权限</span>
                    </div>
                    <Badge variant={hasPermission('write') ? 'default' : 'destructive'}>
                      {hasPermission('write') ? '允许' : '拒绝'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-red-500" />
                      <span>删除权限</span>
                    </div>
                    <Badge variant={hasPermission('delete') ? 'default' : 'destructive'}>
                      {hasPermission('delete') ? '允许' : '拒绝'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-purple-500" />
                      <span>管理员权限</span>
                    </div>
                    <Badge variant={hasRole('admin') ? 'default' : 'destructive'}>
                      {hasRole('admin') ? '允许' : '拒绝'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 