import type { GraphSnapshot } from '../../workspace/model/types';

function isoNow() {
  return new Date().toISOString();
}

export function demoSnapshot(): GraphSnapshot {
  const now = isoNow();

  const nodes = [
    {
      id: 'root',
      label: '航天通信系统',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'doing', progress: 60, owner: '张工', deps: 3 },
      createdAt: now,
      updatedAt: now,
      x: 260,
      y: 80,
    },
    {
      id: 'req',
      label: '需求分析',
      kind: 'task' as const,
      fields: { classification: 'secret', status: 'doing', progress: 30, owner: '张工', deps: 2 },
      createdAt: now,
      updatedAt: now,
      x: 40,
      y: 220,
    },
    {
      id: 'arch',
      label: '架构设计',
      kind: 'task' as const,
      fields: { classification: 'secret', status: 'doing', progress: 55, owner: '李工', deps: 2 },
      createdAt: now,
      updatedAt: now,
      x: 260,
      y: 220,
    },
    {
      id: 'plan',
      label: '实施计划',
      kind: 'task' as const,
      fields: { classification: 'secret', status: 'todo', progress: 10, owner: '王工', deps: 1 },
      createdAt: now,
      updatedAt: now,
      x: 480,
      y: 220,
    },
    {
      id: 'func',
      label: '功能需求',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'doing', progress: 20, owner: '张工' },
      createdAt: now,
      updatedAt: now,
      x: -40,
      y: 360,
    },
    {
      id: 'perf',
      label: '性能指标',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'todo', progress: 0, owner: '李工' },
      createdAt: now,
      updatedAt: now,
      x: 160,
      y: 360,
    },
    {
      id: 'sys',
      label: '系统架构',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'doing', progress: 40, owner: '李工' },
      createdAt: now,
      updatedAt: now,
      x: 260,
      y: 360,
    },
    {
      id: 'tech',
      label: '技术选型',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'todo', progress: 0, owner: '张工' },
      createdAt: now,
      updatedAt: now,
      x: 360,
      y: 360,
    },
    {
      id: 'res',
      label: '资源分配',
      kind: 'idea' as const,
      fields: { classification: 'secret', status: 'todo', progress: 0, owner: '王工' },
      createdAt: now,
      updatedAt: now,
      x: 560,
      y: 360,
    },
  ];

  const edges = [
    { id: 'e-root-req', from: 'root', to: 'req', relation: 'parent' as const },
    { id: 'e-root-arch', from: 'root', to: 'arch', relation: 'parent' as const },
    { id: 'e-root-plan', from: 'root', to: 'plan', relation: 'parent' as const },
    { id: 'e-req-func', from: 'req', to: 'func', relation: 'parent' as const },
    { id: 'e-req-perf', from: 'req', to: 'perf', relation: 'parent' as const },
    { id: 'e-arch-sys', from: 'arch', to: 'sys', relation: 'parent' as const },
    { id: 'e-arch-tech', from: 'arch', to: 'tech', relation: 'parent' as const },
    { id: 'e-plan-res', from: 'plan', to: 'res', relation: 'parent' as const },
    { id: 'e-tech-sys', from: 'tech', to: 'sys', relation: 'depends-on' as const, dependencyType: 'SS' as const },
  ];

  return { nodes, edges };
}

