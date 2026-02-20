// app/data/seed/outcomes-ad.js
// Objectives A & D outcomes tree (seeded from the A&D workbook structure)

module.exports = {
  lens: "AD",
  objectives: [
    {
      code: "A",
      title: "Managing security risk",
      description:
        "Appropriate organisational structures, policies, processes and procedures in place to understand, assess and systematically manage security risks to network and information systems supporting essential functions.",
      principles: [
        {
          code: "A1",
          title: "Governance",
          description:
            "The organisation has appropriate management policies, processes and procedures in place to govern its approach to the security of network and information systems.",
          outcomes: [
            {
              id: "A1a",
              code: "A1.a",
              title: "Board Direction",
              description:
                "You have effective organisational security management led at board level and articulated clearly in corresponding policies.",
            },
            {
              id: "A1b",
              code: "A1.b",
              title: "Roles and responsibilities",
              description: "Clear ownership and accountability for cyber risk and controls.",
            },
            {
              id: "A1c",
              code: "A1.c",
              title: "Decision making",
              description: "Risk decisions are informed, timely and documented.",
            },
          ],
        },
        {
          code: "A2",
          title: "Risk management",
          outcomes: [
            {
              id: "A2a",
              code: "A2.a",
              title: "Risk management process",
              description: "Cyber risks are identified, assessed and managed consistently.",
            },
            {
              id: "A2b",
              code: "A2.b",
              title: "Assurance",
              description: "Assurance activities give confidence that controls are effective.",
            },
          ],
        },
        {
          code: "A3",
          title: "Asset management",
          outcomes: [
            {
              id: "A3a",
              code: "A3.a",
              title: "Asset management",
              description: "Assets are known, owned and managed throughout their lifecycle.",
            },
          ],
        },
        {
          code: "A4",
          title: "Supply chain",
          outcomes: [
            {
              id: "A4a",
              code: "A4.a",
              title: "Supply chain",
              description: "Third-party risks are understood and managed.",
            },
          ],
        },
      ],
    },
    {
      code: "D",
      title: "Minimising the impact of cyber security incidents",
      principles: [
        {
          code: "D1",
          title: "Response and recovery planning",
          outcomes: [
            {
              id: "D1a",
              code: "D1.a",
              title: "Response plan",
              description: "A plan exists for responding to cyber incidents.",
            },
            {
              id: "D1b",
              code: "D1.b",
              title: "Response and recovery capability",
              description: "Teams can respond and recover from incidents effectively.",
            },
            {
              id: "D1c",
              code: "D1.c",
              title: "Testing and exercising",
              description: "Plans are tested and improved through exercises.",
            },
          ],
        },
        {
          code: "D2",
          title: "Lessons learned",
          outcomes: [
            {
              id: "D2a",
              code: "D2.a",
              title: "Incident root cause analysis",
              description: "Incidents are analysed to identify root causes.",
            },
            {
              id: "D2b",
              code: "D2.b",
              title: "Using incidents to drive improvements",
              description: "Learning is applied to reduce future risk.",
            },
          ],
        },
      ],
    },
  ],
};
