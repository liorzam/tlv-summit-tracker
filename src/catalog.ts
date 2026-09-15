export type CatalogItem = { id: string; title: string; track: string };

export const CATALOG: { track: string; items: [string, string][] }[] = [
  { track: "Keynote", items: [
    ["tlv-key101", "Keynote"],
  ]},
  { track: "AWS for Developers in the AI Era", items: [
    ["tlv-dvt201", "Reimagine Productivity: How Amazon Quick Transforms the Way You Work"],
    ["tlv-dvt202", "Building software like never before with agentic AI"],
    ["tlv-dvt203", "AI-DLC in Practice: Methodology, Metrics & Lessons From the Field"],
    ["tlv-dvt301", "Beyond Vibe Coding: 5 rules learned from 1000+ hours of agentic coding"],
  ]},
  { track: "Building AI and Agentic Applications", items: [
    ["tlv-aim201", "Building Production-Grade AI Applications with Amazon Bedrock"],
    ["tlv-aim202", "Introduction to Building and Running Agentic Applications on AWS"],
    ["tlv-aim301", "Best Practices for Agentic Applications"],
    ["tlv-aim302", "Scaling AI: Optimization, Observability & Evaluation"],
  ]},
  { track: "AWS for Containers and Platform Engineering", items: [
    ["tlv-svs301", "Amazon EKS Auto Mode and Karpenter: Simplifying Kubernetes operations"],
    ["tlv-svs303", "Generative and Agentic AI on Amazon EKS"],
    ["tlv-svs304", "Simplify Applications with Amazon ECS Managed Instances & Express Mode"],
    ["tlv-svs305", "vLLM on AWS: testing to production and everything in between"],
    ["tlv-svs306", "Simplify your Kubernetes journey with Amazon EKS Capabilities"],
    ["tlv-svs401", "Resilience at Scale on Amazon EKS: Networking, Security, and Compute"],
  ]},
  { track: "AWS For Data and Analytics", items: [
    ["tlv-ant201", "Harnessing data and analytics for humans and AI"],
    ["tlv-ant302", "How Streaming Enables AI Agents: Key Design Patterns"],
    ["tlv-ant303", "Building cost-effective data lakes with Apache Iceberg and Amazon S3"],
    ["tlv-ant304", "Transforming AI storage with Amazon S3 Vectors and Amazon OpenSearch"],
    ["tlv-ant305", "Amazon SageMaker: Multi-Engine Analytics on a Governed Platform"],
    ["tlv-ant306", "Agentic Lakehouse: Automating Data Engineering on AWS"],
  ]},
  { track: "Databases on AWS", items: [
    ["tlv-dat202", "NoSQL on AWS: How to choose the right database for your workload"],
    ["tlv-dat306", "Beyond the SQL vs. NoSQL Trade-off: Modern Apps on Aurora DSQL"],
    ["tlv-dat307", "A practitioner's guide to data for agentic AI"],
    ["tlv-dat308", "Amazon ElastiCache for Valkey - more than a cache"],
    ["tlv-dat309", "Amazon Neptune & GraphRAG in Action: Knowledge Graphs Meet AgTech"],
    ["tlv-dat310", "Amazon Aurora HA and DR design patterns for global resilience"],
  ]},
  { track: "Architecting on AWS", items: [
    ["tlv-arc301", "Build, deploy, and operate agentic applications on AWS Serverless"],
    ["tlv-arc302", "Cell-based architecture: Scalable and Resilient Patterns"],
    ["tlv-arc303", "Designing resilient Serverless Applications"],
    ["tlv-arc304", "Stateless Compute, Stateful Systems: Architecting Durable Workflows"],
    ["tlv-arc305", "Your New Engineering Team: Agentic Coding from IDE to Autonomy"],
    ["tlv-arc401", "Building multi-tenant SaaS agents with Amazon Bedrock AgentCore"],
  ]},
  { track: "AWS AI Cloud Ops, Infrastructure & Security", items: [
    ["tlv-sec301", "Building Secure-by-Design AI Agents at Scale"],
    ["tlv-sec302", "Move beyond reactive: Transform cloud ops with AWS DevOps Agent"],
    ["tlv-sec303", "AWS Security Agent: Proactive AppSec from Design to Deployment"],
    ["tlv-sec304", "AI Agent Observability"],
    ["tlv-sec305", "NVIDIA Nemotron in Production: Deploy, Secure & Scale on Amazon Bedrock"],
  ]},
  { track: "AWS Demos", items: [
    ["tlv-dem301", "The Hidden Network Costs of AI Agents on EKS"],
    ["tlv-dem302", "Apache Iceberg at Scale: Manage Tabular Data Using Amazon S3 Tables"],
    ["tlv-dem303", "AgentCore Policy: Secure and Govern AI Agent Tool Access"],
    ["tlv-dem304", "Agents at Scale: Building Multi-Agent Systems with Bedrock AgentCore"],
    ["tlv-dem305", "LLM Inference on Trainium with vLLM & PyTorch Native"],
    ["tlv-dem306", "Stop Coding: Let AI Agents Take You from Idea to Production"],
    ["tlv-dem307", "The SOC That Never Sleeps: Real-time Voice AI Security Automation"],
    ["tlv-dem308", "Amazon Quick: Empowering the Modern Knowledge Worker"],
    ["tlv-dem309", "Prodo-typing: Rapid Prototyping on AWS with FullStack Builder Agents"],
    ["tlv-dem310", "Track GenAI Spend for Apps, Developers, and Agents on AWS"],
  ]},
];

export const ALL_ITEMS: CatalogItem[] = CATALOG.flatMap((t) =>
  t.items.map(([id, title]) => ({ id, title, track: t.track }))
);
