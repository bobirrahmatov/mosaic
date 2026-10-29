/* Mosaic editable diagram data, schema version 1.
 * Transcribed from the clearer user-supplied Roll-Out and Strategic View slides.
 * See docs/diagram-data-notes.md for source fidelity and coordinate conventions.
 */
(function (window) {
  'use strict';
  window.MosaicDiagramData = {
    "version": 1,
    "revision": "2026-10-29.3",
    "rollout": {
      "title": "Roll-Out",
      "approval": "Current approved plan",
      "range": [
        2024,
        2030
      ],
      "note": "Timing is positioned from the supplied approved plan. The slide does not specify exact dates, completion status or the meaning of its hatched extensions.",
      "activities": [
        {
          "id": "foundational",
          "label": "Foundational",
          "group": "Foundations and early capabilities",
          "start": 2024,
          "end": 2026
        },
        {
          "id": "dac-crypto-mvp",
          "label": "DAC Crypto MVP",
          "group": "Foundations and early capabilities",
          "start": 2024.5,
          "end": 2026
        },
        {
          "id": "dac-crypto-day-2",
          "label": "DAC Crypto Day 2",
          "group": "Foundations and early capabilities",
          "start": 2026,
          "end": 2026.75
        },
        {
          "id": "mahogany-integration",
          "label": "Mahogany Integration & Secore GC Decomposition",
          "group": "Global capabilities",
          "start": 2025.25,
          "end": 2027,
          "extensionEnd": 2027.25
        },
        {
          "id": "dac-tokenisation-mvp",
          "label": "DAC Tokenisation MVP",
          "group": "Global capabilities",
          "start": 2026.25,
          "end": 2027.25,
          "extensionEnd": 2027.5
        },
        {
          "id": "global-custody",
          "label": "Global Custody (5 +2 PaaS)",
          "group": "Global capabilities",
          "start": 2026.25,
          "end": 2027.5,
          "extensionEnd": 2027.75
        },
        {
          "id": "latam",
          "label": "LatAm (7+1)",
          "group": "Regional rollout",
          "start": 2027,
          "end": 2028
        },
        {
          "id": "apac",
          "label": "APAC (16)",
          "group": "Regional rollout",
          "start": 2027.75,
          "end": 2029.25
        },
        {
          "id": "ceemea",
          "label": "CEEMEA (17)",
          "group": "Regional rollout",
          "start": 2028.5,
          "end": 2029.5
        },
        {
          "id": "emea",
          "label": "EMEA (17)",
          "group": "Regional rollout",
          "start": 2029.25,
          "end": 2030.5
        },
        {
          "id": "us-direct",
          "label": "US Direct",
          "group": "Regional rollout",
          "start": 2029.25,
          "end": 2030.5
        }
      ],
      "milestones": [
        {
          "id": "mahogany-payment-1",
          "label": "Mahogany Payment 1",
          "lane": "Revenue impact",
          "position": 2025.25
        },
        {
          "id": "dac-revenue-starts",
          "label": "DAC Revenue Starts",
          "lane": "Revenue impact",
          "position": 2026.11
        },
        {
          "id": "mahogany-payment-2",
          "label": "Mahogany Payment 2",
          "lane": "Revenue impact",
          "position": 2026.5
        },
        {
          "id": "mahogany-payment-3",
          "label": "Mahogany Payment 3",
          "lane": "Revenue impact",
          "position": 2027.25
        },
        {
          "id": "gc-ops-saves",
          "label": "GC Ops Saves Start",
          "lane": "Ops savings",
          "position": 2027.25
        },
        {
          "id": "apac-ops-saves",
          "label": "APAC Ops Saves Start",
          "lane": "Ops savings",
          "position": 2029.15
        },
        {
          "id": "emea-us-ops-saves",
          "label": "EMEA & US Ops Saves Start",
          "lane": "Ops savings",
          "position": 2030.44
        },
        {
          "id": "latam-secore-retire",
          "label": "LatAm Secore Retire",
          "lane": "Tech savings",
          "position": 2027.83
        },
        {
          "id": "apac-secore-retire",
          "label": "APAC Secore Retire",
          "lane": "Tech savings",
          "position": 2029.26
        },
        {
          "id": "emea-secore-retire",
          "label": "EMEA Secore Retire",
          "lane": "Tech savings",
          "position": 2030.44
        }
      ],
      "dependencies": [
        {
          "from": "foundational",
          "to": "dac-crypto-mvp",
          "label": "DAC Crypto MVP has direct dependency on OneLedger foundational capability being built"
        },
        {
          "from": "global-custody",
          "to": "dac-tokenisation-mvp",
          "label": "DAC Tokenisation MVP requires the full GC functionality to be built out"
        },
        {
          "from": "mahogany-integration",
          "to": "global-custody",
          "label": "Mahogany integration and migration of SWIFT and Tax out of Secore create conditions for GC migration to new infra"
        }
      ]
    },
    "strategy": {
      "title": "Strategic View",
      "note": "",
      "canvas": {
        "width": 3000,
        "height": 1240
      },
      "groups": [
        {
          "id": "ux",
          "label": "Experience and workflow"
        },
        {
          "id": "integration",
          "label": "Integration and data standards"
        },
        {
          "id": "custody",
          "label": "Custody capabilities"
        },
        {
          "id": "cash",
          "label": "Cash, FX and tax"
        },
        {
          "id": "ecosystem",
          "label": "Connected ecosystem"
        }
      ],
      "containers": [
        {
          "id": "custody-ledger-container",
          "label": "Custody Securities Ledger",
          "box": {
            "x": 303,
            "y": 604,
            "w": 521,
            "h": 437
          }
        },
        {
          "id": "cashhub-container",
          "label": "CashHub",
          "box": {
            "x": 1343,
            "y": 604,
            "w": 349,
            "h": 509
          }
        }
      ],
      "components": [
        {
          "id": "smc",
          "label": "Securities Master Central (SMC)",
          "group": "ecosystem",
          "box": {
            "x": 305,
            "y": 20,
            "w": 146,
            "h": 145
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "pmc",
          "label": "Price Master Central (PMC)",
          "group": "ecosystem",
          "box": {
            "x": 465,
            "y": 20,
            "w": 146,
            "h": 145
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "hmc",
          "label": "Holiday Master Central (HMC)",
          "group": "ecosystem",
          "box": {
            "x": 625,
            "y": 20,
            "w": 146,
            "h": 145
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "ssm",
          "label": "SSM",
          "group": "ecosystem",
          "box": {
            "x": 305,
            "y": 212,
            "w": 146,
            "h": 147
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "isgcloud",
          "label": "ISG Cloud",
          "group": "ecosystem",
          "box": {
            "x": 537,
            "y": 279,
            "w": 130,
            "h": 59
          },
          "style": "cloud"
        },
        {
          "id": "isg-cms-adaptor",
          "label": "CMS Adaptor",
          "group": "integration",
          "box": {
            "x": 556,
            "y": 413,
            "w": 91,
            "h": 54
          },
          "style": "adapter",
          "parent": "kafka"
        },
        {
          "id": "ice-ui",
          "label": "ICE UI",
          "group": "ux",
          "box": {
            "x": 824,
            "y": 20,
            "w": 420,
            "h": 129
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 836,
            "y": 25,
            "w": 395,
            "h": 36
          }
        },
        {
          "id": "ice-pre-setts",
          "label": "Pre-Setts Exception Management",
          "group": "ux",
          "box": {
            "x": 842,
            "y": 73,
            "w": 184,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "ice-ui"
        },
        {
          "id": "ice-cmh-ui",
          "label": "CMH User Interface",
          "group": "ux",
          "box": {
            "x": 1043,
            "y": 73,
            "w": 182,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "ice-ui"
        },
        {
          "id": "custody-ui",
          "label": "Custody User Interface",
          "group": "ux",
          "box": {
            "x": 1272,
            "y": 20,
            "w": 1673,
            "h": 129
          },
          "classification": "Consistent with Target",
          "labelBox": {
            "x": 1285,
            "y": 26,
            "w": 1370,
            "h": 36
          }
        },
        {
          "id": "c2p2-ui",
          "label": "C2P2/CashHub User Interface",
          "group": "ux",
          "box": {
            "x": 1294,
            "y": 73,
            "w": 185,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "cdu-ui",
          "label": "CDU User Interface",
          "group": "ux",
          "box": {
            "x": 1502,
            "y": 73,
            "w": 184,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "fxhub-ui",
          "label": "FXHub User Interface",
          "group": "ux",
          "box": {
            "x": 1709,
            "y": 73,
            "w": 184,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "client-service-view",
          "label": "Client Service View",
          "group": "ux",
          "box": {
            "x": 1917,
            "y": 73,
            "w": 183,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "operations-view",
          "label": "Operations View",
          "group": "ux",
          "box": {
            "x": 2124,
            "y": 73,
            "w": 183,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "exceptions-dashboard",
          "label": "Exceptions Dashboard",
          "group": "ux",
          "box": {
            "x": 2331,
            "y": 73,
            "w": 183,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "common-entitlements",
          "label": "Common Entitlements Model",
          "group": "ux",
          "box": {
            "x": 2537,
            "y": 73,
            "w": 183,
            "h": 49
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "custody-ui"
        },
        {
          "id": "uisow",
          "label": "Custody UI & Operational Workflow (UI&OW)",
          "group": "ux",
          "box": {
            "x": 2736,
            "y": 33,
            "w": 187,
            "h": 105
          },
          "classification": "New Utility Module",
          "parent": "custody-ui"
        },
        {
          "id": "secore-2",
          "label": "Secore2.0",
          "group": "ecosystem",
          "box": {
            "x": 824,
            "y": 171,
            "w": 638,
            "h": 187
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 836,
            "y": 175,
            "w": 610,
            "h": 33
          }
        },
        {
          "id": "secore-sec-acc-data",
          "label": "Sec Acc Data & Linkages",
          "group": "ecosystem",
          "box": {
            "x": 843,
            "y": 214,
            "w": 114,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-swift-configs",
          "label": "Client SWIFT Configs",
          "group": "ecosystem",
          "box": {
            "x": 970,
            "y": 214,
            "w": 113,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-tax-table",
          "label": "Tax Table Data",
          "group": "ecosystem",
          "box": {
            "x": 1096,
            "y": 214,
            "w": 106,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-securities-position",
          "label": "Securities Position Data",
          "group": "ecosystem",
          "box": {
            "x": 1214,
            "y": 214,
            "w": 110,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "secore-2"
        },
        {
          "id": "secore-t3branch",
          "label": "T3Branch",
          "group": "ecosystem",
          "box": {
            "x": 1336,
            "y": 214,
            "w": 110,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "secore-2"
        },
        {
          "id": "secore-cash-acc-data",
          "label": "Cash Acc Data & Linkages",
          "group": "ecosystem",
          "box": {
            "x": 843,
            "y": 284,
            "w": 114,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-cash-postings",
          "label": "Cash Postings (H2 & Israel)",
          "group": "ecosystem",
          "box": {
            "x": 970,
            "y": 284,
            "w": 113,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-intraday",
          "label": "Intra-Day Txn Data",
          "group": "ecosystem",
          "box": {
            "x": 1096,
            "y": 284,
            "w": 106,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-2"
        },
        {
          "id": "secore-eod",
          "label": "EOD Txn Data",
          "group": "ecosystem",
          "box": {
            "x": 1213,
            "y": 284,
            "w": 110,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "secore-2"
        },
        {
          "id": "secore-cms-adaptor",
          "label": "CMS Adaptor",
          "group": "integration",
          "box": {
            "x": 1099,
            "y": 404,
            "w": 91,
            "h": 56
          },
          "style": "adapter",
          "parent": "kafka"
        },
        {
          "id": "secore-latam",
          "label": "SecoreLATAM",
          "group": "ecosystem",
          "box": {
            "x": 1480,
            "y": 171,
            "w": 181,
            "h": 187
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 1491,
            "y": 175,
            "w": 160,
            "h": 33
          }
        },
        {
          "id": "latam-tax-table",
          "label": "Tax Table Data MX",
          "group": "ecosystem",
          "box": {
            "x": 1502,
            "y": 214,
            "w": 137,
            "h": 56
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-latam"
        },
        {
          "id": "latam-asset-servicing",
          "label": "Asset Servicing Data(MRA)",
          "group": "ecosystem",
          "box": {
            "x": 1502,
            "y": 285,
            "w": 137,
            "h": 55
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-latam"
        },
        {
          "id": "latam-cms-adaptor",
          "label": "CMS Adaptor",
          "group": "integration",
          "box": {
            "x": 1525,
            "y": 404,
            "w": 91,
            "h": 56
          },
          "style": "adapter",
          "parent": "kafka"
        },
        {
          "id": "secore-apac",
          "label": "SecoreAPAC",
          "group": "ecosystem",
          "box": {
            "x": 1681,
            "y": 171,
            "w": 180,
            "h": 187
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 1692,
            "y": 175,
            "w": 159,
            "h": 33
          }
        },
        {
          "id": "apac-asset-servicing",
          "label": "Asset Servicing Data(MRA)",
          "group": "ecosystem",
          "box": {
            "x": 1703,
            "y": 285,
            "w": 135,
            "h": 55
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "secore-apac"
        },
        {
          "id": "apac-cms-adaptor",
          "label": "CMS Adaptor",
          "group": "integration",
          "box": {
            "x": 1726,
            "y": 404,
            "w": 91,
            "h": 56
          },
          "style": "adapter",
          "parent": "kafka"
        },
        {
          "id": "copes",
          "label": "COPES",
          "group": "ecosystem",
          "box": {
            "x": 1882,
            "y": 171,
            "w": 180,
            "h": 187
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 1893,
            "y": 175,
            "w": 159,
            "h": 33
          }
        },
        {
          "id": "ncs",
          "label": "NCS",
          "group": "ecosystem",
          "box": {
            "x": 2083,
            "y": 171,
            "w": 179,
            "h": 187
          },
          "classification": "Legacy",
          "labelBox": {
            "x": 2094,
            "y": 175,
            "w": 158,
            "h": 33
          }
        },
        {
          "id": "ncs-t3branch",
          "label": "T3Branch",
          "group": "ecosystem",
          "box": {
            "x": 2105,
            "y": 214,
            "w": 126,
            "h": 57
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "ncs"
        },
        {
          "id": "ncs-asset-servicing",
          "label": "Asset Servicing Data(MRA)",
          "group": "ecosystem",
          "box": {
            "x": 2104,
            "y": 285,
            "w": 138,
            "h": 55
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "ncs"
        },
        {
          "id": "ncs-cms-adaptor",
          "label": "CMS Adaptor",
          "group": "integration",
          "box": {
            "x": 2128,
            "y": 404,
            "w": 91,
            "h": 56
          },
          "style": "adapter",
          "parent": "kafka"
        },
        {
          "id": "partners",
          "label": "Partners",
          "group": "ecosystem",
          "box": {
            "x": 2276,
            "y": 195,
            "w": 162,
            "h": 163
          },
          "classification": "Consistent with Target",
          "style": "stack",
          "labelBox": {
            "x": 2282,
            "y": 209,
            "w": 116,
            "h": 100
          }
        },
        {
          "id": "ods",
          "label": "CDS",
          "group": "ecosystem",
          "box": {
            "x": 2455,
            "y": 200,
            "w": 148,
            "h": 158
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green",
          "labelBox": {
            "x": 2468,
            "y": 210,
            "w": 123,
            "h": 65
          }
        },
        {
          "id": "ods-enrich",
          "label": "Enrich",
          "group": "ecosystem",
          "box": {
            "x": 2472,
            "y": 289,
            "w": 115,
            "h": 50
          },
          "style": "function",
          "maturity": "New Function",
          "parent": "ods"
        },
        {
          "id": "sebillnet",
          "label": "SEBILLnet",
          "group": "ecosystem",
          "box": {
            "x": 2634,
            "y": 200,
            "w": 149,
            "h": 158
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green",
          "labelBox": {
            "x": 2644,
            "y": 210,
            "w": 129,
            "h": 65
          }
        },
        {
          "id": "tlm",
          "label": "TLM",
          "group": "ecosystem",
          "box": {
            "x": 2802,
            "y": 203,
            "w": 145,
            "h": 153
          },
          "classification": "Consistent with Target",
          "labelBox": {
            "x": 2812,
            "y": 211,
            "w": 125,
            "h": 60
          }
        },
        {
          "id": "kafka",
          "label": "dRIVE (Kafka)",
          "group": "integration",
          "box": {
            "x": 247,
            "y": 439,
            "w": 2707,
            "h": 147
          },
          "style": "bus",
          "labelBox": {
            "x": 1000,
            "y": 463,
            "w": 1200,
            "h": 100
          }
        },
        {
          "id": "canonical-model",
          "label": "Data Standards Canonical Data Model",
          "group": "integration",
          "box": {
            "x": 267,
            "y": 505,
            "w": 198,
            "h": 56
          },
          "classification": "New Utility Module",
          "parent": "kafka"
        },
        {
          "id": "operating-data",
          "label": "Operating Data",
          "group": "integration",
          "box": {
            "x": 484,
            "y": 505,
            "w": 145,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "kafka"
        },
        {
          "id": "static-data",
          "label": "Static Data",
          "group": "integration",
          "box": {
            "x": 648,
            "y": 505,
            "w": 145,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "kafka"
        },
        {
          "id": "reference-data",
          "label": "Reference Data",
          "group": "integration",
          "box": {
            "x": 811,
            "y": 505,
            "w": 146,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "kafka"
        },
        {
          "id": "cain",
          "label": "CAIN",
          "group": "ecosystem",
          "box": {
            "x": 64,
            "y": 590,
            "w": 146,
            "h": 73
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "transaction-manager",
          "label": "Transaction Manager",
          "group": "ecosystem",
          "box": {
            "x": 32,
            "y": 675,
            "w": 180,
            "h": 77
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green"
        },
        {
          "id": "api-sftp",
          "label": "API/SFTP",
          "group": "ecosystem",
          "box": {
            "x": 32,
            "y": 762,
            "w": 180,
            "h": 76
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green"
        },
        {
          "id": "citiswitch",
          "label": "CitiSwitch",
          "group": "ecosystem",
          "box": {
            "x": 64,
            "y": 850,
            "w": 146,
            "h": 73
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "sfe",
          "label": "Securities Front End(SFE)",
          "group": "custody",
          "box": {
            "x": 319,
            "y": 667,
            "w": 159,
            "h": 146
          },
          "classification": "Consistent with Target",
          "parent": "custody-ledger-container",
          "labelBox": {
            "x": 329,
            "y": 674,
            "w": 139,
            "h": 66
          }
        },
        {
          "id": "sfe-intraday",
          "label": "Intra-Day Txn Data",
          "group": "custody",
          "box": {
            "x": 337,
            "y": 746,
            "w": 124,
            "h": 55
          },
          "style": "function",
          "maturity": "Function Live",
          "parent": "sfe"
        },
        {
          "id": "sfe-t3branch",
          "label": "T3Branch",
          "group": "custody",
          "box": {
            "x": 334,
            "y": 824,
            "w": 129,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "custody-ledger-container"
        },
        {
          "id": "clm",
          "label": "Custody Lifecycle Manager (CLM)",
          "group": "custody",
          "box": {
            "x": 494,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "New Utility Module",
          "parent": "custody-ledger-container"
        },
        {
          "id": "csl",
          "label": "Custody Securities Ledger (CSL)",
          "group": "custody",
          "box": {
            "x": 657,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "New Utility Module",
          "parent": "custody-ledger-container"
        },
        {
          "id": "dacbranch",
          "label": "DACBranch",
          "group": "custody",
          "box": {
            "x": 497,
            "y": 824,
            "w": 290,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "custody-ledger-container"
        },
        {
          "id": "cdu",
          "label": "Custody Data Utility (CDU)",
          "group": "custody",
          "box": {
            "x": 836,
            "y": 666,
            "w": 150,
            "h": 148
          },
          "classification": "New Utility Module",
          "sourceBorder": "green"
        },
        {
          "id": "cdu-t3branch",
          "label": "T3Branch",
          "group": "custody",
          "box": {
            "x": 852,
            "y": 824,
            "w": 129,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev"
        },
        {
          "id": "cmh",
          "label": "Custody Messaging Hub (CMH)",
          "group": "custody",
          "box": {
            "x": 1003,
            "y": 666,
            "w": 150,
            "h": 148
          },
          "classification": "New Utility Module",
          "sourceBorder": "green"
        },
        {
          "id": "cmh-t3branch",
          "label": "T3Branch",
          "group": "custody",
          "box": {
            "x": 1013,
            "y": 824,
            "w": 129,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev"
        },
        {
          "id": "cmh-citiswitch",
          "label": "CitiSwitch",
          "group": "custody",
          "box": {
            "x": 1005,
            "y": 946,
            "w": 146,
            "h": 68
          }
        },
        {
          "id": "amcor",
          "label": "AMCAR",
          "group": "ecosystem",
          "box": {
            "x": 1171,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "amc",
          "label": "Account Master Central (AMC)",
          "group": "ecosystem",
          "box": {
            "x": 1171,
            "y": 832,
            "w": 146,
            "h": 144
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "c2p2",
          "label": "Custody Cash Posting Processor (C2P2)",
          "group": "cash",
          "box": {
            "x": 1361,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "New Utility Module",
          "parent": "cashhub-container"
        },
        {
          "id": "scar",
          "label": "Cash Operating Ledger (SCAR)",
          "group": "cash",
          "box": {
            "x": 1524,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target",
          "parent": "cashhub-container",
          "sourceBorder": "green"
        },
        {
          "id": "scar-t3branch",
          "label": "T3Branch",
          "group": "cash",
          "box": {
            "x": 1524,
            "y": 824,
            "w": 146,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev",
          "parent": "cashhub-container"
        },
        {
          "id": "tts-kafka",
          "label": "TTS Kafka",
          "group": "cash",
          "box": {
            "x": 1358,
            "y": 894,
            "w": 317,
            "h": 39
          },
          "style": "bus",
          "parent": "cashhub-container"
        },
        {
          "id": "flexcube",
          "label": "flexcubes",
          "group": "cash",
          "box": {
            "x": 1357,
            "y": 968,
            "w": 100,
            "h": 55
          },
          "classification": "Legacy",
          "parent": "cashhub-container"
        },
        {
          "id": "strategic-ledger",
          "label": "Strategic Ledger",
          "group": "cash",
          "box": {
            "x": 1467,
            "y": 968,
            "w": 100,
            "h": 55
          },
          "parent": "cashhub-container"
        },
        {
          "id": "pismo",
          "label": "PISMO",
          "group": "cash",
          "box": {
            "x": 1576,
            "y": 968,
            "w": 100,
            "h": 55
          },
          "parent": "cashhub-container"
        },
        {
          "id": "cash-sub-ledger",
          "label": "Cash Sub Ledger",
          "group": "cash",
          "box": {
            "x": 1518,
            "y": 1036,
            "w": 100,
            "h": 55
          },
          "parent": "cashhub-container"
        },
        {
          "id": "fx-hub",
          "label": "FX Hub",
          "group": "cash",
          "box": {
            "x": 1708,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green"
        },
        {
          "id": "fx-t3branch",
          "label": "T3Branch",
          "group": "cash",
          "box": {
            "x": 1716,
            "y": 824,
            "w": 136,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev"
        },
        {
          "id": "fx-infra",
          "label": "FX Infra",
          "group": "cash",
          "box": {
            "x": 1708,
            "y": 1152,
            "w": 146,
            "h": 54
          }
        },
        {
          "id": "bancs",
          "label": "BaNCS",
          "group": "cash",
          "box": {
            "x": 1872,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green"
        },
        {
          "id": "bancs-t3branch",
          "label": "T3Branch",
          "group": "cash",
          "box": {
            "x": 1880,
            "y": 824,
            "w": 133,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev"
        },
        {
          "id": "cts",
          "label": "Citi Tax Suite (CTS)",
          "group": "cash",
          "box": {
            "x": 2036,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target",
          "sourceBorder": "green"
        },
        {
          "id": "cts-t3branch",
          "label": "T3Branch",
          "group": "cash",
          "box": {
            "x": 2044,
            "y": 824,
            "w": 128,
            "h": 56
          },
          "style": "function",
          "maturity": "Function in Dev"
        },
        {
          "id": "otm",
          "label": "Order & Trade Manager (OTM)",
          "group": "custody",
          "box": {
            "x": 2201,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "smi",
          "label": "Securities Market Interface (SMI)",
          "group": "custody",
          "box": {
            "x": 2364,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "token-services",
          "label": "CitiToken Services – Securities (MALT)",
          "group": "custody",
          "box": {
            "x": 2527,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "New Utility Module"
        },
        {
          "id": "digital-asset-custody",
          "label": "CIDAP Digital Asset Custody",
          "group": "custody",
          "box": {
            "x": 2691,
            "y": 667,
            "w": 146,
            "h": 146
          },
          "classification": "New Utility Module"
        },
        {
          "id": "citi-screening",
          "label": "Citi Screening",
          "group": "ecosystem",
          "box": {
            "x": 319,
            "y": 1063,
            "w": 160,
            "h": 73
          },
          "classification": "Consistent with Target"
        },
        {
          "id": "omc",
          "label": "Onboarding Master Central (OMC)",
          "group": "ecosystem",
          "box": {
            "x": 843,
            "y": 1071,
            "w": 146,
            "h": 147
          },
          "classification": "Consistent with Target"
        }
      ],
      "connections": [
        {
          "from": "smc",
          "to": "ssm",
          "direction": "bidirectional",
          "points": [
            {
              "x": 378,
              "y": 165
            },
            {
              "x": 378,
              "y": 212
            }
          ]
        },
        {
          "from": "pmc",
          "to": "isgcloud",
          "direction": "bidirectional",
          "points": [
            {
              "x": 537,
              "y": 165
            },
            {
              "x": 537,
              "y": 201
            },
            {
              "x": 590,
              "y": 201
            },
            {
              "x": 590,
              "y": 279
            }
          ]
        },
        {
          "from": "hmc",
          "to": "isgcloud",
          "direction": "bidirectional",
          "points": [
            {
              "x": 697,
              "y": 165
            },
            {
              "x": 697,
              "y": 201
            },
            {
              "x": 615,
              "y": 201
            },
            {
              "x": 615,
              "y": 279
            }
          ]
        },
        {
          "from": "isgcloud",
          "to": "isg-cms-adaptor",
          "direction": "bidirectional",
          "points": [
            {
              "x": 601,
              "y": 338
            },
            {
              "x": 601,
              "y": 413
            }
          ]
        },
        {
          "from": "ssm",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 378,
              "y": 359
            },
            {
              "x": 378,
              "y": 439
            }
          ]
        },
        {
          "from": "ice-ui",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 824,
              "y": 85
            },
            {
              "x": 793,
              "y": 85
            },
            {
              "x": 793,
              "y": 439
            }
          ],
          "label": "Pre-Setts Exceptions"
        },
        {
          "from": "secore-2",
          "to": "secore-cms-adaptor",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1142,
              "y": 358
            },
            {
              "x": 1142,
              "y": 404
            }
          ]
        },
        {
          "from": "secore-latam",
          "to": "latam-cms-adaptor",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1572,
              "y": 358
            },
            {
              "x": 1572,
              "y": 404
            }
          ]
        },
        {
          "from": "secore-apac",
          "to": "apac-cms-adaptor",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1773,
              "y": 358
            },
            {
              "x": 1773,
              "y": 404
            }
          ]
        },
        {
          "from": "copes",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1972,
              "y": 358
            },
            {
              "x": 1972,
              "y": 439
            }
          ]
        },
        {
          "from": "ncs",
          "to": "ncs-cms-adaptor",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2172,
              "y": 358
            },
            {
              "x": 2172,
              "y": 404
            }
          ]
        },
        {
          "from": "partners",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2375,
              "y": 358
            },
            {
              "x": 2375,
              "y": 439
            }
          ]
        },
        {
          "from": "custody-ui",
          "to": "partners",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2346,
              "y": 149
            },
            {
              "x": 2346,
              "y": 195
            }
          ]
        },
        {
          "from": "ods",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2529,
              "y": 358
            },
            {
              "x": 2529,
              "y": 439
            }
          ]
        },
        {
          "from": "custody-ui",
          "to": "ods",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2529,
              "y": 149
            },
            {
              "x": 2529,
              "y": 200
            }
          ]
        },
        {
          "from": "ods",
          "to": "sebillnet",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2603,
              "y": 279
            },
            {
              "x": 2634,
              "y": 279
            }
          ]
        },
        {
          "from": "sebillnet",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2708,
              "y": 358
            },
            {
              "x": 2708,
              "y": 439
            }
          ]
        },
        {
          "from": "tlm",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2875,
              "y": 356
            },
            {
              "x": 2875,
              "y": 439
            }
          ]
        },
        {
          "from": "transaction-manager",
          "to": "kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 212,
              "y": 696
            },
            {
              "x": 284,
              "y": 696
            },
            {
              "x": 284,
              "y": 586
            }
          ]
        },
        {
          "from": "sfe",
          "to": "transaction-manager",
          "direction": "bidirectional",
          "points": [
            {
              "x": 319,
              "y": 739
            },
            {
              "x": 234,
              "y": 739
            },
            {
              "x": 234,
              "y": 714
            },
            {
              "x": 212,
              "y": 714
            }
          ]
        },
        {
          "from": "sfe",
          "to": "api-sftp",
          "direction": "bidirectional",
          "points": [
            {
              "x": 319,
              "y": 739
            },
            {
              "x": 234,
              "y": 739
            },
            {
              "x": 234,
              "y": 798
            },
            {
              "x": 212,
              "y": 798
            }
          ]
        },
        {
          "from": "sfe",
          "to": "citiswitch",
          "direction": "bidirectional",
          "points": [
            {
              "x": 319,
              "y": 739
            },
            {
              "x": 234,
              "y": 739
            },
            {
              "x": 234,
              "y": 885
            },
            {
              "x": 210,
              "y": 885
            }
          ]
        },
        {
          "from": "kafka",
          "to": "sfe",
          "direction": "bidirectional",
          "points": [
            {
              "x": 398,
              "y": 586
            },
            {
              "x": 398,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "clm",
          "direction": "bidirectional",
          "points": [
            {
              "x": 556,
              "y": 586
            },
            {
              "x": 556,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "csl",
          "direction": "bidirectional",
          "points": [
            {
              "x": 728,
              "y": 586
            },
            {
              "x": 728,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "cdu",
          "direction": "bidirectional",
          "points": [
            {
              "x": 911,
              "y": 586
            },
            {
              "x": 911,
              "y": 666
            }
          ]
        },
        {
          "from": "kafka",
          "to": "cmh",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1077,
              "y": 586
            },
            {
              "x": 1077,
              "y": 666
            }
          ]
        },
        {
          "from": "kafka",
          "to": "c2p2",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1435,
              "y": 586
            },
            {
              "x": 1435,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "scar",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1597,
              "y": 586
            },
            {
              "x": 1597,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "fx-hub",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1780,
              "y": 586
            },
            {
              "x": 1780,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "bancs",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1943,
              "y": 586
            },
            {
              "x": 1943,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "cts",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2108,
              "y": 586
            },
            {
              "x": 2108,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "otm",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2273,
              "y": 586
            },
            {
              "x": 2273,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "smi",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2437,
              "y": 586
            },
            {
              "x": 2437,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "token-services",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2602,
              "y": 586
            },
            {
              "x": 2602,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "digital-asset-custody",
          "direction": "bidirectional",
          "points": [
            {
              "x": 2764,
              "y": 586
            },
            {
              "x": 2764,
              "y": 667
            }
          ]
        },
        {
          "from": "kafka",
          "to": "amcor",
          "direction": "forward",
          "points": [
            {
              "x": 1243,
              "y": 586
            },
            {
              "x": 1243,
              "y": 667
            }
          ]
        },
        {
          "from": "csl",
          "to": "cdu",
          "direction": "bidirectional",
          "points": [
            {
              "x": 803,
              "y": 740
            },
            {
              "x": 836,
              "y": 740
            }
          ]
        },
        {
          "from": "cmh-t3branch",
          "to": "cmh-citiswitch",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1077,
              "y": 880
            },
            {
              "x": 1077,
              "y": 946
            }
          ]
        },
        {
          "from": "c2p2",
          "to": "tts-kafka",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1435,
              "y": 813
            },
            {
              "x": 1435,
              "y": 894
            }
          ]
        },
        {
          "from": "tts-kafka",
          "to": "flexcube",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1407,
              "y": 933
            },
            {
              "x": 1407,
              "y": 968
            }
          ]
        },
        {
          "from": "tts-kafka",
          "to": "strategic-ledger",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1516,
              "y": 933
            },
            {
              "x": 1516,
              "y": 968
            }
          ]
        },
        {
          "from": "tts-kafka",
          "to": "pismo",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1625,
              "y": 933
            },
            {
              "x": 1625,
              "y": 968
            }
          ]
        },
        {
          "from": "fx-t3branch",
          "to": "fx-infra",
          "direction": "bidirectional",
          "points": [
            {
              "x": 1780,
              "y": 880
            },
            {
              "x": 1780,
              "y": 1152
            }
          ]
        }
      ]
    }
  };
}(window));
