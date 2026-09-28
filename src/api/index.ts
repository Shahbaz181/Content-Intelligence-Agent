import {api} from "./client";
import type {AgentResponse,Analytics,Brand,ContentItem,GeneratedContent,MemoryNode,TimelineItem,PlanItem} from "../types";

export const getAnalytics=()=>api.get<Analytics>("/analytics").then(r=>r.data);
export const getBrand=()=>api.get<Brand>("/brand").then(r=>r.data);
export const saveBrand=(data:Brand)=>api.post("/brand",data).then(r=>r.data);
export const getContent=()=>api.get<ContentItem[]>("/content").then(r=>r.data);
export const ingestContent=(data:FormData)=>api.post("/content/ingest",data).then(r=>r.data);
export const askAgent=(question:string)=>api.post<AgentResponse>("/agent/ask",{question}).then(r=>r.data);
export const submitFeedback=(text:string)=>api.post<{success:boolean;feedbackId:string;memoryId:string}>("/content/feedback",{text}).then(r=>r.data);
export const getMemoryExplorer=()=>api.get<MemoryNode[]>("/memory/explorer").then(r=>r.data);
export const getTimeline=()=>api.get<TimelineItem[]>("/memory/timeline").then(r=>r.data);
export const getPlan=()=>api.get<PlanItem[]>("/content/plan").then(r=>r.data);
export const savePlan=(items:PlanItem[])=>api.post<PlanItem[]>("/content/plan",{items}).then(r=>r.data);
export const generateContent=(slot:PlanItem)=>api.post<GeneratedContent>("/content/generate",slot).then(r=>r.data);
