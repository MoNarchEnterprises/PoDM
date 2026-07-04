import { useState, useEffect, useCallback } from 'react';
import { knowledgeGraph, type DashboardStats, type SearchResult } from '../services/knowledgeGraph';
import type { KnowledgeGraph, Module, Service, Entity, Route, Page, Component, Workflow, Diagram, Relationship, ExternalSystem, Event, Queue, Agent } from '../types';

export function useKnowledgeGraph() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!knowledgeGraph.isLoaded()) {
      knowledgeGraph.load()
        .then(() => setLoaded(true))
        .catch((e) => setError(e.message));
    } else {
      setLoaded(true);
    }
  }, []);

  const getStats = useCallback((): DashboardStats => knowledgeGraph.getDashboardStats(), [loaded]);
  const searchAll = useCallback((q: string): SearchResult[] => knowledgeGraph.searchAll(q), [loaded]);

  return {
    loaded,
    error,
    kg: knowledgeGraph,
    getStats,
    searchAll,
    findModule: knowledgeGraph.findModule.bind(knowledgeGraph),
    findService: knowledgeGraph.findService.bind(knowledgeGraph),
    findEntity: knowledgeGraph.findEntity.bind(knowledgeGraph),
    findRoute: knowledgeGraph.findRoute.bind(knowledgeGraph),
    findPage: knowledgeGraph.findPage.bind(knowledgeGraph),
    findComponent: knowledgeGraph.findComponent.bind(knowledgeGraph),
    findWorkflow: knowledgeGraph.findWorkflow.bind(knowledgeGraph),
    findDiagram: knowledgeGraph.findDiagram.bind(knowledgeGraph),
    findEvent: knowledgeGraph.findEvent.bind(knowledgeGraph),
    findAgent: knowledgeGraph.findAgent.bind(knowledgeGraph),
    findExternalSystem: knowledgeGraph.findExternalSystem.bind(knowledgeGraph),
    getDependencies: knowledgeGraph.getDependencies.bind(knowledgeGraph),
    getDependents: knowledgeGraph.getDependents.bind(knowledgeGraph),
    getModuleDiagrams: knowledgeGraph.getModuleDiagrams.bind(knowledgeGraph),
    getModuleWorkflows: knowledgeGraph.getModuleWorkflows.bind(knowledgeGraph),
    getModuleServices: knowledgeGraph.getModuleServices.bind(knowledgeGraph),
    getModuleEntities: knowledgeGraph.getModuleEntities.bind(knowledgeGraph),
    getModuleRoutes: knowledgeGraph.getModuleRoutes.bind(knowledgeGraph),
    getByCategory: knowledgeGraph.getByCategory.bind(knowledgeGraph),
  };
}
