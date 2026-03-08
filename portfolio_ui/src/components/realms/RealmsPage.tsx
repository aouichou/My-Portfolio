// components/realms/RealmsPage.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import type { CodeSnippet, MermaidDiagram } from '../../data/realms-content';
import {
  AI_ENGINE_SNIPPET,
  ARCHITECTURE_DIAGRAM,
  DM_SUPERVISOR_PATTERNS,
  DOCKER_SERVICES,
  INFRA_DIAGRAM,
  INFRASTRUCTURE_FEATURES,
  KNOWLEDGE_STATS,
  MEMORY_PIPELINE,
  MEMORY_SNIPPET,
  METRICS_CATEGORIES,
  OBSERVABILITY_DIAGRAM,
  OVERVIEW_FEATURES,
  PROVIDER_SNIPPET,
  REALMS_TABS,
  TECH_STACK_GROUPS,
  TOOL_CALLING_FLOW,
  TOOL_FUNCTIONS,
} from '../../data/realms-content';
import { MermaidComponent } from '../MermaidComponent';
import RealmsHero from './RealmsHero';

interface SectionVisibility {
  [key: string]: boolean;
}

export default function RealmsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isVisible, setIsVisible] = useState<SectionVisibility>({});

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      {
        threshold: typeof window !== 'undefined' && window.innerWidth < 768 ? 0.05 : 0.2,
        rootMargin: typeof window !== 'undefined' && window.innerWidth < 768 ? '0px 0px -10% 0px' : '0px',
      }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => { observer.disconnect(); };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
      {/* Hero */}
      <RealmsHero />

      {/* Sticky Tab Navigation */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 shadow-md z-10 px-4 py-2">
        <div className="container mx-auto max-w-6xl">
          <div className="flex overflow-x-auto space-x-2 md:space-x-4 scrollbar-hide">
            {REALMS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                className={`px-3 md:px-4 py-2 whitespace-nowrap text-sm md:text-base transition-colors ${
                  activeTab === tab.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:text-emerald-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-16">
        {/* ═══════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="overview" className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['overview'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Project Overview
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['overview'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Mistral Realms is a full-stack AI-powered D&amp;D platform built as an internship application
            for Mistral AI. It demonstrates mastery of Mistral&apos;s entire API surface — agents, tool calling,
            embeddings, and image generation — in a real, playable product with production-grade architecture.
          </motion.p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {OVERVIEW_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible['overview'] ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{feature.description}</p>
                {feature.highlight && (
                  <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                    {feature.highlight}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Tech Stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible['overview'] ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-16"
          >
            <h3 className="text-2xl font-bold mb-6 dark:text-white">Tech Stack</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(TECH_STACK_GROUPS).map(([group, techs]) => (
                <div key={group} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">{group}</h4>
                  <div className="flex flex-wrap gap-2">
                    {techs.map((tech) => (
                      <span key={tech} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Architecture Diagram */}
          <DiagramSection diagram={ARCHITECTURE_DIAGRAM} isVisible={!!isVisible['overview']} />
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* AI ENGINE TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="ai-engine" className={activeTab === 'ai-engine' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['ai-engine'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            AI Engine Deep Dive
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['ai-engine'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The DM Engine is a 1,991-line orchestration module that manages the multi-iteration tool-calling loop,
            provider fallback, rule validation, and adaptive narration. Here&apos;s how it works.
          </motion.p>

          {/* Tool Calling Flow Diagram */}
          <DiagramSection diagram={TOOL_CALLING_FLOW} isVisible={!!isVisible['ai-engine']} />

          {/* DM Engine Code */}
          <CodeSection snippet={AI_ENGINE_SNIPPET} isVisible={!!isVisible['ai-engine']} delay={0.3} />

          {/* Provider Selector Code */}
          <CodeSection snippet={PROVIDER_SNIPPET} isVisible={!!isVisible['ai-engine']} delay={0.5} />

          {/* Provider Fallback Visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible['ai-engine'] ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-12"
          >
            <h3 className="text-2xl font-bold mb-6 dark:text-white">Provider Priority Chain</h3>
            <div className="flex flex-wrap items-center gap-3">
              {['Mistral', 'Qwen', 'Groq', 'Cerebras', 'Together', 'SambaNova'].map((provider, i) => (
                <div key={provider} className="flex items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isVisible['ai-engine'] ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      i === 0
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className="text-xs text-gray-400 mr-1">P{i + 1}</span> {provider}
                  </motion.div>
                  {i < 5 && (
                    <span className="mx-1 text-gray-400 text-lg">→</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Each provider is tried in priority order. On failure, the selector automatically moves to the next available provider with context transfer.
            </p>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* MEMORY & KNOWLEDGE TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="memory" className={activeTab === 'memory' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['memory'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Memory &amp; Knowledge Base
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['memory'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The RAG memory system stores adventure events as Mistral embeddings and retrieves them
            via cosine similarity to give the AI awareness of past events. The knowledge base has 30,000+ D&amp;D 5e entries.
          </motion.p>

          {/* Knowledge Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {KNOWLEDGE_STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible['memory'] ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md text-center border border-gray-100 dark:border-gray-700"
              >
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{stat.value}</div>
                <div className="text-sm font-medium dark:text-white mb-1">{stat.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{stat.description}</div>
              </motion.div>
            ))}
          </div>

          {/* Memory Pipeline Diagram */}
          <DiagramSection diagram={MEMORY_PIPELINE} isVisible={!!isVisible['memory']} />

          {/* Memory Service Code */}
          <CodeSection snippet={MEMORY_SNIPPET} isVisible={!!isVisible['memory']} delay={0.4} />
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* GAME SYSTEMS TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="game-systems" className={activeTab === 'game-systems' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['game-systems'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Game Systems
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['game-systems'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            The AI DM has access to 16 tool functions covering dice rolls, combat, inventory, spells,
            companions, and quests. The DM Supervisor validates every response with 9 D&amp;D rule patterns.
          </motion.p>

          {/* Tool Functions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible['game-systems'] ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-16"
          >
            <h3 className="text-2xl font-bold mb-6 dark:text-white">16 Tool Functions</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {TOOL_FUNCTIONS.map((tool, index) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={isVisible['game-systems'] ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.4 }}
                  className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <span className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
                    tool.category === 'Core' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    tool.category === 'Combat' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    tool.category === 'Magic' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    tool.category === 'Knowledge' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    tool.category === 'Inventory' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                    tool.category === 'Companion' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {tool.category}
                  </span>
                  <div>
                    <code className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{tool.name}</code>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{tool.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* DM Supervisor Patterns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible['game-systems'] ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-6 dark:text-white">DM Supervisor — 9 Validation Patterns</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The DM Supervisor validates every AI response for D&amp;D 5e rule compliance. On violation,
              it silently injects rule reminders and regenerates — the player never sees the correction.
            </p>
            <div className="space-y-3">
              {DM_SUPERVISOR_PATTERNS.map((pattern, index) => (
                <motion.div
                  key={pattern.pattern}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isVisible['game-systems'] ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.7 + index * 0.06, duration: 0.4 }}
                  className="flex items-start gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-emerald-500"
                >
                  <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {index + 1}
                  </span>
                  <div>
                    <code className="text-sm font-mono font-semibold dark:text-white">{pattern.pattern}</code>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pattern.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* OBSERVABILITY TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="observability" className={activeTab === 'observability' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['observability'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Observability Stack
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['observability'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Every AI call, tool execution, and provider switch is fully instrumented with OpenTelemetry distributed tracing,
            40+ Prometheus metrics, and Grafana dashboards.
          </motion.p>

          {/* Observability Diagram */}
          <DiagramSection diagram={OBSERVABILITY_DIAGRAM} isVisible={!!isVisible['observability']} />

          {/* Metrics Categories */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {METRICS_CATEGORIES.map((cat, catIndex) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible['observability'] ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + catIndex * 0.15, duration: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700"
              >
                <h4 className="text-lg font-bold mb-4 text-emerald-600 dark:text-emerald-400">{cat.category}</h4>
                <ul className="space-y-2">
                  {cat.metrics.map((metric) => {
                    const [name, ...desc] = metric.split(' — ');
                    return (
                      <li key={metric} className="flex items-start gap-2 text-sm">
                        <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <div>
                          <code className="font-mono text-xs text-gray-800 dark:text-gray-200">{name}</code>
                          {desc.length > 0 && (
                            <span className="text-gray-500 dark:text-gray-400"> — {desc.join(' — ')}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* INFRASTRUCTURE TAB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="infrastructure" className={activeTab === 'infrastructure' ? 'block' : 'hidden'}>
          <motion.h2
            className="text-3xl font-bold mb-4"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['infrastructure'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Infrastructure &amp; Deployment
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-3xl"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['infrastructure'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            A 7-service Docker Compose stack with health checks, dependency ordering, multi-stage builds,
            and a full observability pipeline — designed for local development and cloud deployment.
          </motion.p>

          {/* Infrastructure Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {INFRASTRUCTURE_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible['infrastructure'] ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{feature.description}</p>
                {feature.highlight && (
                  <span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold">
                    {feature.highlight}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Docker Services Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible['infrastructure'] ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-16"
          >
            <h3 className="text-2xl font-bold mb-6 dark:text-white">Docker Compose Services</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Technology</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Port</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {DOCKER_SERVICES.map((service) => (
                    <tr key={service.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-3">
                        <code className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{service.name}</code>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{service.tech}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{service.port}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Infrastructure Diagram */}
          <DiagramSection diagram={INFRA_DIAGRAM} isVisible={!!isVisible['infrastructure']} />
        </section>
      </main>

      {/* Footer CTA */}
      <section className="bg-linear-to-r from-emerald-900 via-teal-900 to-cyan-900 text-white py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Try Mistral Realms
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-emerald-100 mb-8"
          >
            Create a character, start an adventure, and experience AI-powered D&amp;D narration firsthand.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="https://realms.anguelz.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-emerald-900 font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
            >
              Play Now →
            </a>
            <a
              href="https://github.com/aouichou/Realms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200"
            >
              View on GitHub →
            </a>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200"
            >
              ← Back to Projects
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────

function CodeSection({ snippet, isVisible, delay = 0 }: { snippet: CodeSnippet; isVisible: boolean; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const previewLines = 25;
  const lines = snippet.code.split('\n');
  const needsExpand = lines.length > previewLines;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className="mb-12"
    >
      <h3 className="text-xl font-bold mb-2 dark:text-white">{snippet.title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{snippet.description}</p>
      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-2 bg-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-400">{snippet.language}</span>
          <span className="text-xs text-emerald-400">{lines.length} lines</span>
        </div>
        <div className={`relative ${!expanded && needsExpand ? 'max-h-150 overflow-hidden' : ''}`}>
          <SyntaxHighlighter
            language={snippet.language}
            style={oneDark as { [key: string]: React.CSSProperties }}
            customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}
            showLineNumbers
          >
            {expanded ? snippet.code : lines.slice(0, previewLines).join('\n')}
          </SyntaxHighlighter>
          {!expanded && needsExpand && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-gray-900 to-transparent flex items-end justify-center pb-3">
              <button
                onClick={() => { setExpanded(true); }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-medium transition-colors"
              >
                Show all {lines.length} lines
              </button>
            </div>
          )}
        </div>
        {expanded && needsExpand && (
          <div className="px-4 py-2 bg-gray-800 text-center">
            <button
              onClick={() => { setExpanded(false); }}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Collapse ↑
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-l-4 border-emerald-500">
        <p className="text-sm text-gray-700 dark:text-gray-300">{snippet.explanation}</p>
      </div>
    </motion.div>
  );
}

function DiagramSection({ diagram, isVisible }: { diagram: MermaidDiagram; isVisible: boolean }) {
  const { theme } = useTheme();
  const variant = theme === 'dark' ? 'dark' : 'light';
  const [mermaidFailed, setMermaidFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleMermaidError = useCallback(() => {
    setMermaidFailed(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mb-12"
    >
      <h3 className="text-2xl font-bold mb-2 dark:text-white">{diagram.title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{diagram.description}</p>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
        {!mermaidFailed ? (
          /* Primary: Mermaid with zoom/pan */
          <MermaidComponent chart={diagram.code} onError={handleMermaidError} />
        ) : diagram.imageSlug ? (
          /* Fallback: SVG image with click-to-lightbox */
          <div className="relative group">
            <button
              onClick={() => setLightboxOpen(true)}
              className="w-full cursor-zoom-in"
              aria-label={`View ${diagram.title} full size`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/diagrams/Realms/${diagram.imageSlug}-${variant}.svg`}
                alt={diagram.title}
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 dark:bg-black/20 rounded-lg">
                <span className="bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-md">
                  🔍 Click to enlarge
                </span>
              </div>
            </button>
          </div>
        ) : (
          /* Last resort: raw code */
          <pre className="text-xs overflow-auto p-4 bg-gray-50 dark:bg-gray-900 rounded">
            {diagram.code}
          </pre>
        )}
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {lightboxOpen && diagram.imageSlug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[95vw] max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-4 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="sticky top-0 float-right ml-2 mb-2 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <h4 className="text-lg font-semibold mb-3 dark:text-white">{diagram.title}</h4>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/diagrams/Realms/${diagram.imageSlug}-${variant}.svg`}
                alt={diagram.title}
                className="max-w-full h-auto"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
