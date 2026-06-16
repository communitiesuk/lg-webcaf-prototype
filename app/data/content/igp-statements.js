// CAF V3.2 IGP statements for all contributing outcomes.
// Source: Cyber Assessment Framework V3.2 (April 2024).

const statements = {

  // --- Objective A: Managing security risk ---

  A1a: {
    achieved: [
      { id: "policy-owned-board", statement: "Your organisation's approach and policy relating to the security of network and information systems supporting the operation of essential function(s) are owned and managed at board-level. These are communicated, in a meaningful way, to risk management decision-makers across the organisation." },
      { id: "regular-board-discussions", statement: "Regular board-level discussions on the security of network and information systems supporting the operation of your essential function(s) take place, based on timely and accurate information and informed by expert guidance." },
      { id: "board-accountable-individual", statement: "There is a board-level individual who has overall accountability for the security of network and information systems and drives regular discussion at board-level." },
      { id: "direction-translated", statement: "Direction set at board-level is translated into effective organisational practices that direct and control the security of the network and information systems supporting your essential function(s)." },
    ],
    notAchieved: [
      { id: "not-reported-regularly", statement: "The security of network and information systems related to the operation of essential function(s) is not discussed or reported on regularly at board-level." },
      { id: "partial-out-of-date-info", statement: "Board-level discussions on the security of network and information systems are based on partial or out-of-date information, without the benefit of expert guidance." },
      { id: "direction-not-effective", statement: "The security of network and information systems supporting your essential function(s) are not driven effectively by the direction set at board-level." },
      { id: "senior-management-exempt", statement: "Senior management or other pockets of the organisation consider themselves exempt from some policies or expect special accommodations to be made." },
    ],
    partiallyAchieved: [
      { id: "board-informed", statement: "The board has the information and understanding needed to effectively discuss how the security and resilience of network and information systems contributes to the delivery of essential function(s)." },
      { id: "security-recognised-enabler", statement: "Security is recognised as an important enabler for the resilience of your essential function(s) and considered in all relevant discussions." },
    ],
  },

  A1b: {
    achieved: [
      { id: "roles-defined", statement: "Key roles and responsibilities for the security of network and information systems supporting your essential function(s) have been identified. These are reviewed regularly to ensure they remain fit for purpose." },
      { id: "capable-staff", statement: "Appropriately capable and knowledgeable staff fill those roles and are given the time, authority, and resources to carry out their duties." },
      { id: "accountability-clear", statement: "There is clarity on who in your organisation has overall accountability for the security of the network and information systems supporting your essential function(s)." },
    ],
    notAchieved: [
      { id: "key-roles-missing", statement: "Key roles are missing, left vacant, or fulfilled on an ad-hoc or informal basis." },
      { id: "no-authority-or-resources", statement: "Staff are assigned security responsibilities but without adequate authority or resources to fulfil them." },
      { id: "staff-unsure-responsibilities", statement: "Staff are unsure what their responsibilities are for the security of the essential function(s)." },
    ],
    partiallyAchieved: [
      { id: "roles-exist-not-resourced", statement: "Key security roles exist but may not be fully resourced or empowered to act effectively." },
      { id: "inconsistent-awareness", statement: "Some staff are aware of their security responsibilities but this awareness is inconsistent across the organisation." },
      { id: "partial-coverage", statement: "Roles and responsibilities are defined for some areas but may not cover all systems supporting essential functions." },
    ],
  },

  A1c: {
    achieved: [
      { id: "senior-visibility", statement: "Senior management have visibility of key risk decisions made throughout the organisation." },
      { id: "decision-makers-understand-appetite", statement: "Risk management decision-makers understand their responsibilities for making effective and timely decisions in the context of the risk appetite regarding the essential function(s), as set by senior management." },
      { id: "delegated-escalated", statement: "Risk management decision-making is delegated and escalated where necessary, across the organisation, to people who have the skills, knowledge, tools and authority they need." },
      { id: "decisions-regularly-reviewed", statement: "Risk management decisions are regularly reviewed to ensure their continued relevance and validity." },
    ],
    notAchieved: [
      { id: "decisions-referred-up", statement: "What should be relatively straightforward risk decisions are constantly referred up the chain, or not made." },
      { id: "risks-resolved-informally", statement: "Risks are resolved informally (or ignored) at a local level when the use of a more formal risk reporting mechanism would be more appropriate." },
      { id: "appetite-unclear", statement: "Decision-makers are unsure of what senior management's risk appetite is, or only understand it in vague terms such as 'averse' or 'cautious'." },
      { id: "decisions-in-isolation", statement: "Organisational structure causes risk decisions to be made in isolation (e.g. engineering and IT don't talk to each other about risk)." },
      { id: "priorities-too-vague", statement: "Risk priorities are too vague to make meaningful distinctions between them (e.g. almost all risks are rated 'medium' or 'amber')." },
    ],
    partiallyAchieved: [],
  },

  A2a: {
    achieved: [
      { id: "risks-identified-managed", statement: "Your organisational process ensures that security risks to network and information systems relevant to essential function(s) are identified, analysed, prioritised, and managed." },
      { id: "risk-focused-on-impact", statement: "Your approach to risk is focused on the possibility of adverse impact to your essential function(s), leading to a detailed understanding of how such impact might arise as a consequence of possible attacker actions." },
      { id: "threat-assumptions-clear", statement: "Your risk assessments are based on a clearly understood set of threat assumptions, informed by an up-to-date understanding of security threats to your essential function(s) and your sector." },
      { id: "vulnerabilities-understood", statement: "Your risk assessments are informed by an understanding of the vulnerabilities in the network and information systems supporting your essential function(s)." },
      { id: "clear-security-requirements", statement: "The output from your risk management process is a clear set of security requirements that will address the risks in line with your organisational approach to security." },
      { id: "conclusions-communicated", statement: "Significant conclusions reached in the course of your risk management process are communicated to key security decision-makers and accountable individuals." },
      { id: "dynamic-risk-assessments", statement: "Your risk assessments are dynamic and updated in the light of relevant changes which may include technical changes to network and information systems, change of use and new threat information." },
      { id: "process-reviewed-regularly", statement: "The effectiveness of your risk management process is reviewed regularly, and improvements made as required." },
      { id: "detailed-threat-analysis", statement: "You perform detailed threat analysis and understand how this applies to your organisation in the context of the threat to your sector and the wider CNI." },
    ],
    notAchieved: [
      { id: "not-threat-based", statement: "Risk assessments are not based on a clearly defined set of threat assumptions." },
      { id: "outputs-too-complex", statement: "Risk assessment outputs are too complex or unwieldy to be consumed by decision-makers and are not effectively communicated in a clear and timely manner." },
      { id: "one-off-or-not-done", statement: "Risk assessments for network and information systems supporting your essential function(s) are a 'one-off' activity or not done at all." },
      { id: "process-not-systematic", statement: "There is no systematic process in place to ensure that identified security risks are managed effectively." },
      { id: "systems-in-isolation", statement: "Systems are assessed in isolation, without consideration of dependencies and interactions with other systems." },
      { id: "mitigations-arbitrary", statement: "Security requirements and mitigations are arbitrary or are applied from a control catalogue without consideration of how they contribute to the security of the essential function(s)." },
      { id: "risks-unresolved-on-register", statement: "Risks remain unresolved on a register for prolonged periods of time awaiting senior decision-making or resource allocation to resolve." },
    ],
    partiallyAchieved: [
      { id: "partial-risks-managed", statement: "Your organisational process ensures that security risks to network and information systems relevant to essential function(s) are identified, analysed, prioritised, and managed." },
      { id: "partial-vulnerabilities-understood", statement: "Your risk assessments are informed by an understanding of the vulnerabilities in the network and information systems supporting your essential function(s)." },
      { id: "partial-clear-requirements", statement: "The output from your risk management process is a clear set of security requirements that will address the risks in line with your organisational approach to security." },
      { id: "partial-conclusions-communicated", statement: "Significant conclusions reached in the course of your risk management process are communicated to key security decision-makers and accountable individuals." },
      { id: "assessments-on-significant-events", statement: "You conduct risk assessments when significant events potentially affect the essential function(s), such as replacing a system or a change in the cyber security threat." },
      { id: "generic-threat-analysis", statement: "You perform threat analysis and understand how generic threats apply to your organisation." },
    ],
  },

  A2b: {
    achieved: [
      { id: "measures-validated", statement: "You validate that the security measures in place to protect the network and information systems are effective and remain effective for the lifetime over which they are needed." },
      { id: "appropriate-methods-chosen", statement: "You understand the assurance methods available to you and choose appropriate methods to gain confidence in the security of essential function(s)." },
      { id: "justifiable-to-third-party", statement: "Your confidence in the security as it relates to your technology, people, and processes can be justified to, and verified by, a third party." },
      { id: "deficiencies-remedied", statement: "Security deficiencies uncovered by assurance activities are assessed, prioritised and remedied when necessary in a timely and effective way." },
      { id: "methods-reviewed", statement: "The methods used for assurance are reviewed to ensure they are working as intended and remain the most appropriate method to use." },
    ],
    notAchieved: [
      { id: "silver-bullet", statement: "A particular product or service is seen as a 'silver bullet' and vendor claims are taken at face value." },
      { id: "methods-without-understanding", statement: "Assurance methods are applied without appreciation of their strengths and limitations, such as the risks of penetration testing in operational environments." },
      { id: "assumed-because-no-problems", statement: "Assurance is assumed because there have been no known problems to date." },
    ],
    partiallyAchieved: [],
  },

  A3a: {
    achieved: [
      { id: "assets-inventoried", statement: "All assets relevant to the secure operation of essential function(s) are identified and inventoried (at a suitable level of detail). The inventory is kept up-to-date." },
      { id: "infrastructure-dependencies", statement: "Dependencies on supporting infrastructure (e.g. power, cooling etc) are recognised and recorded." },
      { id: "assets-prioritised", statement: "You have prioritised your assets according to their importance to the operation of the essential function(s)." },
      { id: "responsibility-assigned", statement: "You have assigned responsibility for managing all assets, including physical assets, relevant to the operation of the essential function(s)." },
      { id: "lifecycle-managed", statement: "Assets relevant to the essential function(s) are managed with cyber security in mind throughout their lifecycle, from creation through to eventual decommissioning or disposal." },
    ],
    notAchieved: [
      { id: "inventory-incomplete", statement: "Inventories of assets relevant to the essential function(s) are incomplete, non-existent, or inadequately detailed." },
      { id: "only-some-assets-documented", statement: "Only certain domains or types of asset are documented and understood. Dependencies between assets are not understood (such as the dependencies between IT and OT)." },
      { id: "data-retained-unnecessarily", statement: "Information assets are stored for long periods of time with no clear business need or retention policy." },
      { id: "knowledge-held-by-few", statement: "Knowledge critical to the management, operation, or recovery of the essential function(s) is held by one or two key individuals with no succession plan." },
      { id: "inventory-out-of-date", statement: "Asset inventories are neglected and out of date." },
    ],
    partiallyAchieved: [],
  },

  A4a: {
    achieved: [
      { id: "deep-supply-chain-understanding", statement: "You have a deep understanding of your supply chain, including sub-contractors and the wider risks it faces. You consider factors such as supplier's partnerships, competitors, nationality and other organisations with which they sub-contract." },
      { id: "supply-chain-subversion-considered", statement: "Your approach to supply chain risk management considers the risks to your essential function(s) arising from supply chain subversion by capable and well-resourced attackers." },
      { id: "sophisticated-attack-protection", statement: "You have confidence that information shared with suppliers that is essential to the operation of your function(s) is appropriately protected from sophisticated attacks." },
      { id: "contracts-with-obligations", statement: "You understand which contracts are relevant and include appropriate security obligations in relevant contracts. You have a proactive approach to contract management." },
      { id: "customer-supplier-responsibilities", statement: "Customer/supplier ownership of responsibilities is laid out in contracts." },
      { id: "third-party-connections-managed", statement: "All network connections and data sharing with third parties are managed effectively and proportionately." },
      { id: "mutual-incident-support", statement: "When appropriate, your incident management process and that of your suppliers provide mutual support in the resolution of incidents." },
    ],
    notAchieved: [
      { id: "data-held-by-suppliers-unknown", statement: "You do not know what data belonging to you is held by suppliers, or how it is managed." },
      { id: "subcontractors-not-visible", statement: "Elements of the supply chain for essential function(s) are subcontracted and you have little or no visibility of the sub-contractors." },
      { id: "contracts-not-relevant", statement: "You have no understanding of which contracts are relevant and/or relevant contracts do not specify appropriate security obligations." },
      { id: "supplier-access-unrestricted", statement: "Suppliers have access to systems that provide your essential function(s) that is unrestricted, not monitored or bypasses your own security controls." },
    ],
    partiallyAchieved: [
      { id: "general-risks-understood", statement: "You understand the general risks suppliers may pose to your essential function(s)." },
      { id: "supply-chain-extent-known", statement: "You know the extent of your supply chain that supports your essential function(s), including sub-contractors." },
      { id: "contracts-with-obligations-partial", statement: "You understand which contracts are relevant and include appropriate security obligations in relevant contracts." },
      { id: "third-party-connections-aware", statement: "You are aware of all third-party connections and have assurance that they meet your organisation's security requirements." },
      { id: "incident-management-considers-supply-chain", statement: "Your approach to security incident management considers incidents that might arise in your supply chain." },
      { id: "basic-attack-protection", statement: "You have confidence that information shared with suppliers is appropriately protected from well-known attacks and known vulnerabilities." },
    ],
  },

  // --- Objective B: Protecting against cyber attack ---

  B1a: {
    achieved: [
      { id: "fully-documented-governance", statement: "You fully document your overarching security governance and risk management approach, technical security practice and specific regulatory compliance." },
      { id: "security-embedded", statement: "Cyber security is integrated and embedded throughout policies, processes and procedures and key performance indicators are reported to your executive management." },
      { id: "practical-and-appropriate", statement: "Your organisation's policies, processes and procedures are developed to be practical, usable and appropriate for your essential function(s) and your technologies." },
      { id: "user-behaviour-achievable", statement: "Policies, processes and procedures that rely on user behaviour are practical, appropriate and achievable." },
      { id: "regular-review", statement: "You review and update policies, processes and procedures at suitably regular intervals to ensure they remain relevant. This is in addition to reviews following a major cyber security incident." },
      { id: "changes-trigger-review", statement: "Any changes to the essential function(s) or the threat it faces triggers a review of policies, processes and procedures." },
      { id: "secure-without-user-compliance", statement: "Your systems are designed so that they remain secure even when user security policies, processes and procedures are not always followed." },
    ],
    notAchieved: [
      { id: "absent-or-incomplete", statement: "Your policies, processes and procedures are absent or incomplete." },
      { id: "not-applied-consistently", statement: "Policies, processes and procedures are not applied universally or consistently." },
      { id: "routinely-circumvented", statement: "People often or routinely circumvent policies, processes and procedures to achieve business objectives." },
      { id: "no-governance-bearing", statement: "Your organisation's security governance and risk management approach has no bearing on your policies, processes and procedures." },
      { id: "totally-reliant-on-users", statement: "System security is totally reliant on users' careful and consistent application of manual security processes." },
      { id: "not-reviewed", statement: "Policies, processes and procedures have not been reviewed in response to major changes (e.g. technology or regulatory framework), or within a suitable period." },
      { id: "not-accessible", statement: "Policies, processes and procedures are not readily available to staff, too detailed to remember, or too hard to understand." },
    ],
    partiallyAchieved: [
      { id: "documents-governance", statement: "Your policies, processes and procedures document your overarching security governance and risk management approach, technical security practice and specific regulatory compliance." },
      { id: "reviewed-after-incidents", statement: "You review and update policies, processes and procedures in response to major cyber security incidents." },
    ],
  },

  B1b: {
    achieved: [
      { id: "all-followed-evaluated", statement: "All your policies, processes and procedures are followed; their correct application and security effectiveness is evaluated." },
      { id: "integrated-with-hr", statement: "Your policies, processes and procedures are integrated with other organisational policies, processes and procedures, including HR assessments of individuals' trustworthiness." },
      { id: "effectively-communicated", statement: "Your policies, processes and procedures are effectively and appropriately communicated across all levels of the organisation resulting in good staff awareness of their responsibilities." },
      { id: "all-breaches-addressed", statement: "Appropriate action is taken to address all breaches of policies, processes and procedures with potential to adversely impact the essential function(s) including aggregated breaches." },
    ],
    notAchieved: [
      { id: "ignored-or-partially-followed", statement: "Policies, processes and procedures are ignored or only partially followed." },
      { id: "resilience-not-understood", statement: "How your policies, processes and procedures support the resilience of your essential function(s) is not well understood." },
      { id: "staff-unaware", statement: "Staff are unaware of their responsibilities under your policies, processes and procedures." },
      { id: "breaches-not-detected", statement: "You do not attempt to detect breaches of policies, processes and procedures." },
      { id: "not-integrated", statement: "Policies, processes and procedures lack integration with other organisational policies, processes and procedures." },
      { id: "not-communicated", statement: "Your policies, processes and procedures are not well communicated across your organisation." },
    ],
    partiallyAchieved: [
      { id: "most-followed-monitored", statement: "Most of your policies, processes and procedures are followed and their application is monitored." },
      { id: "integrated-partial", statement: "Your policies, processes and procedures are integrated with other organisational policies, processes and procedures, including HR assessments of individuals' trustworthiness." },
      { id: "all-staff-aware", statement: "All staff are aware of their responsibilities under your policies, processes and procedures." },
      { id: "critical-breaches-investigated", statement: "All breaches of policies, processes and procedures with the potential to adversely impact the essential function(s) are fully investigated. Other breaches are tracked and assessed for trends." },
    ],
  },

  B2a: {
    achieved: [
      { id: "high-confidence-identity", statement: "Your process of initial identity verification provides a high level of confidence of a user's identity profile before allowing access to network and information systems." },
      { id: "only-authorised-access", statement: "Only authorised and individually authenticated users can physically access and logically connect to the network or information systems on which your essential function(s) depends." },
      { id: "minimum-access", statement: "The number of authorised users and systems that have access to all your network and information systems is limited to the minimum necessary." },
      { id: "mfa-all-access", statement: "You use multi-factor authentication (MFA) for all user access, including remote access, to all network and information systems that operate or support your essential function(s)." },
      { id: "access-list-reviewed-6monthly", statement: "The list of users and systems with access is reviewed on a regular basis, at least every six months." },
      { id: "best-practice-auth", statement: "Your approach to authenticating users, devices and systems follows up to date best practice." },
    ],
    notAchieved: [
      { id: "weak-identity-verification", statement: "Initial identity verification is not robust enough to provide an acceptable level of confidence of a user's identity profile." },
      { id: "users-not-individually-identified", statement: "Authorised users and systems with access to networks or information systems on which your essential function(s) depends cannot be individually identified." },
      { id: "unauthorised-access-possible", statement: "Unauthorised individuals or devices can access your network or information systems on which your essential function(s) depends." },
      { id: "not-minimum-access", statement: "The number of authorised users and systems that have access to your network and information systems are not limited to the minimum necessary." },
      { id: "outdated-auth", statement: "Your approach to authenticating users, devices and systems does not follow up to date best practice." },
    ],
    partiallyAchieved: [
      { id: "reasonable-identity-confidence", statement: "Your process of initial identity verification is robust enough to provide a reasonable level of confidence of a user's identity profile before allowing an authorised user access." },
      { id: "all-users-individually-identified", statement: "All authorised users and systems with access to network or information systems are individually identified and authenticated." },
      { id: "minimum-access-partial", statement: "The number of authorised users and systems that have access to essential function(s) network and information systems is limited to the minimum necessary." },
      { id: "mfa-privileged", statement: "You use multi-factor authentication (MFA) for privileged access to all network and information systems that operate or support your essential function(s)." },
      { id: "remote-access-authenticated", statement: "You individually authenticate and authorise all remote access to all your network and information systems that support your essential function(s)." },
      { id: "access-list-reviewed-annually", statement: "The list of users and systems with access is reviewed on a regular basis, at least annually." },
    ],
  },

  B2b: {
    achieved: [
      { id: "paw-privileged-ops", statement: "All privileged operations performed on your network and information systems are conducted from highly trusted devices, such as Privileged Access Workstations, dedicated solely to those operations." },
      { id: "independent-third-party-assurance", statement: "You either obtain independent and professional assurance of the security of third-party devices or networks before they connect, or you only allow third-party devices dedicated to supporting your systems." },
      { id: "certificate-identity", statement: "You perform certificate-based device identity management and only allow known devices to access systems necessary for the operation of your essential function(s)." },
      { id: "regular-scans", statement: "You perform regular scans to detect unknown devices and investigate any findings." },
    ],
    notAchieved: [
      { id: "non-corporate-users", statement: "Users can connect to your network and information systems supporting your essential function(s) using devices that are not corporately owned and managed." },
      { id: "non-corporate-privileged", statement: "Privileged users can perform privileged operations from devices that are not corporately owned and managed." },
      { id: "no-third-party-assurance", statement: "You have not gained assurance in the security of any third-party devices or networks connected to your systems." },
      { id: "port-grants-access", statement: "Physically connecting a device to your network and information systems gives that device access without device or user authentication." },
    ],
    partiallyAchieved: [
      { id: "corporate-essential-only", statement: "Only corporately owned and managed devices can access your essential function(s) network and information systems." },
      { id: "corporate-privileged-ops", statement: "All privileged operations are performed from corporately owned and managed devices, with sufficient separation from standard user activities." },
      { id: "third-party-understood", statement: "You have sought to understand the security properties of third-party devices and networks before they can be connected to your systems. You have taken appropriate steps to mitigate any risks identified." },
      { id: "port-no-auto-access", statement: "The act of connecting to a network port or cable does not grant access to any systems." },
      { id: "unknown-device-detection", statement: "You are able to detect unknown devices being connected to your network and information systems and investigate such incidents." },
    ],
  },

  B2c: {
    achieved: [
      { id: "dedicated-accounts", statement: "Privileged user access to network and information systems is carried out from dedicated separate accounts that are closely monitored and managed." },
      { id: "time-bound-rights", statement: "The issuing of temporary, time-bound rights for privileged user access and/or external third-party support access is in place." },
      { id: "joiners-movers-leavers", statement: "Privileged user access rights are regularly reviewed and always updated as part of your joiners, movers and leavers process." },
      { id: "all-activity-recorded", statement: "All privileged user activity is routinely reviewed, validated and recorded for offline analysis and investigation." },
    ],
    notAchieved: [
      { id: "privileged-identities-unknown", statement: "The identities of the individuals with privileged access to network and information systems (infrastructure, platforms, software, configuration etc) are not known or not managed." },
      { id: "weak-auth-privileged", statement: "Privileged user access to network and information systems is via weak authentication mechanisms (e.g. only simple passwords)." },
      { id: "list-not-reviewed", statement: "The list of privileged users has not been reviewed recently (e.g. within the last 12 months)." },
      { id: "system-wide-access", statement: "Privileged user access is granted on a system-wide basis rather than by role or function(s)." },
      { id: "generic-accounts", statement: "Privileged user access to your essential function(s) is via generic, shared or default name accounts." },
      { id: "no-additional-controls-terminals", statement: "Where there are 'always on' terminals which can perform privileged actions (such as in a control room), there are no additional controls to ensure access is appropriately restricted." },
      { id: "no-role-separation", statement: "There is no logical separation between roles that an individual may have and hence the actions they perform (e.g. access to corporate email and privileged user actions)." },
    ],
    partiallyAchieved: [
      { id: "strong-auth-privileged", statement: "All privileged user access to network and information systems requires strong authentication, such as multi-factor (MFA)." },
      { id: "identities-known", statement: "The identities of the individuals with privileged access to network and information systems are known and managed. This includes third parties." },
      { id: "activity-annually-reviewed", statement: "Activity by privileged users is routinely reviewed and validated (e.g. at least annually)." },
      { id: "role-specific-access", statement: "Privileged users are only granted specific privileged user access rights which are essential to their business role or function." },
    ],
  },

  B2d: {
    achieved: [
      { id: "procedure-regularly-audited", statement: "You follow a robust procedure to verify each user and issue the minimum required access rights, and the application of the procedure is regularly audited." },
      { id: "reviewed-roles-and-regularly", statement: "User access rights are reviewed both when people change roles via your joiners, leavers and movers process and at regular intervals — at least annually." },
      { id: "all-access-logged", statement: "All user, device and systems access to the systems supporting the essential function(s) is logged and monitored." },
      { id: "logs-correlated", statement: "You regularly review access logs and correlate this data with other access records and expected activity." },
      { id: "unauthorised-attempts-alerted", statement: "Attempts by unauthorised users, devices or systems to connect to the systems supporting the essential function(s) are alerted, promptly assessed and investigated." },
    ],
    notAchieved: [
      { id: "excessive-access-rights", statement: "Greater access rights are granted than necessary." },
      { id: "identity-validation-not-done", statement: "Identity validation and requirement for access of a user, device or systems is not carried out." },
      { id: "rights-not-reviewed-on-role-change", statement: "User access rights are not reviewed when users change roles." },
      { id: "rights-active-after-leaving", statement: "User access rights remain active when users leave your organisation." },
      { id: "device-system-access-not-reviewed", statement: "Access rights granted to devices or systems to access other devices and systems are not reviewed on a regular basis (at least annually)." },
    ],
    partiallyAchieved: [
      { id: "robust-procedure-minimum-rights", statement: "You follow a robust procedure to verify each user and issue the minimum required access rights." },
      { id: "access-rights-regularly-revoked", statement: "You regularly review access rights and those no longer needed are revoked." },
      { id: "reviewed-on-role-change", statement: "User access rights are reviewed when users change roles via your joiners, leavers and movers process." },
      { id: "access-logged-not-correlated", statement: "All user, device and system access to the systems supporting the essential function(s) is logged and monitored, but it is not compared to other log data or access records." },
    ],
  },

  B3a: {
    achieved: [
      { id: "data-catalogued", statement: "You have identified and catalogued all the data important to the operation of the essential function(s), or that would assist an attacker." },
      { id: "access-catalogued", statement: "You have identified and catalogued who has access to the data important to the operation of the essential function(s)." },
      { id: "current-data-understanding", statement: "You maintain a current understanding of the location, quantity and quality of data important to the operation of the essential function(s)." },
      { id: "remove-unnecessary-copies", statement: "You take steps to remove or minimise unnecessary copies or unneeded historic data." },
      { id: "mobile-media-identified", statement: "You have identified all mobile devices and media that may hold data important to the operation of the essential function(s)." },
      { id: "data-links-understood", statement: "You maintain a current understanding of the data links used to transmit data that is important to your essential function(s)." },
      { id: "data-context-understood", statement: "You understand the context, limitations and dependencies of your important data." },
      { id: "impact-documented", statement: "You understand and document the impact on your essential function(s) of all relevant scenarios, including unauthorised data access, modification or deletion." },
      { id: "impact-validated-annually", statement: "You validate these documented impact statements regularly, at least annually." },
    ],
    notAchieved: [
      { id: "incomplete-data-knowledge", statement: "You have incomplete knowledge of what data is used by and produced in the operation of the essential function(s)." },
      { id: "important-data-unidentified", statement: "You have not identified the important data on which your essential function(s) relies." },
      { id: "access-unidentified", statement: "You have not identified who has access to data important to the operation of the essential function(s)." },
      { id: "impact-not-articulated", statement: "You have not clearly articulated the impact of data compromise or lack of availability." },
    ],
    partiallyAchieved: [
      { id: "data-catalogued-partial", statement: "You have identified and catalogued all the data important to the operation of the essential function(s), or that would assist an attacker." },
      { id: "access-catalogued-partial", statement: "You have identified and catalogued who has access to the data important to the operation of the essential function(s)." },
      { id: "data-location-reviewed", statement: "You regularly review location, transmission, quantity and quality of data important to the operation of the essential function(s)." },
      { id: "mobile-media-identified-partial", statement: "You have identified all mobile devices and media that hold data important to the operation of the essential function(s)." },
      { id: "impact-documented-partial", statement: "You understand and document the impact on your essential function(s) of all relevant scenarios, including unauthorised data access, modification or deletion." },
      { id: "impact-occasionally-validated", statement: "You occasionally validate these documented impact statements." },
    ],
  },

  B3b: {
    achieved: [
      { id: "data-links-identified-protected", statement: "You have identified and protected (effectively and proportionately) all the data links that carry data important to the operation of your essential function(s)." },
      { id: "robust-technical-protection", statement: "You apply appropriate physical and/or technical means to protect data that travels over non-trusted or openly accessible carriers, with justified confidence in the robustness of the protection applied." },
      { id: "alternative-paths", statement: "Suitable alternative transmission paths are available where there is a significant risk of impact on the operation of the essential function(s) due to resource limitation." },
    ],
    notAchieved: [
      { id: "data-links-unknown", statement: "You do not know what all your data links are, or which carry data important to the operation of the essential function(s)." },
      { id: "no-technical-protection", statement: "Data important to the operation of the essential function(s) travels without technical protection over non-trusted or openly accessible carriers." },
      { id: "no-alternative-paths", statement: "Critical data paths that could fail, be jammed, or be overloaded have no alternative path." },
    ],
    partiallyAchieved: [
      { id: "data-links-identified-partial", statement: "You have identified and protected (effectively and proportionately) all the data links that carry data important to the operation of your essential function(s)." },
      { id: "limited-confidence-protection", statement: "You apply appropriate technical means (e.g. cryptography) to protect data that travels over non-trusted or openly accessible carriers, but you have limited or no confidence in the robustness of the protection applied." },
    ],
  },

  B3c: {
    achieved: [
      { id: "only-necessary-copies", statement: "All copies of data important to the operation of your essential function(s) are necessary. Where important data is transferred to less secure systems, the data is provided with limited detail and/or as a read-only copy." },
      { id: "stored-data-protected", statement: "You have applied suitable physical and/or technical means to protect this important stored data from unauthorised access, modification or deletion." },
      { id: "crypto-with-confidence", statement: "If cryptographic protections are used, you apply suitable technical and procedural means, and you have justified confidence in the robustness of the protection applied." },
      { id: "secured-backups", statement: "You have suitable, secured backups of data to allow the operation of the essential function(s) to continue should the original data not be available. This may include off-line or segregated backups." },
      { id: "archive-data-secured", statement: "Necessary historic or archive data is suitably secured in storage." },
    ],
    notAchieved: [
      { id: "stored-data-location-unknown", statement: "You have no, or limited, knowledge of where data important to the operation of the essential function(s) is stored." },
      { id: "stored-data-unprotected", statement: "You have not protected vulnerable stored data important to the operation of the essential function(s) in a suitable way." },
      { id: "backups-incomplete", statement: "Backups are incomplete, untested, not adequately secured or could be inaccessible in a disaster recovery or business continuity situation." },
    ],
    partiallyAchieved: [
      { id: "only-necessary-copies-partial", statement: "All copies of data important to the operation of your essential function(s) are necessary. Where important data is transferred to less secure systems, the data is provided with limited detail and/or as a read-only copy." },
      { id: "stored-data-protected-partial", statement: "You have applied suitable physical and/or technical means to protect this important stored data from unauthorised access, modification or deletion." },
      { id: "crypto-limited-confidence", statement: "If cryptographic protections are used, you apply suitable technical and procedural means, but you have limited or no confidence in the robustness of the protection applied." },
      { id: "secured-backups-partial", statement: "You have suitable, secured backups of data to allow the operation of the essential function(s) to continue should the original data not be available." },
    ],
  },

  B3d: {
    achieved: [
      { id: "mobile-devices-catalogued", statement: "Mobile devices that hold data important to the operation of the essential function(s) are catalogued, are under your organisation's control and configured according to best practice for the platform." },
      { id: "remote-wipe", statement: "Your organisation can remotely wipe all mobile devices holding data important to the operation of the essential function(s)." },
      { id: "data-minimised-mobile", statement: "You have minimised this data on these mobile devices. Some data may be automatically deleted off mobile devices after a certain period." },
    ],
    notAchieved: [
      { id: "mobile-devices-unknown", statement: "You don't know which mobile devices may hold data important to the operation of the essential function(s)." },
      { id: "unmanaged-devices", statement: "You allow data important to the operation of the essential function(s) to be stored on devices not managed by your organisation, or to at least equivalent standard." },
      { id: "data-not-technically-secured", statement: "Data on mobile devices is not technically secured, or only some is secured." },
    ],
    partiallyAchieved: [
      { id: "mobile-devices-known", statement: "You know which mobile devices hold data important to the operation of the essential function(s)." },
      { id: "security-standard-aligned", statement: "Data important to the operation of the essential function(s) is stored on mobile devices only when they have at least the security standard aligned to your overarching security policies." },
      { id: "data-technically-secured", statement: "Data on mobile devices is technically secured." },
    ],
  },

  B3e: {
    achieved: [
      { id: "devices-catalogued", statement: "You catalogue and track all devices that contain data important to the operation of the essential function(s) (whether a specific storage device or one with integral storage)." },
      { id: "assured-sanitisation", statement: "Data important to the operation of the essential function(s) is removed from all devices, equipment and removable media before reuse and/or disposal using an assured product or service." },
    ],
    notAchieved: [
      { id: "devices-disposed-without-sanitisation", statement: "Some or all devices, equipment or removable media that hold data important to the operation of the essential function(s) are reused or disposed of without sanitisation of that data." },
    ],
    partiallyAchieved: [
      { id: "data-removed-before-disposal", statement: "Data important to the operations of the essential function(s) is removed from all devices, equipment and removable media before reuse and/or disposal." },
    ],
  },

  B4a: {
    achieved: [
      { id: "appropriate-expertise", statement: "You employ appropriate expertise to design network and information systems." },
      { id: "security-zones", statement: "Your network and information systems are segregated into appropriate security zones (e.g. systems supporting the essential function(s) are segregated in a highly trusted, more secure zone)." },
      { id: "simple-data-flows", statement: "The network and information systems supporting your essential function(s) are designed to have simple data flows between components to support effective security monitoring." },
      { id: "easy-to-recover", statement: "The network and information systems supporting your essential function(s) are designed to be easy to recover." },
      { id: "content-attacks-mitigated", statement: "Content-based attacks are mitigated for all inputs to network and information systems that affect the essential function(s) (e.g. via transformation and inspection)." },
    ],
    notAchieved: [
      { id: "not-segregated", statement: "Systems essential to the operation of the essential function(s) are not appropriately segregated from other systems." },
      { id: "internet-access", statement: "Internet access is available from network and information systems supporting your essential function(s)." },
      { id: "complex-data-flows", statement: "Data flows between network and information systems supporting your essential function(s) and other systems are complex, making it hard to discriminate between legitimate and illegitimate/malicious traffic." },
      { id: "remote-access-bypasses-controls", statement: "Remote or third-party accesses circumvent some network controls to gain more direct access to network and information systems supporting the essential function(s)." },
    ],
    partiallyAchieved: [
      { id: "appropriate-expertise-partial", statement: "You employ appropriate expertise to design network and information systems." },
      { id: "boundary-defences", statement: "You design strong boundary defences where your network and information systems interface with other organisations or the world at large." },
      { id: "simple-data-flows-partial", statement: "You design simple data flows between your network and information systems and any external interface to enable effective monitoring." },
      { id: "recovery-design", statement: "You design to make network and information system recovery simple." },
      { id: "input-validation", statement: "All inputs to network and information systems supporting your essential function(s) are checked and validated at the network boundary where possible, or additional monitoring is in place for content-based attacks." },
    ],
  },

  B4b: {
    achieved: [
      { id: "assets-actively-managed", statement: "You have identified, documented and actively manage (e.g. maintain security configurations, patching, updating according to good practice) the assets that need to be carefully configured to maintain the security of the essential function(s)." },
      { id: "baseline-build", statement: "All platforms conform to your secure, defined baseline build, or the latest known good configuration version for that environment." },
      { id: "changes-managed", statement: "You closely and effectively manage changes in your environment, ensuring that network and system configurations are secure and documented." },
      { id: "settings-validated", statement: "You regularly review and validate that your network and information systems have the expected, secure settings and configuration." },
      { id: "only-permitted-software", statement: "Only permitted software can be installed." },
      { id: "standard-users-restricted", statement: "Standard users are not able to change settings that would impact security or the business operation." },
      { id: "automated-decisions-understood", statement: "If automated decision-making technologies are in use, their operation is well understood, and decisions can be replicated." },
      { id: "generic-accounts-removed", statement: "Generic, shared, default name and built-in accounts have been removed or disabled. Where this is not possible, credentials to these accounts have been changed." },
    ],
    notAchieved: [
      { id: "assets-not-identified", statement: "You haven't identified the assets that need to be carefully configured to maintain the security of the essential function(s)." },
      { id: "os-policies-inconsistent", statement: "Policies relating to the security of operating system builds or configuration are not applied consistently across your network and information systems." },
      { id: "config-not-recorded", statement: "Configuration details are not recorded or lack enough information to be able to rebuild the system or device." },
      { id: "changes-not-recorded", statement: "The recording of security changes or adjustments that affect your essential function(s) is lacking or inconsistent." },
      { id: "generic-accounts-present", statement: "Generic, shared, default name and built-in accounts have not been removed or disabled." },
    ],
    partiallyAchieved: [
      { id: "assets-documented", statement: "You have identified and documented the assets that need to be carefully configured to maintain the security of the essential function(s)." },
      { id: "secure-builds", statement: "Secure platform and device builds are used across the estate." },
      { id: "consistent-configurations", statement: "Consistent, secure and minimal system and device configurations are applied across the same types of environment." },
      { id: "changes-approved", statement: "Changes and adjustments to security configuration at security boundaries with the network and information systems are approved and documented." },
      { id: "software-verified", statement: "You verify software before installation is permitted." },
      { id: "generic-accounts-removed-partial", statement: "Generic, shared, default name and built-in accounts have been removed or disabled. Where this is not possible, credentials to these accounts have been changed." },
    ],
  },

  B4c: {
    achieved: [
      { id: "paw-admin", statement: "Your systems and devices supporting the operation of the essential function(s) are only administered or maintained by authorised privileged users from highly trusted devices, such as Privileged Access Workstations, dedicated solely to those operations." },
      { id: "documentation-securely-stored", statement: "You regularly review and update technical knowledge about network and information systems, such as documentation and network diagrams, and ensure they are securely stored." },
      { id: "malware-prevented", statement: "You prevent, detect and remove malware, and unauthorised software. You use technical, procedural and physical measures as necessary." },
    ],
    notAchieved: [
      { id: "admin-from-non-corporate", statement: "Your systems and devices supporting the operation of the essential function(s) are administered or maintained from devices that are not corporately owned and managed." },
      { id: "poor-documentation", statement: "You do not have good or current technical documentation of your network and information systems." },
    ],
    partiallyAchieved: [
      { id: "privileged-separated-admin", statement: "Your systems and devices are only administered or maintained by authorised privileged users from devices sufficiently separated, using a risk-based approach, from the activities of standard users." },
      { id: "documentation-reviewed", statement: "Technical knowledge about network and information systems, such as documentation and network diagrams, is regularly reviewed and updated." },
    ],
  },

  B4d: {
    achieved: [
      { id: "current-vulnerability-understanding", statement: "You maintain a current understanding of the exposure of your essential function(s) to publicly-known vulnerabilities." },
      { id: "all-vulnerabilities-patched-promptly", statement: "Announced vulnerabilities for all software packages, network and information systems used to support your essential function(s) are tracked, prioritised and mitigated (e.g. by patching) promptly." },
      { id: "regular-testing-third-party", statement: "You regularly test to fully understand the vulnerabilities of the network and information systems that support the operation of your essential function(s) and verify this understanding with third-party testing." },
      { id: "supported-software-maximised", statement: "You maximise the use of supported software, firmware and hardware in your network and information systems supporting your essential function(s)." },
    ],
    notAchieved: [
      { id: "exposure-unknown", statement: "You do not understand the exposure of your essential function(s) to publicly-known vulnerabilities." },
      { id: "external-vulnerabilities-not-mitigated", statement: "You do not mitigate externally exposed vulnerabilities promptly." },
      { id: "not-recently-tested", statement: "You have not recently tested to verify your understanding of the vulnerabilities of the network and information systems that support your essential function(s)." },
      { id: "unsupported-not-mitigated", statement: "You have not suitably mitigated systems or software that is no longer supported." },
      { id: "unsupported-no-plan", statement: "You are not pursuing replacement for unsupported systems or software." },
    ],
    partiallyAchieved: [
      { id: "current-vulnerability-partial", statement: "You maintain a current understanding of the exposure of your essential function(s) to publicly-known vulnerabilities." },
      { id: "external-patched-promptly", statement: "Announced vulnerabilities for all software packages, network and information systems used to support your essential function(s) are tracked, prioritised and externally exposed vulnerabilities are mitigated (e.g. by patching) promptly." },
      { id: "some-temporary-mitigations", statement: "Some vulnerabilities that are not externally exposed have temporary mitigations for an extended period." },
      { id: "unsupported-temporary-mitigation", statement: "You have temporary mitigations for unsupported systems and software while pursuing migration to supported technology." },
      { id: "regular-testing-partial", statement: "You regularly test to fully understand the vulnerabilities of the network and information systems that support the operation of your essential function(s)." },
    ],
  },

  B5a: {
    achieved: [
      { id: "bc-dr-plans-tested", statement: "You have business continuity and disaster recovery plans that have been tested for practicality, effectiveness and completeness." },
      { id: "range-of-test-methods", statement: "Appropriate use is made of different test methods (e.g. manual fail-over, table-top exercises, or red-teaming)." },
      { id: "threat-intelligence-used", statement: "You use your security awareness and threat intelligence sources to identify new or heightened levels of risk, which result in immediate and potentially temporary security measures to enhance security (e.g. in response to a widespread outbreak of very damaging malware)." },
    ],
    notAchieved: [
      { id: "limited-restoration-understanding", statement: "You have limited understanding of all the elements that are required to restore operation of the essential function(s)." },
      { id: "bc-dr-plans-incomplete", statement: "You have not completed business continuity and disaster recovery plans for network and information systems, including their dependencies, supporting the operation of the essential function(s)." },
      { id: "plans-not-assessed", statement: "You have not fully assessed the practical implementation of your business continuity and disaster recovery plans." },
    ],
    partiallyAchieved: [
      { id: "systems-interdependence-known", statement: "You know all network and information systems, and underlying technologies, that are necessary to restore the operation of the essential function(s) and understand their interdependence." },
      { id: "recovery-order-known", statement: "You know the order in which systems need to be recovered to efficiently and effectively restore the operation of the essential function(s)." },
    ],
  },

  B5b: {
    achieved: [
      { id: "physically-segregated", statement: "Network and information systems supporting the operation of your essential function(s) are segregated from other business and external systems by appropriate technical and physical means (e.g. separate network and system infrastructure with independent user administration). Internet services are not accessible from network and information systems supporting the essential function(s)." },
      { id: "resource-limitations-mitigated", statement: "You have identified and mitigated all resource limitations (e.g. bandwidth limitations and single network paths)." },
      { id: "geographical-constraints-mitigated", statement: "You have identified and mitigated any geographical constraints or weaknesses (e.g. systems that your essential function(s) depends upon are replicated in another location, important network connectivity has alternative physical paths and service providers)." },
      { id: "assessments-updated", statement: "You review and update assessments of dependencies, resource and geographical limitations and mitigations when necessary." },
    ],
    notAchieved: [
      { id: "not-segregated", statement: "Network and information systems supporting the operation of your essential function(s) are not appropriately segregated." },
      { id: "internet-accessible", statement: "Internet services, such as browsing and email, are accessible from network and information systems supporting the essential function(s)." },
      { id: "resource-limitations-unknown", statement: "You do not understand or lack plans to mitigate all resource limitations that could adversely affect your essential function(s)." },
    ],
    partiallyAchieved: [
      { id: "logically-separated", statement: "Network and information systems supporting the operation of your essential function(s) are logically separated from your business systems (e.g. they reside on the same network as the rest of the organisation but within a DMZ)." },
      { id: "internet-not-accessible-partial", statement: "Internet services are not accessible from network and information systems supporting the essential function(s)." },
      { id: "resource-limitations-identified", statement: "Resource limitations (e.g. network bandwidth, single network paths) have been identified but not fully mitigated." },
    ],
  },

  B5c: {
    achieved: [
      { id: "comprehensive-backups", statement: "Your comprehensive, automatic and tested technical and procedural backups are secured at centrally accessible or secondary sites to recover from an extreme event." },
      { id: "backups-tested-documented", statement: "Backups of all important data and information needed to recover the essential function(s) are made, tested, documented and routinely reviewed." },
    ],
    notAchieved: [
      { id: "backup-coverage-incomplete", statement: "Backup coverage is incomplete and does not include all relevant data and information needed to restore the operation of your essential function(s)." },
      { id: "backups-not-frequent-enough", statement: "Backups are not frequent enough for the operation of your essential function(s) to be restored effectively." },
      { id: "restoration-too-slow", statement: "Your restoration process does not restore your essential function(s) in a suitable time frame." },
    ],
    partiallyAchieved: [
      { id: "secured-backups-accessible", statement: "You have appropriately secured backups (including data, configuration information, software, equipment, processes and knowledge). These backups will be accessible to recover from an extreme event." },
      { id: "backups-routinely-tested", statement: "You routinely test backups to ensure that the backup process function(s) correctly and the backups are usable." },
    ],
  },

  B6a: {
    achieved: [
      { id: "priorities-communicated", statement: "Your executive management clearly and effectively communicates the organisation's cyber security priorities and objectives to all staff. Your organisation displays positive cyber security attitudes, behaviours and expectations." },
      { id: "reporting-treated-positively", statement: "People in your organisation raising potential cyber security incidents and issues are treated positively." },
      { id: "routinely-report-recognised", statement: "Individuals at all levels in your organisation routinely report concerns or issues about cyber security and are recognised for their contribution to keeping the organisation secure." },
      { id: "management-committed", statement: "Your management is seen to be committed to and actively involved in cyber security." },
      { id: "open-communication", statement: "Your organisation communicates openly about cyber security, with any concern being taken seriously." },
      { id: "participates-in-improvements", statement: "People across your organisation participate in cyber security activities and improvements, building joint ownership and bringing knowledge of their area of expertise." },
    ],
    notAchieved: [
      { id: "contribution-not-understood", statement: "People in your organisation don't understand what they contribute to the cyber security of the essential function(s)." },
      { id: "how-to-raise-unknown", statement: "People in your organisation don't know how to raise a concern about cyber security." },
      { id: "reporting-fears-trouble", statement: "People believe that reporting issues may get them into trouble." },
      { id: "security-seen-as-hindrance", statement: "Your organisation's approach to cyber security is perceived by staff as hindering the business of the organisation." },
    ],
    partiallyAchieved: [
      { id: "management-communicates-culture", statement: "Your executive management understand and widely communicate the importance of a positive cyber security culture." },
      { id: "attitudes-described", statement: "Positive attitudes, behaviours and expectations are described for your organisation." },
      { id: "all-understand-contribution", statement: "All people in your organisation understand the contribution they make to the essential function(s) cyber security." },
      { id: "all-know-how-to-raise", statement: "All individuals in your organisation know who to contact and where to access more information about cyber security. They know how to raise a cyber security issue." },
    ],
  },

  B6b: {
    achieved: [
      { id: "all-follow-training-paths", statement: "All people in your organisation, from the most senior to the most junior, follow appropriate cyber security training paths." },
      { id: "training-tracked-refreshed", statement: "Each individual's cyber security training is tracked and refreshed at suitable intervals." },
      { id: "training-evaluated", statement: "You routinely evaluate your cyber security training and awareness activities to ensure they reach the widest audience and are effective." },
      { id: "information-accessible-used", statement: "You make cyber security information and good practice guidance easily accessible, widely available and you know it is referenced and used within your organisation." },
    ],
    notAchieved: [
      { id: "teams-lack-training", statement: "There are teams who operate and support your essential function(s) that lack any cyber security training." },
      { id: "training-restricted-to-roles", statement: "Cyber security training is restricted to specific roles in your organisation." },
      { id: "training-records-incomplete", statement: "Cyber security training records for your organisation are lacking or incomplete." },
    ],
    partiallyAchieved: [
      { id: "training-defined-all-roles", statement: "You have defined appropriate cyber security training and awareness activities for all roles in your organisation, from executives to the most junior roles." },
      { id: "range-of-techniques", statement: "You use a range of teaching and communication techniques for cyber security training and awareness to reach the widest audience effectively." },
      { id: "information-easily-available", statement: "Cyber security information is easily available." },
    ],
  },

  // --- Objective C: Detecting cyber security events ---

  C1a: {
    achieved: [
      { id: "monitoring-based-on-understanding", statement: "Monitoring is based on an understanding of your networks, common cyber attack methods and what you need awareness of in order to detect potential security incidents that could affect the operation of your essential function(s)." },
      { id: "sufficient-detail", statement: "Your monitoring data provides enough detail to reliably detect security incidents that could affect the operation of your essential function(s)." },
      { id: "iocs-detected", statement: "You easily detect the presence or absence of Indicators of Compromise (IoCs) on your essential function(s), such as known malicious command and control signatures." },
      { id: "user-activity-monitored", statement: "Extensive monitoring of user activity in relation to the operation of your essential function(s) enables you to detect policy violations and an agreed list of suspicious or undesirable behaviour." },
      { id: "extensive-coverage", statement: "You have extensive monitoring coverage that includes host-based monitoring and network gateways." },
      { id: "new-systems-considered", statement: "All new systems are considered as potential monitoring data sources to maintain a comprehensive monitoring capability." },
    ],
    notAchieved: [
      { id: "data-not-collected", statement: "Data relating to the security and operation of your essential function(s) is not collected." },
      { id: "iocs-not-detected-confidently", statement: "You do not confidently detect the presence or absence of Indicators of Compromise (IoCs) on your essential function(s), such as known malicious command and control signatures." },
      { id: "user-activity-not-auditable", statement: "You are not able to audit the activities of users in relation to your essential function(s)." },
      { id: "no-traffic-capture", statement: "You do not capture any traffic crossing your network boundary including as a minimum IP connections." },
    ],
    partiallyAchieved: [
      { id: "some-data-collected", statement: "Data relating to the security and operation of some areas of your essential function(s) is collected but coverage is not comprehensive." },
      { id: "iocs-detected-partial", statement: "You easily detect the presence or absence of IoCs on your essential function(s), such as known malicious command and control signatures." },
      { id: "some-user-monitoring", statement: "Some user monitoring is done, but not covering a fully agreed list of suspicious or undesirable behaviour." },
      { id: "boundary-traffic-monitored", statement: "You monitor traffic crossing your network boundary (including IP address connections as a minimum)." },
    ],
  },

  C1b: {
    achieved: [
      { id: "log-integrity-protected", statement: "The integrity of log data is protected, or any modification is detected and attributed." },
      { id: "logging-architecture-protected", statement: "The logging architecture has mechanisms, policies, processes and procedures to ensure that it can protect itself from threats comparable to those it is trying to identify." },
      { id: "copies-only-for-analysis", statement: "Log data analysis and normalisation is only performed on copies of the data keeping the master copy unaltered." },
      { id: "synchronised-time", statement: "Log data is synchronised, using an accurate common time source, so that separate datasets can be correlated in different ways." },
      { id: "limited-access", statement: "Access to log data is limited to those with business need and no others." },
      { id: "all-actions-traceable", statement: "All actions involving all log data (e.g. copying, deleting, modifying or viewing) can be traced back to a unique user." },
      { id: "use-policies", statement: "Legitimate reasons for accessing log data are given in use policies." },
    ],
    notAchieved: [
      { id: "logs-editable", statement: "It is possible for log data to be easily edited or deleted by unauthorised users or malicious attackers." },
      { id: "no-controlled-list", statement: "There is no controlled list of the users and systems that can view and query log data." },
      { id: "no-access-monitoring", statement: "There is no monitoring of the access to log data." },
      { id: "no-access-policy", statement: "There is no policy for accessing log data." },
      { id: "no-time-synchronisation", statement: "Log data is not synchronised, using an accurate common time source." },
    ],
    partiallyAchieved: [
      { id: "authorised-staff-only", statement: "Only authorised staff can view log data for investigations." },
      { id: "authorised-users-access", statement: "Authorised users and systems can appropriately access log data." },
      { id: "some-access-monitoring", statement: "There is some monitoring of access to log data (e.g. copying, deleting, modifying or viewing)." },
    ],
  },

  C1c: {
    achieved: [
      { id: "logs-enriched", statement: "Log data is enriched with other network knowledge and data when investigating certain suspicious activity or alerts." },
      { id: "wide-range-signatures", statement: "A wide range of signatures and indicators of compromise is used for investigations of suspicious activity and alerts." },
      { id: "real-time-resolution", statement: "Alerts can be easily resolved to network assets using knowledge of networks and systems. The resolution of these alerts is performed in almost real time." },
      { id: "all-ef-alerts-prioritised", statement: "Security alerts relating to all essential function(s) are prioritised and this information is used to support incident management." },
      { id: "logs-reviewed-continuously", statement: "Logs are reviewed almost continuously, in real time." },
      { id: "alerts-tested", statement: "Alerts are tested to ensure that they are generated reliably and that it is possible to distinguish genuine security incidents from false alarms." },
    ],
    notAchieved: [
      { id: "third-party-alerts-not-investigated", statement: "Alerts from third party security software are not investigated (e.g. Anti-Virus (AV) providers)." },
      { id: "logs-distributed-inaccessible", statement: "Logs are distributed across devices with no easy way to access them other than manual login or physical action." },
      { id: "alerts-not-resolved-to-asset", statement: "The resolution of alerts to a network asset or system is not performed." },
      { id: "alerts-not-prioritised", statement: "Security alerts relating to essential function(s) are not prioritised." },
      { id: "logs-reviewed-infrequently", statement: "Logs are reviewed infrequently." },
    ],
    partiallyAchieved: [
      { id: "third-party-alerts-investigated", statement: "Alerts from third party security software are investigated, and action taken." },
      { id: "some-logs-queryable", statement: "Some, but not all, log data can be easily queried with search tools to aid investigations." },
      { id: "alerts-resolved-regularly", statement: "The resolution of alerts to a network asset or system is performed regularly." },
      { id: "some-ef-alerts-prioritised", statement: "Security alerts relating to some essential function(s) are prioritised." },
      { id: "logs-reviewed-regularly", statement: "Logs are reviewed at regular intervals." },
    ],
  },

  C1d: {
    achieved: [
      { id: "threat-intel-selected", statement: "You have selected threat intelligence sources or services using risk-based and threat-informed decisions based on your business needs and sector." },
      { id: "signatures-applied-promptly", statement: "You apply all new signatures and IoCs within a reasonable (risk-based) time of receiving them." },
      { id: "signature-updates-received", statement: "You receive signature updates for all your protective technologies (e.g. AV, IDS)." },
      { id: "feedback-shared", statement: "You track the effectiveness of your intelligence feeds and actively share feedback on the usefulness of IoCs and any other indicators with the threat community (e.g. sector partners, threat intelligence providers, government agencies)." },
    ],
    notAchieved: [
      { id: "no-threat-intelligence", statement: "Your organisation has no sources of threat intelligence." },
      { id: "updates-not-timely", statement: "You do not apply updates in a timely way, after receiving them (e.g. AV signature updates, other threat signatures or Indicators of Compromise (IoCs))." },
      { id: "signature-updates-not-received", statement: "You do not receive signature updates for all protective technologies such as AV and IDS or other software in use." },
      { id: "intel-not-evaluated", statement: "You do not evaluate the usefulness of your threat intelligence or share feedback with providers or other users." },
    ],
    partiallyAchieved: [
      { id: "some-intel-services", statement: "Your organisation uses some threat intelligence services, but you don't necessarily choose sources or providers specifically because of your business needs, or specific threats in your sector." },
      { id: "all-signature-updates-received", statement: "You receive updates for all your signature based protective technologies (e.g. AV, IDS)." },
      { id: "some-updates-timely", statement: "You apply some updates, signatures and IoCs in a timely way." },
      { id: "effectiveness-known", statement: "You know how effective your threat intelligence is (e.g. by tracking how threat intelligence helps you identify security problems)." },
    ],
  },

  C1e: {
    achieved: [
      { id: "monitoring-staff-defined-roles", statement: "You have monitoring staff who are responsible for the analysis, investigation and reporting of monitoring alerts covering both security and performance." },
      { id: "roles-skills-cover-all-parts", statement: "Monitoring staff have defined roles and skills that cover all parts of the monitoring and investigation process." },
      { id: "governance-reporting", statement: "Monitoring staff follow policies, processes and procedures that address all governance reporting requirements, internal and external." },
      { id: "empowered-beyond-process", statement: "Monitoring staff are empowered to look beyond the fixed process to investigate and understand non-standard threats, by developing their own investigative techniques and making new use of data." },
      { id: "tools-use-all-log-data", statement: "Your monitoring tools make use of all log data collected to pinpoint activity within an incident." },
      { id: "staff-drive-log-collection", statement: "Monitoring staff and tools drive and shape new log data collection and can make wide use of it." },
      { id: "aware-of-essential-functions", statement: "Monitoring staff are aware of the operation of essential function(s) and related assets and can identify and prioritise alerts or investigations that relate to them." },
    ],
    notAchieved: [
      { id: "no-monitoring-staff", statement: "There are no staff who perform a monitoring function." },
      { id: "wrong-skills", statement: "Monitoring staff do not have the correct specialist skills." },
      { id: "cannot-report-governance", statement: "Monitoring staff are not capable of reporting against governance requirements." },
      { id: "skills-gaps", statement: "Monitoring staff lack the skills to successfully perform some significant parts of the defined workflow." },
      { id: "tools-use-fraction", statement: "Monitoring tools are only able to make use of a fraction of log data being collected." },
      { id: "tools-not-configurable", statement: "Monitoring tools cannot be configured to make use of new logging streams, as they come online." },
      { id: "unaware-of-essential-functions", statement: "Monitoring staff have a lack of awareness of the essential function(s) the organisation provides, what assets relate to those functions and hence the importance of the log data and security events." },
    ],
    partiallyAchieved: [
      { id: "some-investigative-skills", statement: "Monitoring staff have some investigative skills and a basic understanding of the data they need to work with." },
      { id: "can-report-to-management", statement: "Monitoring staff can report to other parts of the organisation (e.g. security directors, resilience managers)." },
      { id: "follow-most-workflows", statement: "Monitoring staff are capable of following most of the required workflows." },
      { id: "tools-capture-most-attacks", statement: "Your monitoring tools can make use of logging that would capture most unsophisticated and untargeted attack types." },
      { id: "tools-work-with-most-data", statement: "Your monitoring tools work with most log data, with some configuration." },
      { id: "aware-of-some-functions", statement: "Monitoring staff are aware of some essential function(s) and can manage alerts relating to them." },
    ],
  },

  C2a: {
    achieved: [
      { id: "normal-behaviour-fully-understood", statement: "Normal system behaviour is fully understood to such an extent that searching for system abnormalities is a potentially effective way of detecting malicious activity (e.g. you fully understand which systems should and should not communicate and when)." },
      { id: "abnormalities-from-intelligence", statement: "System abnormality descriptions from past attacks and threat intelligence, on yours and other networks, are used to signify malicious activity." },
      { id: "nature-of-attacks-considered", statement: "The system abnormalities you search for consider the nature of attacks likely to impact on the network and information systems supporting the operation of your essential function(s)." },
      { id: "descriptions-updated", statement: "The system abnormality descriptions you use are updated to reflect changes in your network and information systems and current threat intelligence." },
    ],
    notAchieved: [
      { id: "normal-behaviour-not-understood", statement: "Normal system behaviour is insufficiently understood to be able to use system abnormalities to detect malicious activity." },
      { id: "no-established-understanding", statement: "You have no established understanding of what abnormalities to look for that might signify malicious activities." },
    ],
    partiallyAchieved: [],
  },

  C2b: {
    achieved: [
      { id: "routinely-search-abnormalities", statement: "You routinely search for system abnormalities indicative of malicious activity on the network and information systems supporting the operation of your essential function(s), generating alerts based on the results of such searches." },
      { id: "justified-confidence", statement: "You have justified confidence in the effectiveness of your searches for system abnormalities indicative of malicious activity." },
    ],
    notAchieved: [
      { id: "do-not-routinely-search", statement: "You do not routinely search for system abnormalities indicative of malicious activity." },
    ],
    partiallyAchieved: [],
  },

  // --- Objective D: Minimising the impact of cyber security incidents ---

  D1a: {
    achieved: [
      { id: "based-on-risk-understanding", statement: "Your incident response plan is based on a clear understanding of the security risks to the network and information systems supporting your essential function(s)." },
      { id: "comprehensive-plan", statement: "Your incident response plan is comprehensive (i.e. covers the complete lifecycle of an incident, roles and responsibilities, and reporting) and covers likely impacts of both known attack patterns and of possible attacks, previously unseen." },
      { id: "integrated-with-wider-plans", statement: "Your incident response plan is documented and integrated with wider organisational business plans and supply chain response plans, as well as dependencies on supporting infrastructure (e.g. power, cooling etc)." },
      { id: "communicated-understood", statement: "Your incident response plan is communicated and understood by the business areas involved with the operation of your essential function(s)." },
    ],
    notAchieved: [
      { id: "plan-not-documented", statement: "Your incident response plan is not documented." },
      { id: "does-not-include-ef", statement: "Your incident response plan does not include your organisation's identified essential function(s)." },
      { id: "not-well-understood", statement: "Your incident response plan is not well understood by relevant staff." },
    ],
    partiallyAchieved: [
      { id: "covers-essential-functions", statement: "Your incident response plan covers your essential function(s)." },
      { id: "covers-known-attacks-only", statement: "Your incident response plan comprehensively covers scenarios that are focused on likely impacts of known and well understood attacks only." },
      { id: "understood-by-response-staff", statement: "Your incident response plan is understood by all staff who are involved with your organisation's response function." },
      { id: "documented-and-shared", statement: "Your incident response plan is documented and shared with all relevant stakeholders." },
    ],
  },

  D1b: {
    achieved: [
      { id: "resources-available", statement: "You understand the resources that will likely be needed to carry out any required response activities, and arrangements are in place to make these resources available." },
      { id: "information-available", statement: "You understand the types of information that will likely be needed to inform response decisions and arrangements are in place to make this information available." },
      { id: "response-team-skilled", statement: "Your response team members have the skills and knowledge required to decide on the response actions necessary to limit harm, and the authority to carry them out." },
      { id: "key-roles-duplicated", statement: "Key roles are duplicated, and operational delivery knowledge is shared with all individuals involved in the operations and recovery of the essential function(s)." },
      { id: "backup-mechanisms-available", statement: "Back-up mechanisms are available that can be readily activated to allow continued operation of your essential function(s), although possibly at a reduced level, if primary network and information systems fail or are unavailable." },
      { id: "external-support-available", statement: "Arrangements exist to augment your organisation's incident response capabilities with external support if necessary (e.g. specialist cyber incident responders)." },
    ],
    notAchieved: [
      { id: "inadequate-resources", statement: "Inadequate arrangements have been made to make the right resources available to implement your response plan." },
      { id: "team-not-equipped", statement: "Your response team members are not equipped to make good response decisions and put them into effect." },
      { id: "inadequate-backup-mechanisms", statement: "Inadequate back-up mechanisms exist to allow the continued operation of your essential function(s) during an incident." },
    ],
    partiallyAchieved: [],
  },

  D1c: {
    achieved: [
      { id: "scenarios-from-incidents-intel", statement: "Exercise scenarios are based on incidents experienced by your and other organisations or are composed using experience or threat intelligence." },
      { id: "scenarios-documented-validated", statement: "Exercise scenarios are documented, regularly reviewed, and validated." },
      { id: "exercises-routinely-run", statement: "Exercises are routinely run, with the findings documented and used to refine incident response plans and protective security, in line with the lessons learned." },
      { id: "exercises-test-all-parts", statement: "Exercises test all parts of your response cycle relating to your essential function(s) (e.g. restoration of normal function(s) levels)." },
    ],
    notAchieved: [
      { id: "only-discrete-part", statement: "Exercises test only a discrete part of the process (e.g. that backups are working), but do not consider all areas." },
      { id: "not-routinely-carried-out", statement: "Incident response exercises are not routinely carried out or are carried out in an ad-hoc way." },
      { id: "outputs-not-fed-back", statement: "Outputs from exercises are not fed into the organisation's lessons learned process." },
      { id: "do-not-test-all-parts", statement: "Exercises do not test all parts of the response cycle." },
    ],
    partiallyAchieved: [],
  },

  D2a: {
    achieved: [
      { id: "root-cause-routine", statement: "Root cause analysis is conducted routinely as a key part of your lessons learned activities following an incident." },
      { id: "comprehensive-root-cause", statement: "Your root cause analysis is comprehensive, covering organisational process issues, as well as vulnerabilities in your networks, systems or software." },
      { id: "all-data-available", statement: "All relevant incident data is made available to the analysis team to perform root cause analysis." },
    ],
    notAchieved: [
      { id: "cannot-resolve-to-root-cause", statement: "You are not usually able to resolve incidents to a root cause." },
      { id: "no-formal-investigation-process", statement: "You do not have a formal process for investigating causes." },
    ],
    partiallyAchieved: [],
  },

  D2b: {
    achieved: [
      { id: "documented-review-process", statement: "You have a documented incident review process/policy which ensures that lessons learned from each incident are identified, captured, and acted upon." },
      { id: "lessons-cover-all-areas", statement: "Lessons learned cover issues with reporting, roles, governance, skills and organisational processes as well as technical aspects of network and information systems." },
      { id: "used-to-improve", statement: "You use lessons learned to improve security measures, including updating and retesting response plans when necessary." },
      { id: "improvements-prioritised", statement: "Security improvements identified as a result of lessons learned are prioritised, with the highest priority improvements completed quickly." },
      { id: "fed-to-senior-management", statement: "Analysis is fed to senior management and incorporated into risk management and continuous improvement." },
    ],
    notAchieved: [
      { id: "lessons-not-captured", statement: "Following incidents, lessons learned are not captured or are limited in scope." },
      { id: "improvements-not-implemented", statement: "Improvements arising from lessons learned following an incident are not implemented or not given sufficient organisational priority." },
    ],
    partiallyAchieved: [],
  },

};

module.exports = { statements };
