"use client";

import { User, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { Logo } from "~/components/deer-flow/logo";
import { ThemeToggle } from "~/components/deer-flow/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "~/components/ui/dropdown-menu";
import { authApi } from "~/core/api/auth";
import { useAuthStore } from "~/core/store/auth-store";

interface HeaderProps {
  showUserMenu?: boolean;
  className?: string;
}

export function Header({ showUserMenu = true, className = "" }: HeaderProps) {
  const { isAuthenticated, user, accessToken, logout } = useAuthStore();
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
      logout();
      toast.success('已成功登出');
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfile = () => {
    void router.push('/auth/profile');
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

  return (
    <header className={`fixed top-0 left-0 flex h-16 w-full items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 z-50 ${className}`}>
      <Logo />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        {showUserMenu && isAuthenticated && user ? (
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
                    {user.email ?? '未设置邮箱'}
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
        ) : showUserMenu && !isAuthenticated ? (
          <Button 
            variant="outline" 
            size="sm"
            asChild
          >
            <Link href="/auth/login">
              登录
            </Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
} 