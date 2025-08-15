import { AnalysisReport } from '../types';

export const sampleReportForTour: AnalysisReport = {
  id: 'tour-report-1',
  workspaceId: 'tour-ws-1',
  createdAt: new Date().toISOString(),
  title: "Sample Project: Digital Wallet Expansion",
  resilienceScore: 68,
  summary: {
    critical: 1,
    warning: 2,
    checks: 1258,
  },
  documentContent: `
Project Plan: Digital Wallet Expansion

1. Introduction
This project aims to expand our digital wallet services to include international remittances. The target launch is Q4 2025.

2. Data Handling
User data will be collected during onboarding. We will store user data, including name and transaction history, on our servers. All data transmission will use standard encryption.

3. Third-Party Integrations
We will partner with three international payment gateways. These partners will process transactions on our behalf. Their security protocols will be reviewed annually.

4. User Consent
Users will agree to our terms of service during sign-up.

5. Security Measures
Our existing security infrastructure will be sufficient for this expansion.
`,
  findings: [
    {
      id: 'tour-finding-1',
      title: 'No explicit consent mechanism for data collection',
      severity: 'critical',
      sourceSnippet: 'Users will agree to our terms of service during sign-up.',
      recommendation: 'The Data Privacy Act (RA 10173) requires explicit, informed consent. Update the onboarding flow to include a separate, unticked checkbox for users to consent to the collection and processing of their personal data, with a clear link to the privacy policy.',
      status: 'active',
    },
    {
      id: 'tour-finding-2',
      title: 'Vague security statement for a major expansion',
      severity: 'warning',
      sourceSnippet: 'Our existing security infrastructure will be sufficient for this expansion.',
      recommendation: 'This statement is too generic. Conduct a formal risk assessment for the new remittance service. The plan should detail specific security upgrades, such as enhanced fraud detection systems and compliance with BSP regulations for electronic payments.',
      status: 'active',
    },
    {
      id: 'tour-finding-3',
      title: 'Annual review for partners may be insufficient',
      severity: 'warning',
      sourceSnippet: 'Their security protocols will be reviewed annually.',
      recommendation: 'For critical partners like payment gateways, consider a more frequent review cycle (e.g., semi-annually) and implement real-time monitoring of their API security and performance to mitigate supply chain risks.',
      status: 'active',
    },
  ],
};