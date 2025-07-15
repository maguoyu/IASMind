import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { knowledgeBaseApi } from "~/core/api/knowledge-base";
import SimpleFileManagement from "../knowledge_base/components/simple-file-management";

export default function TestSimpleFileManagementPage() {
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  // 加载知识库列表
  const LoadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await knowledgeBaseApi.GetKnowledgeBases();
      
      // 选择第一个知识库作为测试
      if (response.knowledge_bases.length > 0) {
        setSelectedKnowledgeBase(response.knowledge_bases[0]);
      }
    } catch (error) {
      console.error("加载知识库列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const HandleRefresh = () => {
    LoadKnowledgeBases();
  };

  React.useEffect(() => {
    LoadKnowledgeBases();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">简化文件管理功能测试</h1>
          <p className="text-muted-foreground mt-1">
            测试简化的文件管理分页功能
          </p>
        </div>
        <Button onClick={HandleRefresh} disabled={loading}>
          刷新数据
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
            </div>
          </CardContent>
        </Card>
      ) : !selectedKnowledgeBase ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground">没有可用的知识库</p>
              <p className="text-sm text-muted-foreground">请先创建知识库</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>当前测试知识库</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedKnowledgeBase.name}</div>
                  <div className="text-xs text-muted-foreground">知识库名称</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedKnowledgeBase.file_count || 0}</div>
                  <div className="text-xs text-muted-foreground">文件数量</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedKnowledgeBase.vector_count || 0}</div>
                  <div className="text-xs text-muted-foreground">向量数量</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedKnowledgeBase.status || 'active'}</div>
                  <div className="text-xs text-muted-foreground">状态</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <SimpleFileManagement
            selectedKnowledgeBase={selectedKnowledgeBase}
            onRefresh={HandleRefresh}
          />
        </div>
      )}
    </div>
  );
} 