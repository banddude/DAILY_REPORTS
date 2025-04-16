# Market Pricing Strategy

This document outlines the proposed pricing strategy for the Job Site Reporter application, considering costs, target users, market landscape, and value proposition.

## 1. Target User Profile

Based on initial research into users of construction reporting and management software, the primary target users for this application are:

*   **Roles:**
    *   General Contractors (GCs)
    *   Project Managers (PMs)
    *   Site Superintendents / Foremen
    *   Specialty Contractors (e.g., electrical, plumbing, concrete leads)
*   **Company Size:** Small to Mid-Sized construction companies or independent contractors.
*   **Needs:**
    *   Efficient documentation of site progress, safety conditions, or work performed.
    *   Easy way to generate reports from site observations (currently video).
    *   Improved communication and record-keeping.
    *   Potential reduction in time spent on manual reporting.
*   **Technical Proficiency:** Likely comfortable using mobile apps but may not be experts in complex software.

## 2. Competitor & Market Analysis

Research into related software categories reveals the following:

*   **Construction Field Reporting Apps (e.g., Raken, PlanRadar, Fieldwire):**
    *   **Pricing Model:** Predominantly **per user, per month**.
    *   **Tiers:** Often include a free tier or trial with significant limitations (users, projects, features). Paid tiers range from ~$30-$100+ per user/month, scaling with features (custom forms, advanced reporting, integrations, BIM, specific workflows like RFIs/submittals).
    *   **Core Features:** Focus on manual daily logs, task management, photo/document management, checklists, time tracking. Our AI video input is a key differentiator.
    *   **Examples:** Fieldwire (starts free, paid $39-$89+/user/mo), PlanRadar (starts $32+/user/mo), ConstructionDailyReports ($30/user/mo).
*   **AI Video Summary Tools (e.g., NoteGPT, ScreenApp):**
    *   **Pricing Model:** Often freemium, with paid tiers based on usage (minutes/videos processed) or features.
    *   **Tiers:** Paid plans typically range from $5-$20+ per user/month.
    *   **Core Features:** Video transcription, key point extraction, summarization. Lack construction-specific context, reporting formats, or project management features.

**Key Positioning:** Our app sits between generic AI tools and traditional construction reporting apps. We offer the convenience of AI processing applied specifically to the construction reporting use case. Pricing needs to reflect the AI processing costs while being competitive within the construction software market.

## 3. Value Proposition

The primary value delivered to users (GCs, PMs, Superintendents, Foremen) includes:

*   **Time Savings:** Drastically reduces time spent manually writing daily reports, progress logs, or safety summaries. Users can capture video and let the AI generate the initial draft.
*   **Improved Accuracy & Detail:** AI can potentially capture details from video that might be missed in manual note-taking or recall later. Provides timestamps and visual context linkage (video frames).
*   **Enhanced Documentation:** Creates consistent, structured reports backed by video evidence. Useful for progress tracking, dispute resolution, compliance, and handover.
*   **Ease of Use:** Simplifies the reporting process, especially for field staff who may prefer quick video capture over typing detailed notes on a mobile device.
*   **Cost Efficiency (Potential):** Reduces labor hours spent on reporting tasks, potentially freeing up skilled personnel for other site duties.
*   **Faster Information Flow:** Enables quicker generation and sharing of site status updates compared to end-of-day manual reporting.

## 4. Proposed Pricing Model (Revised Draft v2)

Based on significant AI processing costs, S3 costs, competitive landscape, and user feedback on target price points, a freemium model is proposed. Pricing is per user, per month (billed annually for discount). This version targets $5/mo for ~daily use and $25/mo for high-volume professional use.

**A. Free Tier (`Starter`)**

*   **Goal:** User acquisition, demonstrate core value, funnel to paid.
*   **Price:** $0
*   **Limits:**
    *   Up to **5 reports** per user per month.
    *   Max **1 minute** video length per report.
    *   Uses **`gpt-4.1-nano`** model only.
    *   Reports stored for **7 days**.
    *   Basic report template.
    *   Possible subtle watermark on generated reports.
*   **Target:** Individuals, very small teams trying the app.

**B. Lite Tier (`Daily`)**

*   **Goal:** Offer a low-cost entry point for users needing roughly one report per day.
*   **Price:** **~$5 / user / month** (billed annually, ~$7 monthly)
    *   *Rationale:* Provides an accessible paid option for light, consistent use.
*   **Limits/Features:**
    *   Up to **30 reports** per user per month (~1 per day).
    *   Max **2 minute** video length per report.
    *   Uses **`gpt-4.1-nano`** model only.
    *   Reports stored for **30 days**.
    *   Basic report template + Photo attachments.
    *   No watermark.
    *   Email support.
*   **Target:** Individuals or field staff needing simple daily reporting.

**C. Pro Tier (`Professional`)**

*   **Goal:** Serve core target users (PMs, Superintendents, GCs/Subs) needing high volume, flexibility, and advanced features.
*   **Price:** **~$25 / user / month** (billed annually, ~$30 monthly)
    *   *Rationale:* Provides significant value increase over Lite tier, competitive with mid-range construction tools, covers costs for high volume & features.
*   **Limits/Features:**
    *   Up to **200 reports** per user per month (~7-9 per workday).
    *   Max **10 minute** video length per report.
    *   Choice of any model (**`nano`**, **`mini`**, or **`4.1`**).
    *   Reports stored for **5 years** (or longer, configurable).
    *   Advanced report customization & branding.
    *   Team collaboration features (shared projects, user roles).
    *   Advanced search & analytics.
    *   Priority support.
    *   Potential integrations (e.g., Procore, Autodesk - future).
*   **Target:** Active project managers, superintendents, companies managing multiple projects/teams.

**D. Enterprise Tier**

*   **Goal:** Custom solutions for large organizations.
*   **Price:** Contact Sales (Custom pricing based on volume, features, support, SSO, etc.)
*   **Features:** Unlimited reports (within fair use/technical limits), custom model options, advanced security/compliance, dedicated support, API access, custom integrations.

**Further Considerations:**

*   **Overage:** Define policy for exceeding report limits on paid tiers (e.g., purchase extra report packs, auto-upgrade warning). Especially important for the Lite tier.
*   **Video Minutes vs. Reports:** Report count is simpler for users, but monitoring average video length per tier will be important for cost management.
*   **Initial Discounting:** Offer introductory pricing for early adopters, especially for Lite/Pro tiers.
*   **Iterative Pricing:** This is a starting point. Monitor usage, costs (especially AI/S3), user feedback, and competitor moves to adjust pricing and tiers over time. 