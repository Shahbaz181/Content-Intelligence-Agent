export type Analytics={
  health:number|null; status:string; metricLabel?:string;
  memory:{strategic:number; audience:number; gaps:number};
  performance:{date:string; value:number}[];
  byType:{name:string; value:number}[];
  byPlatform:{name:string; value:number}[];
  top:string[]; weak:string[];
  synthetic?:boolean; dataSource?:"live"|"synthetic"|"mixed";
};
export type AgentResponse={recommendation:string; reasoning:string[]; format:string; memoriesUsed:number; relevantMemories?:string[]; learnedFromFeedback?:boolean};
export type MemoryNode={id:string; label:string; children?:MemoryNode[]; detail?:string[]; memoryCount?:number};
export type TimelineItem={month:string; text:string};
export type Brand={name:string; industry:string; tone:string; audience:string; platforms:string; goals:string; competitors:string; avoid:string; synthetic?:boolean};
export type ContentItem={title:string; platform:string; format:string; date:string; performance:string; saves?:number; comments?:number; clicks?:number; synthetic?:boolean};
export type PlanItem={day:string; format?:string; topic:string; platform?:string; reasoning:string};
export type GeneratedContent={content:string;source:"groq"|"hindsight-reflect";memoriesUsed:number;relevantMemories:string[]};
