#!/usr/bin/env python3
"""一次转换 agent-core 全部 34 章 → docs/agents/Agents底层逻辑/*.mdx。

用法：python3 .scratch/agentcore-all.py
（第 02 章源里没有课件，只有一张分类图，单独手写，不在本表内）
"""
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import agentcore2mdx
importlib.reload(agentcore2mdx)
from agentcore2mdx import convert

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'docs/agents/Agents底层逻辑')
CH = [
 (1, '01. 必看导言', '必看导言', '必看导言', 'Agents底层逻辑 · 必看导言：AI 岗位分布与薪资画像、课程安排与学习路线。'),
 (3, '03. 神经元', '神经元', '神经元', 'Agents底层逻辑 · 神经元：神经元的数学模型、权重与偏置、激活函数与参数。'),
 (4, '04. 前向传播', '前向传播', '前向传播', 'Agents底层逻辑 · 前向传播：从输入到输出的矩阵运算链路，层与层之间如何传递。'),
 (5, '05. 梯度下降', '梯度下降', '梯度下降', 'Agents底层逻辑 · 梯度下降：损失函数、学习率与反向传播，参数如何被更新。'),
 (6, '06. 训练模式和框架', '训练模式和框架', '训练模式和框架', 'Agents底层逻辑 · 训练模式与框架：监督/自监督/强化学习与主流深度学习框架选型。'),
 (7, '07. 词元', '词元', '词元', 'Agents底层逻辑 · 词元：从字符编码到 BPE 分词、词表训练与 Transformers 分词器实测。'),
 (8, '08. token统计', 'token统计', 'token统计', 'Agents底层逻辑 · token 统计：用 tiktoken 统计 token 数与成本，理解上下文窗口。'),
 (9, '09. 神经网络的本质', '神经网络的本质', '神经网络的本质', 'Agents底层逻辑 · 神经网络的本质：堆叠与矩阵运算、通用近似与泛化能力。'),
 (10, '10. 词嵌入', '词嵌入', '词嵌入', 'Agents底层逻辑 · 词嵌入：Embedding 原理、上下文窗口与向量语义。'),
 (11, '11. 注意力机制', '注意力机制', '注意力机制', 'Agents底层逻辑 · 注意力机制：QKV 矩阵、多头注意力与位置编码。'),
 (12, '12. Transformer的完整训练流程', 'Transformer的完整训练流程', 'Transformer的完整训练流程', 'Agents底层逻辑 · Transformer 完整训练流程：残差、FFN、自监督目标与训练步骤。'),
 (13, '13. 推理机制', '推理机制', '推理机制', 'Agents底层逻辑 · 推理机制：采样策略、K-V 缓存、预填充与解码的推理全流程。'),
 (14, '14. 训练阶段', '训练阶段', '训练阶段', 'Agents底层逻辑 · 训练阶段：预训练与后训练的分工，微调与对齐分别在做什么。'),
 (15, '15. 模型接口契约', '模型接口契约', '模型接口契约', 'Agents底层逻辑 · 模型接口契约：OpenAI SDK 调用、流式响应与视觉输入的多模态接口。'),
 (16, '16. 系统提示词', '系统提示词', '系统提示词', 'Agents底层逻辑 · 系统提示词：提示词模板与 Jinja2 渲染，及其如何塑造 Agent 行为。'),
 (17, '17. 会话', '会话', '会话', 'Agents底层逻辑 · 会话：多轮消息管理与上下文拼接、缓存命中与 token 成本控制。'),
 (18, '18. tools', 'tools', 'tools', 'Agents底层逻辑 · tools：tool calling 机制、工具描述与事件流，让模型学会调用函数。'),
 (19, '19. 封装tools', '封装tools', '封装tools', 'Agents底层逻辑 · 封装 tools：把工具抽象为可注册的类，含参数校验与错误处理。'),
 (20, '20. ReAct', 'ReAct', 'ReAct', 'Agents底层逻辑 · ReAct：推理与行动交替的循环范式，用 ReAct 组织 Agent 主循环。'),
 (21, '21. Agent', 'Agent', 'Agent', 'Agents底层逻辑 · Agent：把会话、工具与循环组装成完整 Agent，含事件监听与生命周期。'),
 (22, '22. Agent 搜索引擎', 'Agent-搜索引擎', 'Agent 搜索引擎', 'Agents底层逻辑 · Agent 搜索引擎：接入联网搜索工具、检索结果处理与引用组织。'),
 (23, '23. Skill', 'Skill', 'Skill', 'Agents底层逻辑 · Skill：把可复用能力封装成技能包，技能加载与权限控制。'),
 (24, '24. MCP协议', 'MCP协议', 'MCP协议', 'Agents底层逻辑 · MCP 协议：模型上下文协议的设计目标、传输方式与能力协商。'),
 (25, '25. MCP Client', 'MCP-Client', 'MCP Client', 'Agents底层逻辑 · MCP Client：以客户端身份连接 MCP 服务器，工具发现与调用。'),
 (26, '26. Agent接入MCP', 'Agent接入MCP', 'Agent接入MCP', 'Agents底层逻辑 · Agent 接入 MCP：把 MCP 工具并入 Agent 工具集并统一错误处理。'),
 (27, '27. 实现MCP服务器', '实现MCP服务器', '实现MCP服务器', 'Agents底层逻辑 · 实现 MCP 服务器：从零实现一个可被 Agent 调用的 MCP 服务。'),
 (28, '28. Skill VS MCP', 'Skill-VS-MCP', 'Skill VS MCP', 'Agents底层逻辑 · Skill 与 MCP 对比：两种能力扩展方式的适用场景与取舍。'),
 (29, '29. 子代理', '子代理', '子代理', 'Agents底层逻辑 · 子代理：把任务分派给子代理，上下文隔离与结果汇总。'),
 (30, '30. Prompt Engeering', 'Prompt-Engineering', 'Prompt Engineering', 'Agents底层逻辑 · Prompt Engineering：提示词工程要点与官方指南资源。'),
 (31, '31. Context Engeering', 'Context-Engineering', 'Context Engineering', 'Agents底层逻辑 · Context Engineering：上下文工程取舍——放什么、留多久、如何压缩。'),
 (32, '32. Harness Engeering', 'Harness-Engineering', 'Harness Engineering', 'Agents底层逻辑 · Harness Engineering：Agent 外壳的工具、权限与可观测性设计。'),
 (33, '33. Loop Engeering', 'Loop-Engineering', 'Loop Engineering', 'Agents底层逻辑 · Loop Engineering：Agent 循环的终止条件、预算控制与失败重试。'),
 (34, '34. Graph Engeering', 'Graph-Engineering', 'Graph Engineering', 'Agents底层逻辑 · Graph Engineering：用图组织多步流程，节点、边与状态流转。'),
]

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    last_code = None                      # 上一个「带代码包」的章节，作为 diff 基准
    for no, d, base, title, desc in CH:
        mdx = convert(d, no, title, desc, 'agentsCore', 'preserve', prev_chapter=last_code)
        open(f'{OUT}/{no:02d}.{base}.mdx', 'w', encoding='utf-8').write(mdx)
        if agentcore2mdx.code_files(d):
            last_code = d
    print(f'已转换 {len(CH)} 章（第 02 章为纯图章，另行手写）')
