// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useState } from "react";
import { 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Database,
  Brain,
  Zap,
  AlertCircle
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import type { KnowledgeBase } from "../../types";
import { mockKnowledgeBases } from "../../mock-data";

export function KnowledgeBaseManagementTab() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(mockKnowledgeBases);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [newKb, setNewKb] = useState({
    name: "",
    description: "",
    embeddingModel: "text-embedding-3-small",
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const embeddingModels = [
    { value: "text-embedding-3-small", label: "OpenAI text-embedding-3-small", description: "小型模型，速度快" },
    { value: "text-embedding-3-large", label: "OpenAI text-embedding-3-large", description: "大型模型，效果好" },
    { value: "text-embedding-ada-002", label: "OpenAI text-embedding-ada-002", description: "经典模型" },
  ];

  const getStatusBadge = (status: KnowledgeBase["status"]) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      processing: "default",
    } as const;

    const labels = {
      active: "活跃",
      inactive: "非活跃",
      processing: "处理中",
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const handleCreateKb = () => {
    const newKnowledgeBase: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      ...newKb,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileCount: 0,
      vectorCount: 0,
      status: "active",
    };

    setKnowledgeBases(prev => [...prev, newKnowledgeBase]);
    setShowCreateDialog(false);
    setNewKb({
      name: "",
      description: "",
      embeddingModel: "text-embedding-3-small",
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  };

  const handleEditKb = () => {
    if (!editingKb) return;

    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === editingKb.id 
        ? { ...editingKb, updatedAt: new Date().toISOString() }
        : kb
    ));
    setShowEditDialog(false);
    setEditingKb(null);
  };

  const handleDeleteKb = (kbId: string) => {
    setKnowledgeBases(prev => prev.filter(kb => kb.id !== kbId));
  };

  const handleToggleStatus = (kbId: string) => {
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === kbId 
        ? { 
            ...kb, 
            status: kb.status === "active" ? "inactive" : "active",
            updatedAt: new Date().toISOString()
          }
        : kb
    ));
  };

  const startVectorization = (kbId: string) => {
    setKnowledgeBases(prev => prev.map(kb => 
      kb.id === kbId 
        ? { ...kb, status: "processing", updatedAt: new Date().toISOString() }
        : kb
    ));

    // 模拟向量化过程
    setTimeout(() => {
      setKnowledgeBases(prev => prev.map(kb => 
        kb.id === kbId 
          ? { ...kb, status: "active", updatedAt: new Date().toISOString() }
          : kb
      ));
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* 创建按钮 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">知识库管理</h2>
          <p className="text-muted-foreground">创建和管理您的RAG知识库</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              创建知识库
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新知识库</DialogTitle>
              <DialogDescription>
                配置知识库的基本信息和向量化参数
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">知识库名称</Label>
                <Input
                  id="name"
                  value={newKb.name}
                  onChange={(e) => setNewKb(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入知识库名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={newKb.description}
                  onChange={(e) => setNewKb(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简要描述知识库的用途"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embeddingModel">嵌入模型</Label>
                <Select value={newKb.embeddingModel} onValueChange={(value) => setNewKb(prev => ({ ...prev, embeddingModel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {embeddingModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">分块大小</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    value={newKb.chunkSize}
                    onChange={(e) => setNewKb(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                    min={200}
                    max={2000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">重叠大小</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    value={newKb.chunkOverlap}
                    onChange={(e) => setNewKb(prev => ({ ...prev, chunkOverlap: parseInt(e.target.value) }))}
                    min={0}
                    max={500}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateKb} disabled={!newKb.name.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{knowledgeBases.length}</div>
                <p className="text-xs text-muted-foreground">总知识库数</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {knowledgeBases.filter(kb => kb.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">活跃知识库</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {knowledgeBases.reduce((sum, kb) => sum + kb.vectorCount, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">总向量数</p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 知识库列表 */}
      <Card>
        <CardHeader>
          <CardTitle>知识库列表</CardTitle>
          <CardDescription>
            管理您的知识库配置和向量化状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>知识库</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>文件/向量</TableHead>
                <TableHead>模型配置</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {knowledgeBases.map((kb) => (
                <TableRow key={kb.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{kb.name}</div>
                      <div className="text-sm text-muted-foreground">{kb.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(kb.status)}
                      {kb.status === "processing" && (
                        <div className="w-16">
                          <Progress value={66} className="h-2" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{kb.fileCount} 个文件</div>
                      <div className="text-sm text-muted-foreground">
                        {kb.vectorCount.toLocaleString()} 个向量
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{kb.embeddingModel}</div>
                      <div className="text-xs text-muted-foreground">
                        分块: {kb.chunkSize} • 重叠: {kb.chunkOverlap}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(kb.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingKb(kb);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startVectorization(kb.id)}>
                          <Brain className="mr-2 h-4 w-4" />
                          重新向量化
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(kb.id)}>
                          {kb.status === "active" ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              暂停
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              启用
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteKb(kb.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {knowledgeBases.length === 0 && (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无知识库</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个知识库开始管理文档
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建知识库
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑知识库</DialogTitle>
            <DialogDescription>
              修改知识库的配置信息
            </DialogDescription>
          </DialogHeader>
          {editingKb && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">知识库名称</Label>
                <Input
                  id="edit-name"
                  value={editingKb.name}
                  onChange={(e) => setEditingKb(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <Textarea
                  id="edit-description"
                  value={editingKb.description}
                  onChange={(e) => setEditingKb(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-embeddingModel">嵌入模型</Label>
                <Select 
                  value={editingKb.embeddingModel} 
                  onValueChange={(value) => setEditingKb(prev => prev ? { ...prev, embeddingModel: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {embeddingModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-chunkSize">分块大小</Label>
                  <Input
                    id="edit-chunkSize"
                    type="number"
                    value={editingKb.chunkSize}
                    onChange={(e) => setEditingKb(prev => prev ? { ...prev, chunkSize: parseInt(e.target.value) } : null)}
                    min={200}
                    max={2000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-chunkOverlap">重叠大小</Label>
                  <Input
                    id="edit-chunkOverlap"
                    type="number"
                    value={editingKb.chunkOverlap}
                    onChange={(e) => setEditingKb(prev => prev ? { ...prev, chunkOverlap: parseInt(e.target.value) } : null)}
                    min={0}
                    max={500}
                  />
                </div>
              </div>
              
              {editingKb.fileCount > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      修改向量化参数将需要重新处理所有文件
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditKb}>
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 