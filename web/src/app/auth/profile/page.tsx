"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit, 
  Save, 
  X,
  Camera,
  Key,
  Bell
} from 'lucide-react';
import { Layout } from '~/components/layout';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import type { UserUpdateRequest } from '~/core/api/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, accessToken, updateCurrentUser } = useAuthStore();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setFormData({
      email: user.email || '',
      avatar: user.avatar || ''
    });
  }, [user, router]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updateRequest: UserUpdateRequest = {
        email: formData.email || undefined,
        avatar: formData.avatar || undefined
      };

      const updatedUser = await updateCurrentUser(updateRequest);
      if (updatedUser) {
        setIsEditing(false);
        toast.success('个人资料更新成功');
      } else {
        toast.error('更新失败，请重试');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: user?.email || '',
      avatar: user?.avatar || ''
    });
    setIsEditing(false);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      {/* Profile Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.avatar} alt={user.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-medium">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {user.username}
                </h2>
                <Badge 
                  variant="secondary" 
                  className={`${getRoleColor(user.role)}`}
                >
                  {getRoleText(user.role)}
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                用户ID: {user.id}
              </p>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => setIsEditing(!isEditing)}
              disabled={isLoading}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  取消编辑
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  编辑资料
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              基本信息
            </CardTitle>
            <CardDescription>
              管理您的个人基本信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-xs text-slate-500">用户名不可修改</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="请输入邮箱地址"
                />
              ) : (
                <Input
                  id="email"
                  value={user.email || '未设置'}
                  disabled
                  className="bg-slate-50 dark:bg-slate-800"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">头像URL</Label>
              {isEditing ? (
                <Input
                  id="avatar"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="请输入头像图片URL"
                />
              ) : (
                <Input
                  id="avatar"
                  value={user.avatar || '未设置'}
                  disabled
                  className="bg-slate-50 dark:bg-slate-800"
                />
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存更改
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              账户信息
            </CardTitle>
            <CardDescription>
              查看您的账户状态和权限
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>账户状态</Label>
              <Badge 
                variant={user.status === 'active' ? 'default' : 'secondary'}
                className={user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
              >
                {user.status === 'active' ? '活跃' : '非活跃'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>用户角色</Label>
              <Badge 
                variant="secondary" 
                className={getRoleColor(user.role)}
              >
                {getRoleText(user.role)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label>权限列表</Label>
              <div className="flex flex-wrap gap-1">
                {user.permissions.map((permission, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                注册时间
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatDate(user.created_at)}
              </p>
            </div>

            {user.last_login && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  最后登录
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(user.last_login)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            安全设置
          </CardTitle>
          <CardDescription>
            管理您的账户安全设置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Key className="w-4 h-4 mr-2" />
              修改密码
            </Button>
            <Button variant="outline" className="justify-start">
              <Shield className="w-4 h-4 mr-2" />
              两步验证
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
} 