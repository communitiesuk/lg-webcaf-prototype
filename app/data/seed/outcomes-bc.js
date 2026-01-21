// app/data/seed/outcomes-bc.js
// Objectives B & C outcomes tree (critical systems).

module.exports = {
  lens: "BC",
  objectives: [
    {
      code: "B",
      title: "Protecting against cyber attack",
      principles: [
        {
          code: "B1",
          title: "Service protection policies, processes and procedures",
          outcomes: [
            {
              id: "B1a",
              code: "B1.a",
              title: "Policy/process/procedure development",
              description: "Policies, processes and procedures are defined for protection.",
            },
            {
              id: "B1b",
              code: "B1.b",
              title: "Policy/process/procedure implementation",
              description: "Policies, processes and procedures are implemented consistently.",
            },
          ],
        },
        {
          code: "B2",
          title: "Identity and access control",
          outcomes: [
            {
              id: "B2a",
              code: "B2.a",
              title: "Identity verification, authentication and authorisation",
              description: "Access is verified, authenticated and authorised appropriately.",
            },
            {
              id: "B2b",
              code: "B2.b",
              title: "Device management",
              description: "Devices are managed and controlled throughout their lifecycle.",
            },
            {
              id: "B2c",
              code: "B2.c",
              title: "Privileged user management",
              description: "Privileged access is controlled and monitored.",
            },
            {
              id: "B2d",
              code: "B2.d",
              title: "Identity and Access Management (IdAM)",
              description: "IdAM capabilities are in place and maintained.",
            },
          ],
        },
        {
          code: "B3",
          title: "Data security",
          outcomes: [
            {
              id: "B3a",
              code: "B3.a",
              title: "Understanding data",
              description: "Data is understood, classified and managed.",
            },
            {
              id: "B3b",
              code: "B3.b",
              title: "Data in transit",
              description: "Data is protected in transit.",
            },
            {
              id: "B3c",
              code: "B3.c",
              title: "Stored data",
              description: "Data at rest is protected.",
            },
            {
              id: "B3d",
              code: "B3.d",
              title: "Mobile data",
              description: "Mobile and removable data is protected.",
            },
            {
              id: "B3e",
              code: "B3.e",
              title: "Media and equipment sanitisation",
              description: "Data is removed securely from equipment and media.",
            },
          ],
        },
        {
          code: "B4",
          title: "System security",
          outcomes: [
            {
              id: "B4a",
              code: "B4.a",
              title: "Secure by design",
              description: "Security is built into system design.",
            },
            {
              id: "B4b",
              code: "B4.b",
              title: "Secure configuration",
              description: "Systems are configured securely.",
            },
            {
              id: "B4c",
              code: "B4.c",
              title: "Secure management",
              description: "Systems are managed securely.",
            },
            {
              id: "B4d",
              code: "B4.d",
              title: "Vulnerability management",
              description: "Vulnerabilities are identified and managed.",
            },
          ],
        },
        {
          code: "B5",
          title: "Resilient networks and systems",
          outcomes: [
            {
              id: "B5a",
              code: "B5.a",
              title: "Resilience preparation",
              description: "Preparation supports resilient operation.",
            },
            {
              id: "B5b",
              code: "B5.b",
              title: "Design for resilience",
              description: "Systems are designed to be resilient.",
            },
            {
              id: "B5c",
              code: "B5.c",
              title: "Backups",
              description: "Backups are maintained and tested.",
            },
          ],
        },
        {
          code: "B6",
          title: "Staff awareness and training",
          outcomes: [
            {
              id: "B6a",
              code: "B6.a",
              title: "Cyber security culture",
              description: "A positive cyber security culture is maintained.",
            },
            {
              id: "B6b",
              code: "B6.b",
              title: "Cyber security training",
              description: "Staff receive appropriate cyber security training.",
            },
          ],
        },
      ],
    },
    {
      code: "C",
      title: "Detecting cyber security events",
      principles: [
        {
          code: "C1",
          title: "Security monitoring",
          outcomes: [
            {
              id: "C1a",
              code: "C1.a",
              title: "Security monitoring coverage",
              description: "Monitoring covers critical services and dependencies.",
            },
            {
              id: "C1b",
              code: "C1.b",
              title: "Security monitoring data sources",
              description: "Monitoring draws on appropriate data sources.",
            },
            {
              id: "C1c",
              code: "C1.c",
              title: "Analysis and alerting",
              description: "Monitoring outputs are analysed and alerts are triaged.",
            },
          ],
        },
        {
          code: "C2",
          title: "Proactive security event discovery",
          outcomes: [
            {
              id: "C2a",
              code: "C2.a",
              title: "Proactive discovery",
              description: "Proactive discovery identifies suspicious activity.",
            },
            {
              id: "C2b",
              code: "C2.b",
              title: "Threat hunting and investigation",
              description: "Threat hunting and investigation are conducted routinely.",
            },
          ],
        },
      ],
    },
  ],
};
