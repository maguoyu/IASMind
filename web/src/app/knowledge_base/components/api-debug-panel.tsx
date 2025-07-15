"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Database,
  FileText,
  Settings,
  Upload,
  Download,
  Trash2
} from "lucide-react";
import { knowledgeBaseApi } from "~/core/api/knowledge-base";
import { toast } from "sonner";

export default function ApiDebugPanel() {
  const [activeTab, setActiveTab] = useState("health");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 健康检查
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // 知识库管理
  const [kbName, setKbName] = useState("测试知识库");
  const [kbDescription, setKbDescription] = useState("这是一个测试知识库");
  const [kbEmbeddingModel, setKbEmbeddingModel] = useState("text-embedding-3-small");
  const [kbChunkSize, setKbChunkSize] = useState(1000);
  const [kbChunkOverlap, setKbChunkOverlap] = useState(200);
  const [selectedKbId, setSelectedKbId] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);

  // 文件管理
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");

  // 统计信息
  const [stats, setStats] = useState<any>(null);

  // 通用执行函数
  const ExecuteApiCall = async (apiCall: () => Promise<any>, name: string) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const result = await apiCall();
      setResults(result);
      toast.success(`${name} 执行成功`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      setError(errorMessage);
      toast.error(`${name} 执行失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 健康检查
  const HandleHealthCheck = () => {
    ExecuteApiCall(
      () => knowledgeBaseApi.HealthCheck(),
      "健康检查"
    ).then(result => {
      if (result) setHealthStatus(result);
    });
  };

  // 知识库管理
  const HandleCreateKnowledgeBase = () => {
    ExecuteApiCall(
      () => knowledgeBaseApi.CreateKnowledgeBase({
        name: kbName,
        description: kbDescription,
        embedding_model: kbEmbeddingModel,
        chunk_size: kbChunkSize,
        chunk_overlap: kbChunkOverlap,
      }),
      "创建知识库"
    ).then(() => {
      HandleGetKnowledgeBases();
    });
  };

  const HandleGetKnowledgeBases = () => {
    ExecuteApiCall(
      () => knowledgeBaseApi.GetKnowledgeBases(),
      "获取知识库列表"
    ).then(result => {
      if (result) setKnowledgeBases(result.knowledge_bases);
    });
  };

  const HandleGetKnowledgeBase = () => {
    if (!selectedKbId) {
      toast.error("请选择知识库");
      return;
    }
    ExecuteApiCall(
      () => knowledgeBaseApi.GetKnowledgeBase(selectedKbId),
      "获取知识库详情"
    );
  };

  const HandleUpdateKnowledgeBase = () => {
    if (!selectedKbId) {
      toast.error("请选择知识库");
      return;
    }
    ExecuteApiCall(
      () => knowledgeBaseApi.UpdateKnowledgeBase(selectedKbId, {
        name: kbName,
        description: kbDescription,
      }),
      "更新知识库"
    ).then(() => {
      HandleGetKnowledgeBases();
    });
  };

  const HandleDeleteKnowledgeBase = () => {
    if (!selectedKbId) {
      toast.error("请选择知识库");
      return;
    }
    if (!confirm("确定要删除这个知识库吗？")) return;
    
    ExecuteApiCall(
      () => knowledgeBaseApi.DeleteKnowledgeBase(selectedKbId),
      "删除知识库"
    ).then(() => {
      HandleGetKnowledgeBases();
      setSelectedKbId("");
    });
  };

  // 文件管理
  const HandleUploadFile = () => {
    if (!selectedFile) {
      toast.error("请选择文件");
      return;
    }
    if (!selectedKbId) {
      toast.error("请选择知识库");
      return;
    }

    ExecuteApiCall(
      () => knowledgeBaseApi.UploadFile(selectedFile, selectedKbId, fileDescription),
      "上传文件"
    ).then(() => {
      HandleGetFiles();
    });
  };

  const HandleGetFiles = () => {
    ExecuteApiCall(
      () => knowledgeBaseApi.GetFiles({
        knowledge_base_id: selectedKbId || undefined,
      }),
      "获取文件列表"
    ).then(result => {
      if (result) setFiles(result.files);
    });
  };

  const HandleGetFile = () => {
    if (!selectedFileId) {
      toast.error("请选择文件");
      return;
    }
    ExecuteApiCall(
      () => knowledgeBaseApi.GetFile(selectedFileId),
      "获取文件详情"
    );
  };

  const HandleVectorizeFile = () => {
    if (!selectedFileId) {
      toast.error("请选择文件");
      return;
    }
    ExecuteApiCall(
      () => knowledgeBaseApi.VectorizeFile(selectedFileId),
      "向量化文件"
    ).then(() => {
      HandleGetFiles();
    });
  };

  const HandleDeleteFile = () => {
    if (!selectedFileId) {
      toast.error("请选择文件");
      return;
    }
    if (!confirm("确定要删除这个文件吗？")) return;
    
    ExecuteApiCall(
      () => knowledgeBaseApi.DeleteFile(selectedFileId),
      "删除文件"
    ).then(() => {
      HandleGetFiles();
      setSelectedFileId("");
    });
  };

  const HandleDownloadFile = () => {
    if (!selectedFileId) {
      toast.error("请选择文件");
      return;
    }
    ExecuteApiCall(
      () => knowledgeBaseApi.DownloadFile(selectedFileId),
      "下载文件"
    );
  };

  // 统计信息
  const HandleGetStats = () => {
    ExecuteApiCall(
      () => knowledgeBaseApi.GetStats(),
      "获取统计信息"
    ).then(result => {
      if (result) setStats(result.stats);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            API 调试面板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="health">健康检查</TabsTrigger>
              <TabsTrigger value="knowledge-base">知识库管理</TabsTrigger>
              <TabsTrigger value="files">文件管理</TabsTrigger>
              <TabsTrigger value="stats">统计信息</TabsTrigger>
            </TabsList>

            {/* 健康检查 */}
            <TabsContent value="health" className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={HandleHealthCheck} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  执行健康检查
                </Button>
                {healthStatus && (
                  <div className="flex items-center gap-2">
                    <Badge variant={healthStatus.status === "healthy" ? "default" : "destructive"}>
                      {healthStatus.status === "healthy" ? "健康" : "异常"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      数据库: {healthStatus.database} | 上传目录: {healthStatus.upload_dir}
                    </span>
                  </div>
                )}
              </div>

              {healthStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">健康检查结果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(healthStatus, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 知识库管理 */}
            <TabsContent value="knowledge-base" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">创建知识库</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">名称</label>
                      <Input
                        value={kbName}
                        onChange={(e) => setKbName(e.target.value)}
                        placeholder="知识库名称"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">描述</label>
                      <Textarea
                        value={kbDescription}
                        onChange={(e) => setKbDescription(e.target.value)}
                        placeholder="知识库描述"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium">嵌入模型</label>
                        <Select value={kbEmbeddingModel} onValueChange={setKbEmbeddingModel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                            <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">分块大小</label>
                        <Input
                          type="number"
                          value={kbChunkSize}
                          onChange={(e) => setKbChunkSize(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">分块重叠</label>
                      <Input
                        type="number"
                        value={kbChunkOverlap}
                        onChange={(e) => setKbChunkOverlap(parseInt(e.target.value))}
                      />
                    </div>
                    <Button onClick={HandleCreateKnowledgeBase} disabled={loading} className="w-full">
                      <Database className="h-4 w-4 mr-2" />
                      创建知识库
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">知识库操作</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button onClick={HandleGetKnowledgeBases} disabled={loading} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        刷新列表
                      </Button>
                    </div>

                    {knowledgeBases.length > 0 && (
                      <div>
                        <label className="text-sm font-medium">选择知识库</label>
                        <Select value={selectedKbId} onValueChange={setSelectedKbId}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择知识库" />
                          </SelectTrigger>
                          <SelectContent>
                            {knowledgeBases.map((kb) => (
                              <SelectItem key={kb.id} value={kb.id}>
                                {kb.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedKbId && (
                      <div className="flex gap-2">
                        <Button onClick={HandleGetKnowledgeBase} disabled={loading} size="sm">
                          查看详情
                        </Button>
                        <Button onClick={HandleUpdateKnowledgeBase} disabled={loading} size="sm" variant="outline">
                          更新
                        </Button>
                        <Button onClick={HandleDeleteKnowledgeBase} disabled={loading} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {knowledgeBases.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">知识库列表</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {knowledgeBases.map((kb) => (
                        <div key={kb.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{kb.name}</div>
                            <div className="text-sm text-muted-foreground">{kb.description}</div>
                          </div>
                          <Badge variant="outline">{kb.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 文件管理 */}
            <TabsContent value="files" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">上传文件</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">选择知识库</label>
                      <Select value={selectedKbId} onValueChange={setSelectedKbId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择知识库" />
                        </SelectTrigger>
                        <SelectContent>
                          {knowledgeBases.map((kb) => (
                            <SelectItem key={kb.id} value={kb.id}>
                              {kb.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">选择文件</label>
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept=".pdf,.docx,.xlsx,.txt,.md,.json,.csv"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">文件描述</label>
                      <Textarea
                        value={fileDescription}
                        onChange={(e) => setFileDescription(e.target.value)}
                        placeholder="文件描述"
                        rows={2}
                      />
                    </div>
                    <Button onClick={HandleUploadFile} disabled={loading || !selectedFile || !selectedKbId} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      上传文件
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">文件操作</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button onClick={HandleGetFiles} disabled={loading} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        刷新列表
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div>
                        <label className="text-sm font-medium">选择文件</label>
                        <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择文件" />
                          </SelectTrigger>
                          <SelectContent>
                            {files.map((file) => (
                              <SelectItem key={file.id} value={file.id}>
                                {file.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedFileId && (
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={HandleGetFile} disabled={loading} size="sm">
                          查看详情
                        </Button>
                        <Button onClick={HandleVectorizeFile} disabled={loading} size="sm" variant="outline">
                          向量化
                        </Button>
                        <Button onClick={HandleDownloadFile} disabled={loading} size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button onClick={HandleDeleteFile} disabled={loading} size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {files.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">文件列表</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{file.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {knowledgeBaseApi.utils.formatFileSize(file.size)} | {file.type}
                            </div>
                          </div>
                          <Badge variant={knowledgeBaseApi.utils.getStatusColor(file.status) as any}>
                            {knowledgeBaseApi.utils.getStatusText(file.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 统计信息 */}
            <TabsContent value="stats" className="space-y-4">
              <Button onClick={HandleGetStats} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                获取统计信息
              </Button>

              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">统计信息</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.total_knowledge_bases}</div>
                        <div className="text-xs text-muted-foreground">知识库总数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.total_files}</div>
                        <div className="text-xs text-muted-foreground">文件总数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.total_vectors}</div>
                        <div className="text-xs text-muted-foreground">向量总数</div>
                      </div>
                    </div>
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(stats, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* 结果显示 */}
          {(results || error) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">执行结果</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {results && (
                  <ScrollArea className="h-64">
                    <pre className="text-sm bg-muted p-4 rounded-md">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 