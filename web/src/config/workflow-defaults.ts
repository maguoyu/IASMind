// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * 工作流默认参数配置
 * 为每个工作流维护默认的执行参数
 */

export interface WorkflowDefaultParams {
  chatInput?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * 工作流默认参数映射
 * key: 工作流名称
 * value: 默认参数对象
 */
export const workflowDefaults: Record<string, WorkflowDefaultParams> = {
  // 默认参数配置 - 适用于所有工作流
  default: {
    chatInput: "hello world`",
    sessionId: "user-12345",
  },
  "实时航班跟踪与变更警报": {
    "trackInput": "查询最新航班状态",
    "sessionId": "user-session-flight-12345"
  },
  "油单数据库查询": {
    "trackInput": "查询 CA123 航班的最新状态",
    "sessionId": "user-session-12345"
  },
  "航班延误 AI 安抚信（中英双语）": {
    "flightNumber": "MU456",
    "passengerEmail": "john.doe@example.com",
    "passengerName": "约翰·多伊",
    "language": "both"
  },
  "传输协议-sse": {
    chatInput: "给我讲个关于加油的笑话",
    sessionId: "user-11111",
  },
  "航油采购合同智能审查": {
    "contractText": "航空燃油采购合同\n\n合同编号：HY-2025-001\n甲方（采购方）：XX航空股份有限公司\n统一社会信用代码：91110000XXXXXXXXXX\n地址：北京市朝阳区xx路xx号\n法定代表人：张三\n\n乙方（供应方）：中国航油集团有限公司XX分公司\n统一社会信用代码：91110000YYYYYYYYYY\n地址：北京市顺义区xx路xx号\n法定代表人：李四\n\n根据《中华人民共和国合同法》及相关法律法规，经双方友好协商，就航空燃油采购事宜达成如下协议：\n\n第一条 产品名称及规格\n1.1 产品名称：航空煤油（Jet A-1）\n1.2 质量标准：符合ASTM D1655标准和中国民用航空局相关技术规范\n1.3 产品用途：民用航空器燃油\n\n第二条 采购数量及价格\n2.1 采购数量：10000吨（允许±5%的偏差）\n2.2 单价：8500元/吨（含税价）\n2.3 合同总金额：8500万元人民币\n2.4 价格调整机制：参照新加坡普氏航空燃油价格指数，每月调整一次，调整幅度超过10%时双方协商确定\n2.5 价格保护：单月价格波动超过15%时启动价格保护机制\n\n第三条 质量标准与检验\n3.1 油品应符合ASTM D1655标准和GB 6537-2018国家标准\n3.2 每批次油品应提供质检报告\n3.3 质量检测由双方共同委托第三方检测机构进行\n3.4 检测费用由双方各承担50%\n3.5 质量不合格的，乙方应在3日内更换，并承担由此产生的一切费用\n\n第四条 交付条款\n4.1 交付地点：首都国际机场油库、大兴国际机场油库\n4.2 交付方式：管道输送至指定油库\n4.3 交付时间：2025年1月1日至2025年12月31日，分批交付\n4.4 供应保障：乙方应确保每日供应能力不低于50吨，保证甲方航班正常运行\n4.5 紧急供应：如遇甲方航班突发增加，乙方应在2小时内响应，4小时内完成紧急供应\n\n第五条 付款条款\n5.1 付款方式：银行转账\n5.2 账期：30天账期，货到后30日内付款\n5.3 发票：乙方应在交付后3个工作日内提供增值税专用发票\n5.4 逾期付款违约金：按日息万分之五计算\n\n第六条 保险\n6.1 乙方应为运输中的油品购买货物运输保险\n6.2 保险金额应覆盖货物全部价值\n6.3 保险单复印件应在首次交付前提供给甲方\n\n第七条 安全与环保\n7.1 乙方应严格遵守《危险化学品安全管理条例》\n7.2 运输过程应符合《道路危险货物运输管理规定》\n7.3 环保要求：符合国家环境保护相关标准\n7.4 应急预案：乙方应制定完善的应急预案并定期演练\n\n第八条 违约责任\n8.1 乙方延迟交付的，每延迟一日按当批次货款的0.5%支付违约金\n8.2 质量不合格导致甲方损失的，乙方应承担全部赔偿责任\n8.3 甲方延迟付款的，按第五条约定支付违约金\n8.4 违约金总额不超过合同总金额的20%\n\n第九条 不可抗力\n9.1 因地震、台风、战争、政府行为等不可抗力导致合同无法履行的，双方均不承担违约责任\n9.2 遭遇不可抗力的一方应在24小时内通知对方\n9.3 不可抗力持续超过30日的，任何一方有权解除合同\n\n第十条 保密条款\n10.1 双方对合同内容及商业信息负有保密义务\n10.2 保密期限：合同终止后2年\n10.3 违反保密义务的，应赔偿对方损失\n\n第十一条 反商业贿赂\n11.1 双方承诺不向对方工作人员行贿或提供不正当利益\n11.2 违反本条的，守约方有权单方解除合同\n\n第十二条 争议解决\n12.1 因本合同引起的争议，双方应友好协商解决\n12.2 协商不成的，提交北京仲裁委员会仲裁\n12.3 仲裁裁决是终局的，对双方均有约束力\n12.4 适用法律：中华人民共和国法律\n\n第十三条 其他\n13.1 本合同一式四份，甲乙双方各执两份\n13.2 本合同自双方法定代表人或授权代表签字并加盖公章后生效\n13.3 合同有效期：2025年1月1日至2025年12月31日\n13.4 合同到期前30日，如双方无异议，自动续约一年\n\n甲方（盖章）：XX航空股份有限公司\n法定代表人或授权代表（签字）：_________\n签订日期：2024年12月15日\n\n乙方（盖章）：中国航油集团有限公司XX分公司\n法定代表人或授权代表（签字）：_________\n签订日期：2024年12月15日",
  
    "contractType": "aviation-fuel-purchase",
      "sessionId": "user-123-contract-5696"
  
  },
  "智能问答机器人": {
    "question": "航空汽油是什么？",
    "sessionId": "user-session-001",
    "userId": "developer-123",
    "context": "我是一个学生"
  },
  // 示例：为特定工作流名称配置参数
  // "我的聊天机器人": {
  //   chatInput: "你好，请介绍一下你自己",
  //   sessionId: "demo-session",
  // },
};

/**
 * 获取工作流的默认参数
 * @param workflowName 工作流名称
 * @returns 默认参数对象
 */
export function getWorkflowDefaults(workflowName: string): WorkflowDefaultParams {
  // 如果有特定工作流的配置，使用特定配置
  if (workflowDefaults[workflowName]) {
    return { ...workflowDefaults[workflowName] };
  }
  
  // 否则使用默认配置
  return { ...workflowDefaults.default };
}

/**
 * 设置工作流的默认参数
 * @param workflowName 工作流名称
 * @param params 参数对象
 */
export function setWorkflowDefaults(
  workflowName: string,
  params: WorkflowDefaultParams,
): void {
  workflowDefaults[workflowName] = { ...params };
}

/**
 * 格式化参数为 JSON 字符串
 * @param params 参数对象
 * @returns 格式化的 JSON 字符串
 */
export function formatParamsToJson(params: WorkflowDefaultParams): string {
  return JSON.stringify(params, null, 2);
}

/**
 * 解析 JSON 字符串为参数对象
 * @param json JSON 字符串
 * @returns 参数对象
 */
export function parseJsonToParams(json: string): WorkflowDefaultParams {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error("无效的 JSON 格式");
  }
}

