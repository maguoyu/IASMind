"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Users, 
  User, 
  Shield, 
  Database, 
  Bell,
  Palette,
  Globe,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Layout } from '~/components/layout';
import { useAuthStore } from '~/core/store/auth-store';
import { authApi } from '~/core/api/auth';
import { useSettingsStore, changeSettings, saveSettings } from '~/core/store';
import { GeneralTab } from '../settings/tabs/general-tab';
import { MCPTab } from '../settings/tabs/mcp-tab';
import { UsersTab } from './tabs/users-tab';
import { RolesTab } from './tabs/roles-tab';
import { PermissionsTab } from './tabs/permissions-tab';
import { DataSourceTab } from './tabs/datasource-tab';

interface SystemModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

export default function SystemManagementPage() {
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [activeModule, setActiveModule] = useState<string>('general');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const settings = useSettingsStore();
  const [settingsChanges, setSettingsChanges] = useState({});

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  const handleSettingsChange = useCallback((newChanges: any) => {
    setSettingsChanges((prev) => ({
      ...prev,
      ...newChanges,
    }));
  }, []);

  const handleSaveSettings = useCallback(() => {
    if (Object.keys(settingsChanges).length > 0) {
      const newSettings = {
        ...settings,
        ...settingsChanges,
      };
      changeSettings(newSettings);
      saveSettings();
      setSettingsChanges({});
      toast.success('设置已保存');
    }
  }, [settings, settingsChanges]);

  const systemModules: SystemModule[] = useMemo(() => [
    {
      id: 'users',
      title: '用户管理',
      description: '管理系统用户、角色权限、账户状态',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      disabled: user?.role !== 'admin',
      badge: user?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'roles',
      title: '角色管理',
      description: '管理系统角色和权限分配',
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      disabled: user?.role !== 'admin',
      badge: user?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'permissions',
      title: '权限管理',
      description: '管理系统权限定义和配置',
      icon: <User className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      disabled: user?.role !== 'admin',
      badge: user?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'datasource',
      title: '数据源管理',
      description: '管理系统数据库连接配置',
      icon: <Database className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      disabled: user?.role !== 'admin',
      badge: user?.role === 'admin' ? '管理员' : undefined
    },
    {
      id: 'general',
      title: '通用设置',
      description: '主题、语言、通知等基础设置',
      icon: <Settings className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    },
    {
      id: 'mcp',
      title: 'MCP 配置',
      description: 'Model Context Protocol 服务器配置',
      icon: <Database className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
    }
  ], [user?.role]);

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

  const activeModuleData = systemModules.find(m => m.id === activeModule);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout fullHeight={true} showFooter={false}>
      <div className="flex h-full bg-slate-50 dark:bg-slate-900">
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

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {systemModules.map((module) => (
              <button
                key={module.id}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeModule === module.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setActiveModule(module.id)}
              >
                <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                  {module.icon}
                </div>
                <span className="flex-1 text-left">{module.title}</span>
                {module.badge && (
                  <Badge variant="outline" className="text-xs">
                    {module.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-0 overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              系统管理
            </h1>
            <div className="w-10" />
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeModuleData ? (
              <div className={activeModule === 'users' || activeModule === 'roles' || activeModule === 'permissions' || activeModule === 'datasource' || activeModule === 'mcp' ? 'w-full' : 'max-w-4xl mx-auto'}>
                {/* Page Header */}
                <div className="mb-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-lg ${activeModuleData.color} flex items-center justify-center`}>
                      {activeModuleData.icon}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {activeModuleData.title}
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400">
                        {activeModuleData.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <Card className="border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    {/* 直接渲染内容，不加 max-h-96 overflow-auto */}
                    {activeModule === 'users' && <UsersTab />}
                    {activeModule === 'roles' && <RolesTab />}
                    {activeModule === 'permissions' && <PermissionsTab />}
                    {activeModule === 'datasource' && <DataSourceTab />}
                    {activeModule === 'general' && (
                      <GeneralTab 
                        settings={{ ...settings, ...settingsChanges }}
                        onChange={handleSettingsChange}
                      />
                    )}
                    {activeModule === 'mcp' && (
                      <MCPTab 
                        settings={{ ...settings, ...settingsChanges }}
                        onChange={handleSettingsChange}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {activeModule !== 'users' && activeModule !== 'roles' && activeModule !== 'permissions' && activeModule !== 'datasource' && (
                  <div className="mt-6 flex justify-end space-x-3">
                    <Button 
                      variant="outline"
                      onClick={() => setSettingsChanges({})}
                      disabled={Object.keys(settingsChanges).length === 0}
                    >
                      重置
                    </Button>
                    <Button 
                      onClick={handleSaveSettings}
                      disabled={Object.keys(settingsChanges).length === 0}
                    >
                      保存设置
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    选择管理模块
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    请从左侧菜单选择一个管理模块
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </Layout>
  );
} 