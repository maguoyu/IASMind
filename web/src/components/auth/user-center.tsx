"use client";

import React, { useState } from 'react';
import { 
  User, 
  LogOut, 
  ChevronDown,
  UserCheck,
  Bell
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '~/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function UserCenter() {
  const { user, accessToken, logout, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      if (accessToken) {
        await authApi.logout({ refresh_token: accessToken }, accessToken);
      }
      logout();
      toast.success('已成功登出');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      // 即使API调用失败，也要清除本地状态
      logout();
      toast.success('已成功登出');
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfile = () => {
    router.push('/auth/profile');
  };

  // 如果用户未登录，显示登录按钮
  if (!isAuthenticated || !user) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => router.push('/auth/login')}
        className="flex items-center gap-2"
      >
        <User className="w-4 h-4" />
        登录
      </Button>
    );
  }

  // 获取用户头像的初始字母
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  // 获取角色显示文本
  const getRoleText = (role: string) => {
    const roleMap = {
      'admin': '管理员',
      'user': '用户',
      'guest': '访客'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    const colorMap = {
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'user': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'guest': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 py-2 h-auto"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.username}
            </span>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getRoleColor(user.role)}`}
            >
              {getRoleText(user.role)}
            </Badge>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56"
        sideOffset={8}
        avoidCollisions={true}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || '未设置邮箱'}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleProfile}>
          <User className="mr-2 h-4 w-4" />
          <span>个人资料</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          disabled={isLoading}
          className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? '登出中...' : '登出'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 