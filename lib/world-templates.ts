import { AppState, initialState } from '@/lib/app-model';

export type WorldTemplateId = 'blank' | 'tutorial';

const tutorialTemplateState: AppState = {
  world: [
    {
      id: 'area_tutorial_hub',
      name: 'Tutorial Hub',
      kind: 'area',
      isolated: false,
      description:
        'This world is a guided tutorial. Follow roads, inspect gates, write journals, and collect backpack items to learn the framework by doing.',
      gates: [],
      subareas: [
        {
          id: 'area_tutorial_framework',
          name: 'The Mindset',
          kind: 'area',
          isolated: false,
          description:
            'Core philosophy of Journey-Map learning: orientation first, challenge through gates, and active learning via walk/train/challenge loops.',
          gates: [
            {
              id: 'gate_framework_premise',
              name: 'Explain the Core Premise',
              description: 'Be able to explain why this framework is map-first, not tutorial-first.',
              approach:
                'Read principle journals, summarize the premise in your own words, then connect it to one real learning goal.',
              prerequisites: [
                {
                  id: 'skill_orientation_basics',
                  type: 'skill',
                  recommendation_level: 4,
                  description: 'Understand world, area, gate, structure, and road terms.',
                  level: 'fundamental',
                },
              ],
              outcomes: [
                {
                  id: 'skill_framework_literacy',
                  description: 'Can apply framework language to plan a learning journey.',
                  level: 'fundamental',
                },
              ],
            },
          ],
          subareas: [
            {
              id: 'structure_tutorial_gate_constraint',
              name: 'Gate Constraint',
              kind: 'structure',
              isolated: false,
              description: 'You enter areas through gates, not by skipping understanding.',
              gates: [],
              subareas: [],
            },
            {
              id: 'structure_tutorial_map_first',
              name: 'Map-First Orientation',
              kind: 'structure',
              isolated: false,
              description: 'The map gives context, priority, and direction before deep execution.',
              gates: [],
              subareas: [],
            },
          ],
        },
        {
          id: 'area_tutorial_map',
          name: 'Map & Navigation',
          kind: 'area',
          isolated: false,
          description:
            'Learn map concepts and zoom flow. Areas can contain sub-areas; structures are concrete leaf concepts; isolated areas sit outside a clean hierarchy.',
          gates: [
            {
              id: 'gate_map_entry',
              name: 'Understand Prerequisites',
              description: 'Enter Map Orientation by understanding how prerequisites and outcomes work.',
              approach:
                'Read prerequisites, open the linked gate note, then mark this gate as attempted/success as you practice.',
              prerequisites: [
                {
                  id: 'skill_orientation_basics',
                  type: 'skill',
                  recommendation_level: 4,
                  description: 'Know the core terms: area, structure, gate, road.',
                  level: 'fundamental',
                },
              ],
              outcomes: [
                {
                  id: 'skill_navigation_flow',
                  description: 'Can navigate by world > area > sub-area with confidence.',
                  level: 'fundamental',
                },
              ],
            },
          ],
          subareas: [
            {
              id: 'area_tutorial_dive',
              name: 'Dive Practice',
              kind: 'area',
              isolated: false,
              description: 'Double-click this area and return using breadcrumbs to practice navigation.',
              gates: [],
              subareas: [
                {
                  id: 'structure_tutorial_leaf',
                  name: 'Leaf Structure',
                  kind: 'structure',
                  isolated: false,
                  description: 'Structures are concrete concepts; they do not contain sub-areas.',
                  gates: [],
                  subareas: [],
                },
              ],
            },
            {
              id: 'structure_tutorial_structure_node',
              name: 'Structure Example',
              kind: 'structure',
              isolated: false,
              description: 'Filled and smaller style: a structure is specific and non-zoomable.',
              gates: [],
              subareas: [],
            },
          ],
        },
        {
          id: 'area_tutorial_gate_lab',
          name: 'Gates & Challenges',
          kind: 'area',
          isolated: false,
          description:
            'Practice building and updating gates: prerequisites, outcomes, mark states, and long-running gate notes.',
          gates: [
            {
              id: 'gate_lab_practice',
              name: 'Create a Real Gate',
              description: 'Create or edit a gate and add at least one prerequisite and one outcome.',
              approach: 'Use the Inspector > Gates section to add/edit data and then set gate mark state.',
              prerequisites: [
                {
                  id: 'area_tutorial_map',
                  type: 'area',
                  recommendation_level: 3,
                  description: 'Understand area vs structure before creating gate logic.',
                  level: 'fundamental',
                },
                {
                  id: 'skill_gate_authoring',
                  type: 'skill',
                  recommendation_level: 2,
                  description: 'Know basic gate fields and recommendation levels.',
                  level: 'intermediate',
                },
              ],
              outcomes: [
                {
                  id: 'skill_gate_authoring',
                  description: 'Can author gates with useful prerequisite descriptions.',
                  level: 'intermediate',
                },
              ],
            },
          ],
          subareas: [],
        },
        {
          id: 'area_tutorial_journal',
          name: 'Your Journal',
          kind: 'area',
          isolated: false,
          description:
            'Journals store reflective and explanatory notes. Link journals to areas when context matters, or leave area null for general notes.',
          gates: [],
          subareas: [],
        },
        {
          id: 'area_tutorial_backpack',
          name: 'The Backpack',
          kind: 'area',
          isolated: true,
          description:
            'Backpack is your reusable loot system: snippets, checklists, formulas, and references. This area is intentionally isolated.',
          gates: [],
          subareas: [],
        },
        {
          id: 'area_tutorial_roads',
          name: 'Roads & Paths',
          kind: 'area',
          isolated: false,
          description: 'Roads encode recommended learning sequences across areas and gates.',
          gates: [],
          subareas: [],
        },
      ],
    },
  ],
  journals: [
    {
      id: 'journal_tutorial_principles',
      area: 'area_tutorial_framework',
      name: 'The Philosophy of Journey-Map',
      description: 'Why this framework exists and how it fixes "Tutorial Hell".',
      tags: ['tutorial', 'principles', 'framework'],
    },
    {
      id: 'journal_tutorial_start',
      area: 'area_tutorial_hub',
      name: 'Welcome Adventurer (Start Here)',
      description: 'A quick guide to moving around the Map.',
      tags: ['tutorial', 'start'],
    },
    {
      id: 'journal_tutorial_gate',
      area: 'area_tutorial_map',
      name: 'Let\'s Talk About Gates',
      description: 'How prerequisites and exams work in Journey-Map.',
      tags: ['tutorial', 'gate'],
    },
    {
      id: 'journal_tutorial_journaling',
      area: 'area_tutorial_journal',
      name: 'The Art of Journaling',
      description: 'How to write good notes and test your understanding.',
      tags: ['tutorial', 'journal'],
    },
    {
      id: 'journal_tutorial_backpack',
      area: 'area_tutorial_backpack',
      name: 'Backpack vs Journal',
      description: 'Where to put your reusable tools and cheat sheets.',
      tags: ['tutorial', 'backpack'],
    },
    {
      id: 'journal_tutorial_roads',
      area: 'area_tutorial_roads',
      name: 'Navigating with Roads',
      description: 'How to piece together a curriculum from the Map.',
      tags: ['tutorial', 'road'],
    },
  ],
  journalContentById: {
    journal_tutorial_principles:
      '# The Philosophy of Journey-Map\n\nWhy does this app exist, and why is it structured this way?\n\nMost note-taking apps are just big folders of text files. That’s fine for storing recipes, but terrible for *learning*. When you learn complex topics, you aren\'t just memorizing facts; you are navigating a vast web of concepts.\n\n### 1. Escape "Tutorial Hell"\nWe often follow tutorials blindly and end up with no idea how the concepts fit together. Journey-Map forces you to build a *Map* of your knowledge.\n\n### 2. Enter through Gates\nYou can\'t just skip to the end of a video here. Notice the **Gates** attached to Areas? A Gate sits at the entrance of an Area and defines the *prerequisites* you need to understand before entering. It\'s a test of your actual knowledge.\n\n### 3. Journal your progress\nYour Journal is your personal logbook. As you explore an Area and fight through its Gates, you write down your struggles, your "Aha!" moments, and your own explanations.\n\nYou are an adventurer. Your learning is the map. Now go explore!\n',
    journal_tutorial_start:
      '# Welcome Adventurer!\n\nYou have just stepped into the **Journey-Map** learning framework. The goal of this app is to help you visualize your learning as an adventure map.\n\n## The Map (Where you are right now)\nYou are currently looking straight at the root of your world.\n- **Areas** are like regions you can explore (the big circles on the map).\n- **Structures** are specific, concrete concepts (smaller building blocks).\n- **Sub-areas** are regions hidden *inside* other regions!\n\n**Try it out:** Go to the map, and double-click the `Map & Navigation` area. You\'ll dive right inside it! Once inside, you can see `Dive Practice`. Double click *that* to go even deeper. Use the breadcrumbs at the top left of the screen to zoom out again.\n\n## Your Next Steps\nTo learn how to use this app, visit each Area in this tutorial map. As you click on an Area, check the journals linked to it to read the lesson. Use the Navigation controls to see the tools at your disposal.\n\nGood luck!\n',
    journal_tutorial_gate:
      '# Let\'s Talk About Gates\n\nWhat is a Gate? Think of it like a tollbooth, an exam, or a boss fight at the entrance of a dungeon.\n\nBefore you can truly master an Area, you must pass its Gate.\n\n## How Gates Work\nWhen you inspect an Area, you\'ll see a list of Gates.\n1. **Prerequisites:** What you must already know before attempting this. (e.g., You need Algebra before Calculus).\n2. **Approach/Description:** How you plan to tackle this challenge.\n3. **Outcomes:** What new skills or knowledge you\'ll gain by succeeding.\n\n## The Gate Status (Marks)\nYou can mark a Gate based on your current progress:\n- **Not Attempted:** You haven\'t tried yet.\n- **Attempted:** You gave it a shot, but it\'s too hard right now.\n- **Challenging:** You are actively fighting this boss right now! You are currently studying this topic.\n- **Success:** You conquered it. You now understand the topic.\n\n*Action Step:* Try clicking on the Gate in the "Gates & Challenges" area and changing its mark to "Success"!\n',
    journal_tutorial_journaling:
      '# The Art of Journaling\n\nYour Journal is not for copy-pasting code or dumping Wikipedia articles. Your Journal is a **record of your thoughts**.\n\nWhen you learn something new, open your Journal and write down:\n1. What was confusing about this topic?\n2. How did you finally understand it? (Use your own words!)\n3. What are you still unsure about?\n\n## Good vs Bad Journal Entries\n\n**❌ Bad Journal Entry:**\n> An array is a data structure consisting of a collection of elements, each identified by at least one array index or key. (Copied from Wikipedia)\n\n**✅ Good Journal Entry:**\n> Arrays are basically just numbered boxes. The weirdest part is that the first box is number 0, not 1! I kept messing up my loops because of this. Note to self: always start counting at 0 when dealing with arrays.\n\nBy writing in your own words, you are testing your own understanding. If you can\'t explain it simply in your Journal, you probably don\'t understand it yet!\n',
    journal_tutorial_backpack:
      '# Backpack vs Journal\n\nIf Journals are for your *thoughts*, what is the Backpack for?\n\n**The Backpack is for your tools.**\n\nAs you explore and learn, you\'ll discover things you want to use over and over again. You don\'t want these buried on page 42 of your Journal.\n\n## What goes in the Backpack?\n- **Snippets:** A useful piece of code you use every day.\n- **Checklists:** A list of steps to deploy a project perfectly.\n- **Cheat Sheets:** A list of keyboard shortcuts for a tool.\n- **Formulas:** Mathematical equations you need to reference often.\n\nWhenever you find a reusable tool, throw it in your Backpack. You can tag it, search it, and pull it out no matter where you are on the Map.\n',
    journal_tutorial_roads:
      '# Navigating with Roads\n\nMaps get big. Sometimes, they get *too* big. If a World has fifty Areas, how do you know where to go next?\n\nThat\'s what **Roads** are for.\n\nA Road is a recommended sequence of Areas and Gates. You can create a Road to sketch out a curriculum for yourself.\n\n## Making a Road\nFor example, a "Frontend Web Dev" Road might look like this:\n1. **Area:** HTML Basics -> Gate: Build a simple webpage\n2. **Area:** CSS Styling -> Gate: Style your webpage\n3. **Area:** JavaScript Basics -> Gate: Make a button click do something\n\nUse Roads to give yourself a clear, step-by-step path through the massive open world of your knowledge.\n',
  },
  backpack: {
    backpack_tutorial_note: {
      id: 'backpack_tutorial_note',
      area: 'area_tutorial_backpack',
      name: 'Welcome to the Backpack',
      descriptions: 'A quick guide on what belongs here.',
      content: '# What goes in the Backpack?\n\nThe Backpack is for *reusable tools*, not your personal journal logs. When you find something you want to reference repeatedly across different areas of your learning journey, put it here.\n\n### Examples:\n- **Snippets:** A useful chunk of code you use every day.\n- **Checklists:** e.g., "Deployment Steps" or "Pre-flight debugging".\n- **Formulas:** Mathematical equations for quick reference.\n- **Vocab:** Niche terminology you need a cheat sheet for.\n',
      tags: ['tutorial', 'backpack'],
    },
    backpack_tutorial_principles_glossary: {
      id: 'backpack_tutorial_principles_glossary',
      area: 'area_tutorial_framework',
      name: 'Framework Glossary',
      descriptions: 'Quick definitions for core app concepts.',
      content:
        '# Core Terminology\n\n- **World:** The entirety of a subject domain (e.g., "Web Development").\n- **Area:** A major topic region (e.g., "JavaScript").\n- **Structure:** A concrete leaf concept you can\'t zoom into anymore.\n- **Gate:** A threshold requiring prerequisites to pass.\n- **Road:** A recommended learning route.\n- **Journal:** Your personal reflections and understanding.\n- **Backpack:** Your inventory of reusable assets.\n',
      tags: ['tutorial', 'glossary', 'principles'],
    },
    backpack_tutorial_gate_checklist: {
      id: 'backpack_tutorial_gate_checklist',
      area: 'area_tutorial_gate_lab',
      name: 'Gate Authoring Checklist',
      descriptions: 'Quality checks before marking a gate as success.',
      content:
        '# Gate Authoring Checklist\n\nBefore marking a Gate as "Success", make sure:\n- [ ] You have linked all necessary **Prerequisite Areas/Skills**.\n- [ ] You have defined what the **Outcome** of this gate is.\n- [ ] If you are stuck, you have captured your thought process in a **Gate Note**.\n- [ ] You have physically updated the **Mark** to "Success" (celebrate!).\n',
      tags: ['tutorial', 'gate', 'checklist'],
    },
    backpack_tutorial_map_template: {
      id: 'backpack_tutorial_map_template',
      area: 'area_tutorial_map',
      name: 'Area Definition Template',
      descriptions: 'Reusable structure for defining new areas quickly.',
      content:
        '# New Area Template\n\n**Definition:** [Briefly define what this area is about]\n\n**Scope:** [What does this cover? What does it NOT cover?]\n\n**Common Gates to Enter:** [e.g., Need to know X before entering here]\n\n**Likely Sub-areas:** [What smaller concepts make up this area?]\n\n**Real-world Application:** [How will I use this?]\n',
      tags: ['tutorial', 'template'],
    },
    backpack_tutorial_road_template: {
      id: 'backpack_tutorial_road_template',
      area: 'area_tutorial_roads',
      name: 'Road Step Template',
      descriptions: 'Simple format for practical road steps.',
      content: '# Road Step Plan\n\n**Step Goal:** [What is the milestone?]\n\n**Recommended Area to visit:** [Link Area]\n\n**Key Gate to pass:** [Link Gate]\n\n**Exit Criteria:** [How will I know I am ready for the next step?]\n',
      tags: ['tutorial', 'road', 'template'],
    },
  },
  gateNotes: {
    'area_tutorial_map::gate_map_entry':
      '# Gate Save Note\n\n**Current blocker:** [Why can\'t I pass this gate right now?]\n\n**What I already tried:** [Methods, tutorials, or problems I attempted]\n\n**What prerequisite seems missing:** [Is there a foundational concept I should review?]\n\n**Next attempt plan:** [What will I do tomorrow?]\n',
    'area_tutorial_gate_lab::gate_lab_practice':
      '# Gate Lab Save\n\n**Draft prerequisites:**\n- [Skill 1]\n- [Skill 2]\n\n**Draft outcomes:**\n- [What can I do now?]\n\n**Decision:**\n- Will I mark this as Success or keep it Blocked? Why?\n',
  },
  skills: [
    {
      id: 'skill_orientation_basics',
      name: 'Orientation Basics',
      description: 'Recognize world, area, structure, gate, and road.',
    },
    {
      id: 'skill_framework_literacy',
      name: 'Framework Literacy',
      description: 'Explain and apply Journey-Map principles to real learning plans.',
    },
    {
      id: 'skill_navigation_flow',
      name: 'Navigation Flow',
      description: 'Move through map levels and keep context while exploring.',
    },
    {
      id: 'skill_gate_authoring',
      name: 'Gate Authoring',
      description: 'Define meaningful prerequisites and outcomes for learning thresholds.',
    },
    {
      id: 'skill_journal_reflection',
      name: 'Reflective Journaling',
      description: 'Capture understanding, confusion, and next actions clearly.',
    },
    {
      id: 'skill_backpack_curation',
      name: 'Backpack Curation',
      description: 'Store reusable assets with tags and useful descriptions.',
    },
  ],
  roads: [
    {
      id: 'road_tutorial_main',
      name: 'First 15 Minutes Walkthrough',
      description: 'Your recommended path to learn how Journey-Map works.',
      areas: [
        {
          id: 'area_tutorial_hub',
          gates: [],
          description: 'Step 1: Read the Welcome Adventurer journal.',
        },
        {
          id: 'area_tutorial_framework',
          gates: ['gate_framework_premise'],
          description: 'Step 2: Read about the Philosophy to understand WHY we are doing this.',
        },
        {
          id: 'area_tutorial_map',
          gates: ['gate_map_entry'],
          description: 'Step 3: Dive deep into the Map by double-clicking map elements.',
        },
        {
          id: 'area_tutorial_gate_lab',
          gates: ['gate_lab_practice'],
          description: 'Step 4: Understand Gates and practice marking one as Success.',
        },
        {
          id: 'area_tutorial_journal',
          gates: [],
          description: 'Step 5: Learn how to write good Journal entries.',
        },
        {
          id: 'area_tutorial_backpack',
          gates: [],
          description: 'Step 6: Discover how to store reusable tools in your Backpack.',
        },
      ],
    },
    {
      id: 'road_tutorial_map_building',
      name: 'The Learning Loop',
      description: 'The core loop you will use every day when studying new things.',
      areas: [
        {
          id: 'area_tutorial_map',
          gates: [],
          description: 'Orient: Look at the Map and figure out where you are.',
        },
        {
          id: 'area_tutorial_gate_lab',
          gates: ['gate_lab_practice'],
          description: 'Challenge: Identify a Gate and try to pass it based on prerequisites.',
        },
        {
          id: 'area_tutorial_journal',
          gates: [],
          description: 'Trace: Journal your thoughts, mistakes, and new understandings.',
        },
        {
          id: 'area_tutorial_backpack',
          gates: [],
          description: 'Curate: Stash any reusable snippets or checklists you discovered.',
        },
      ],
    },
  ],
  marking: {
    area: [
      {
        id: 'area_tutorial_hub',
        mark: 'entered',
        descriptions: 'Onboarding started.',
      },
      {
        id: 'area_tutorial_map',
        mark: 'exploring',
        descriptions: 'Actively learning map navigation and area semantics.',
      },
      {
        id: 'area_tutorial_framework',
        mark: 'entered',
        descriptions: 'Read principles and glossary once to anchor terminology.',
      },
      {
        id: 'area_tutorial_gate_lab',
        mark: 'target',
        descriptions: 'Next stop: practice gate authoring flow.',
      },
    ],
    gate: [
      {
        id: 'gate_map_entry',
        area_id: 'area_tutorial_map',
        mark: 'attempted',
        descriptions: 'Reviewed prerequisites, still refining understanding.',
      },
      {
        id: 'gate_framework_premise',
        area_id: 'area_tutorial_framework',
        mark: 'attempted',
        descriptions: 'Can explain basics; still refining examples from personal learning goals.',
      },
      {
        id: 'gate_lab_practice',
        area_id: 'area_tutorial_gate_lab',
        mark: 'challenging',
        descriptions: 'Currently editing prerequisites and outcomes.',
      },
    ],
  },
};

export function makeWorldTemplateState(templateId: WorldTemplateId): AppState {
  if (templateId === 'blank') {
    return cloneState(initialState);
  }
  return cloneState(tutorialTemplateState);
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}
