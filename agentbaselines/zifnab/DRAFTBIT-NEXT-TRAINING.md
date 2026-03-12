# Draftbit Next: AI Tools Training Guide

**Compiled:** 2026-03-03  
**Status:** Comprehensive training reference  
**Target:** Developers, no-code builders, teams  
**Purpose:** Master Draftbit Next AI capabilities from basics to advanced workflows

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Natural Language Prompting](#natural-language-prompting)
3. [AI Agent Capabilities](#ai-agent-capabilities)
4. [Step-by-Step Workflows](#step-by-step-workflows)
5. [Real-World Examples](#real-world-examples)
6. [Integration Patterns](#integration-patterns)
7. [Troubleshooting & Tips](#troubleshooting--tips)
8. [Resource Links](#resource-links)

---

## Core Concepts

### What is Draftbit Next?

Draftbit Next is a complete AI-native rebuild of Draftbit. It combines:

- **Visual drag-and-drop builder** for rapid UI design
- **Natural language → app generation** using Claude Code / Codex
- **Production-ready React Native code export** (no lock-in)
- **Full in-browser code editor** for manual customization
- **One-click publishing** to iOS, Android, and web

### The AI Agent System

Draftbit Next includes an **AI Chat interface** where you can:

- Give natural language instructions to build features
- Reference specific components or files in your messages
- Attach images for visual context
- Choose between different AI backends: **Claude Code** (Anthropic) or **Codex** (OpenAI)
- Set mode: **Full** (agent can modify code) or **Read Only** (analysis only)

**Agent Run Summary** shows:
- Time worked
- Actions taken
- Cost incurred

---

## Natural Language Prompting

### The Five Pillars of Great Prompts

According to Draftbit's official guide, an effective initial prompt should excel at:

1. **Clarity** — use specific words, not vague adjectives
2. **Completeness** — cover goals, users, constraints, edge cases
3. **Context** — point to examples, data, brand voice
4. **Constraints** — name platforms, legal rules, speed targets
5. **Criticality** — separate must-haves from stretch goals

### Prompt Structure Template

```
[Problem Statement]
One paragraph: What problem are you solving? What outcome do you want?

[Audience]
- Who benefits?
- Where will they use it? (mobile, desktop, specific contexts)
- Tech comfort level?

[Core Flows]
Step-by-step description of how users interact with the app:
1. First action user takes
2. What they see next
3. How they complete their goal

[Features]
- Must-haves for v1 (be specific)
- Nice-to-haves for later
- Group related items together
- Define what "done" looks like

[Data & Connections]
- What data do we store? (fields, types)
- Where does it live? (local, cloud, third-party)
- External APIs or services?

[App Quality]
- Performance targets (e.g., "loads in under 2 seconds")
- Accessibility requirements
- Platform guidelines to follow

[Success Metrics]
- How will we know it works? (quantitative if possible)
- User goals to achieve

[Risks & Assumptions]
- Unknowns that could affect scope
- Edge cases to handle
- Constraints that limit options

[Out of Scope]
- Explicitly list what v1 will NOT include
- Prevents scope creep

[References]
- Links to designs (Figma, Sketch)
- API documentation
- Brand guidelines
- Competitor examples
- Sample data
```

### Writing Style Guidelines

- **Answer the basics:** who, what, why, when, where, how
- **Describe steps, not just features**
  - ❌ "Add a login screen"
  - ✅ "User opens app, sees empty dashboard, and taps 'Connect Account'"
- **Include examples:** sample data, sketches, wireframe links
- **One idea per sentence** — avoid run-ons
- **Be concise but complete**

### Self-Check Before Submitting

Run through this quick checklist:

- [ ] Does every feature map to the problem statement?
- [ ] Are must-haves vs. stretch goals unmistakable?
- [ ] Have edge cases and failure states been acknowledged?
- [ ] Could a new teammate understand and execute without follow-up meetings?
- [ ] Are data and privacy notes clear (what's stored and where)?

---

## AI Agent Capabilities

### Available Agents

| Agent | Provider | Best For | Models |
|-------|----------|----------|---------|
| **Claude Code** | Anthropic | Full-stack builds, JS/TS, React Native | Claude 3.5 Sonnet |
| **Codex** | OpenAI | Rapid prototyping, OpenAI ecosystem | GPT-4 variants |
| **Gemini** | Google | Upcoming (not yet live) | — |

### Agent Modes

- **Full Mode:** Agent can add, edit, delete files; make code changes
- **Read Only:** Agent analyzes code, explains, suggests — but doesn't modify

### What the Agent Can Do

#### UI & Components
- Create new screens from templates or scratch
- Add and style components (buttons, lists, forms, maps, media)
- Build navigation stacks (Tabs, Drawer, Stack)
- Apply themes (dark/light mode, color schemes)
- Generate custom JSX components

#### Data & APIs
- Configure REST API connections
- Map API responses to UI components
- Create data transformers and formatters
- Set up GraphQL via Hasura REST endpoints
- Handle authentication headers and tokens

#### Logic & Actions
- Define multi-step workflows (on button press, on screen load)
- Add conditional logic (if/then branching)
- Implement form validation
- Create custom JavaScript functions
- Set up navigation flows

#### Code Editor Support
- Open files from the File Tree
- Suggest edits with autocomplete
- Refactor existing code
- Add third-party packages (via package.json)
- Fix bugs and type errors
- Write tests

### Chat Features

When you type a message, you can:
- **Add component** — select a component from the canvas to reference it
- **Add reference** — attach a file or asset from your project
- **Add attachment** — upload an image (e.g., a mockup you want to replicate)
- **Use saved prompt** — pull from your library of Agent Instructions
- **View thread history** — previous conversations with the agent

---

## Step-by-Step Workflows

### Workflow 1: Starting from Scratch (Blank Project)

1. **Create new project**
   - Click "Create Your First Project"
   - Enter app name and description (use good prompt structure)

2. **Initial AI prompt**
   - Switch to Design view → AI Chat tab
   - Paste your structured prompt (from template above)
   - Select Agent: Claude Code (recommended)
   - Set Mode: Full
   - Click "Send"

3. **Agent builds first iteration**
   - Agent creates screens, components, basic navigation
   - Preview updates in real-time
   - Review Agent Run Summary for time/cost

4. **Iterate**
   - Add specific instructions: "Change the home screen to show a list of todos instead"
   - Reference components: select a button, then say "make this blue"
   - Attach images: upload your Figma mockup and say "replicate this design"

5. **Save/commit changes**
   - Click icon in top bar → "Commit Changes"
   - Add commit message
   - Changes are now in your project history

6. **Export code** (when ready)
   - Menu → "Export Code"
   - Download React Native project

**Tips:**
- Start with a minimal viable prompt; you can refine iteratively
- Use the "Design Blocks" gallery to give the agent a starting visual pattern
- Always preview on a device emulator, not just the canvas

---

### Workflow 2: Integrating a Backend (Hasura/Supabase/Xano)

1. **Set up backend first**
   - Create Hasura project (cloud.hasura.io)
   - Define your GraphQL schema
   - Create REST endpoints for queries (Hasura → REST tab)
   - Note: Draftbit doesn't support GraphQL directly; use REST wrapper

2. **In Draftbit: Add API Resource**
   - Utility Panel → Data tab (or Config for REST component)
   - Create new resource: name = "Hasura" or "Supabase"
   - Base URL: `https://your-project.hasura.app/api/rest`
   - Add headers (Admin secret, Content-Type)
   - Use Global Variables for secrets (Settings → Variables)

3. **Define endpoints**
   - Inside resource, add endpoint: `/get_todos`
   - Method: GET
   - Map to Hasura REST endpoint name
   - Test to verify response

4. **Connect to UI**
   - Drag a "Fetch" component onto screen
   - In Data properties, set feed provider to your endpoint
   - Add a "List" component to iterate over results
   - Bind data: set List item template to use fields from response

5. **Add mutations (POST/PUT)**
   - Use API Request action on button press
   - Configure method, URL, body
   - Map form input values to request body
   - Handle response (show success toast, refresh list)

**Example: Hasura + Draftbit from tutorial**

- Hasura query:
  ```graphql
  query GetUploads {
    upload {
      id
      image {
        url
      }
      created_at
    }
  }
  ```
- Hasura REST endpoint: `GET /api/rest/get_uploads`
- In Draftbit: Fetch component uses that endpoint
- List component iterates over `upload` array
- Image component binds to `item.image.url`

---

### Workflow 3: Custom Code & Advanced Logic

1. **Identify need for custom code**
   - Complex calculations not possible in transformer
   - Third-party library integration
   - Performance optimization
   - Custom native module

2. **Open Code Editor**
   - Click "Code" icon in main menu
   - Browse File Tree to find relevant file
   - Or create new file

3. **Add JavaScript function**
   - Navigate to `utils/` or create `custom.js`
   - Example: date formatter
     ```javascript
     export function formatDate(dateString) {
       const date = new Date(dateString);
       return date.toLocaleDateString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric'
       });
     }
     ```
   - Save file

4. **Use in UI**
   - In Data tab of component, create Custom Transformer
   - Call your function: `formatDate(value)`
   - Or in AI Chat: "Use the `formatDate` utility to format the date field"

5. **Add npm package**
   - Open `package.json` in Code Editor
   - Add dependency:
     ```json
     {
       "dependencies": {
         "date-fns": "^2.30.0"
       }
     }
     ```
   - Save → agent will install package on next build
   - Import and use in code

6. **Create custom JSX component**
   - Create file: `components/CustomCard.js`
   - Write React Native component
   - Export as named export
   - In AI Chat: "Add CustomCard component to home screen" (agent knows to import)

---

### Workflow 4: Debugging & Refactoring

1. **Preview Logs**
   - In Preview Panel, click "Show Preview Logs"
   - See build errors, runtime warnings
   - Click error to jump to file

2. **Ask AI for help**
   - Copy error message
   - In AI Chat: "Fix this error: [paste error]"
   - Attach relevant file(s) using "+ Reference"
   - Set mode to Read Only first if you want explanation, then Full to apply fix

3. **Refactor code**
   - "Extract this repeated logic into a utility function"
   - "Convert this class component to a functional component"
   - "Add TypeScript types to this file"
   - Agent will modify files directly

4. **Code review**
   - Set Agent mode: Read Only
   - "Review this component for performance issues"
   - "Check accessibility compliance on this screen"
   - Agent provides suggestions without modifying

---

### Workflow 5: Publishing & Deployment

1. **One-click publish**
   - Click "Publish" in main menu
   - Choose platform: iOS, Android, or Web
   - Draftbit handles certificates, provisioning profiles
   - Submit to stores automatically

2. **Export code for manual deployment**
   - Menu → "Export Code"
   - Download ZIP with full React Native project
   - Structure follows Expo workflow
   - Can continue in VS Code or other IDE

3. **Post-export customizations**
   - Add native modules not supported in Draftbit
   - Integrate with proprietary build systems
   - Apply security reviews
   - Submit under your own developer accounts

---

## Real-World Examples

### Example 1: Building a Habit Tracker (from review)

**Initial Prompt:**
```
Build a gamified mobile habit tracker app.

Goal: Help users build daily habits through streaks, rewards, and visual progress.

Audience: General consumers, mobile-first, non-technical.

Core Features:
- Create habits (name, frequency, target count)
- Mark habit as complete each day
- Calendar view showing completion history
- Streak counter for each habit
- Badge awards for milestones (7-day, 30-day, etc.)
- Dashboard with stats (current streak, total completions)

Data Model:
- Habit: id, name, frequency (daily/weekly), target
- Completion: date, habit_id
- Badge: name, description, icon, unlock condition
- UserStats: currentStreak, totalCompletions

Design:
- Clean, colorful UI
- Progress rings and animations
- Dark mode support

Out of scope:
- Social features (sharing, friends)
- Notifications (may add later)
- Cloud sync beyond local device

Platforms: iOS and Android, React Native export.

Success: User can create a habit and mark it complete in <10 seconds.
```

**Iterations:**
- "Make the habit list show icons for each habit type"
- "Add a celebration animation when a streak reaches 7 days"
- "Show a circular progress bar on the home screen for today's completion rate"
- "Export the code so I can add push notifications later"

---

### Example 2: Hasura Integration (from tutorial)

**Backend Setup:**
- Hasura GraphQL schema with `upload` table
- REST endpoint: `GET /api/rest/get_uploads` mapped to GraphQL query

**Draftbit steps:**

1. Add API Resource:
   - Name: Hasura
   - Base URL: `https://your-app.hasura.app/api/rest`
   - Header: `x-hasura-admin-secret` = `{{HASURA_SECRET}}` (global variable)

2. Add endpoint in resource:
   - Path: `/get_uploads`
   - Method: GET
   - Test → returns JSON with `upload` array

3. Build UI:
   - Drag Fetch component → set data source to Hasura → `/get_uploads`
   - Add List component → bind to `response.upload`
   - Inside List item: Image, Text (date), Text (filename)
   - Bind Image source to `item.image.url`
   - Bind date Text to `item.created_at` (apply date formatter transformer)
   - Bind filename Text to `item.filename`

4. Custom transformer for date:
   ```javascript
   function formatDate(dateStr) {
     return new Date(dateStr).toLocaleDateString();
   }
   ```

5. Add detail screen:
   - On List item press → navigate to Detail screen
   - Pass `item.id` as route param
   - Detail screen fetches single upload by ID
   - Show full image, full metadata

---

### Example 3: API Integration with Authentication

**Scenario:** Connect to a REST API that requires bearer token

1. **Configure API Resource**
   - Base URL: `https://api.example.com/v1`
   - Add Header: `Authorization` = `Bearer [REDACTED]{{API_TOKEN}}`
   - Store `API_TOKEN` in global variables (Settings → Variables)

2. **Fetch data**
   - Fetch component → endpoint: `/todos`
   - Set method: GET
   - Preview: data loads into list

3. **Create new item**
   - Form with inputs: title, description
   - Button: "Save"
   - On click → API Request action:
     - Method: POST
     - Endpoint: `/todos`
     - Body (JSON):
       ```json
       {
         "title": "{{titleInput.value}}",
         "description": "{{descInput.value}}",
         "completed": false
       }
       ```
   - On success:
     - Show toast: "Todo created!"
     - Refresh the list fetch
     - Navigate back or clear form

4. **Error handling**
   - In API Request, add "On Error" action
   - Show alert with error message
   - Log to console

---

### Example 4: Using Code Editor for Advanced Customization

**Scenario:** Need a custom animated card component

1. **Open Code Editor**
   - Click "Code" in main menu
   - Create folder: `components/custom`
   - New file: `AnimatedCard.js`

2. **Write component**
   ```javascript
   import React from 'react';
   import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';

   export default function AnimatedCard({ title, value, onPress }) {
     const scale = React.useRef(new Animated.Value(1)).current;

     const handlePressIn = () => {
       Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
     };

     const handlePressOut = () => {
       Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
     };

     return (
       <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
         <TouchableOpacity
           onPressIn={handlePressIn}
           onPressOut={handlePressOut}
           onPress={onPress}
           activeOpacity={1}
         >
           <Text style={styles.title}>{title}</Text>
           <Text style={styles.value}>{value}</Text>
         </TouchableOpacity>
       </Animated.View>
     );
   }

   const styles = StyleSheet.create({
     card: {
       backgroundColor: 'white',
       borderRadius: 12,
       padding: 16,
       margin: 8,
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.1,
       shadowRadius: 4,
       elevation: 3,
     },
     title: {
       fontSize: 14,
       color: '#666',
     },
     value: {
       fontSize: 24,
       fontWeight: 'bold',
       marginTop: 4,
     },
   });
   ```

3. **Use in app**
   - In Design view, drag a "Container" component where you want the card
   - In AI Chat: "Replace this container with AnimatedCard component showing 'Net Worth' and '$12,345'"
   - Agent will:
     - Import `AnimatedCard`
     - Replace Container with `<AnimatedCard title="Net Worth" value="$12,345" onPress={() => {}} />`
     - Adjust layout as needed

---

## Integration Patterns

### Pattern 1: API Gateway (Hasura + REST)

Draftbit → REST API → Hasura → GraphQL → Database

**Why:** Draftbit lacks native GraphQL; Hasura REST wrapper bridges the gap

**Steps:**
1. Define GraphQL query in Hasura
2. Create REST endpoint in Hasura Console (map query to endpoint)
3. Add Hasura resource in Draftbit with admin secret
4. Draftbit Fetch component calls REST endpoint
5. Process JSON response, bind to UI

**Pros:** Secure, typed, leverages GraphQL power
**Cons:** Extra layer; REST endpoints need maintenance

---

### Pattern 2: Direct REST + Supabase

Draftbit → Supabase REST (auto-generated from tables)

**Why:** Simpler than Hasura; PostgreSQL with auto-REST

**Steps:**
1. Create Supabase project, define tables
2. Enable Row Level Security if needed
3. Use anon/public key or create service role key
4. In Draftbit: add Supabase resource (base URL + API key header)
5. Endpoints: `/rest/v1/tablename` with query params
6. Use Fetch component + List binding

---

### Pattern 3: External Backend (Xano, Airtable, custom)

Draftbit → External API (any REST service)

**Steps:**
1. Ensure backend has CORS enabled (or use proxy)
2. Add API resource in Draftbit with correct headers
3. Test endpoints in Draftbit API tester
4. Build UI around expected response structure
5. Handle auth (API keys, JWT, OAuth)

---

### Pattern 4: Local Storage + Cloud Sync Later

Draftbit → AsyncStorage (device) → future Firebase/Supabase sync

**Why:** Faster MVP; avoid backend complexity initially

**Steps:**
1. Use built-in Storage components (AsyncStorage)
2. Save data locally on device
3. Design data model to be exportable
4. Later: add Cloud sync via API calls, migrate local data

---

## Troubleshooting & Tips

### Common Issues & Solutions

#### 1. API requests failing in preview
- **Cause:** CORS or missing headers
- **Fix:** Add all required headers in API Resource; check browser console
- **Tip:** Use global variables for secrets to avoid hardcoding

#### 2. Data not binding to List component
- **Cause:** Wrong JSON path selected
- **Fix:** In Data properties, verify the response structure; use correct array field
- **Tip:** Add a Text component showing `{{JSON.stringify(response)}}` to inspect

#### 3. Custom transformer not running
- **Cause:** Not attached to correct property
- **Fix:** Select component → Data tab → choose "Custom" and select your function
- **Tip:** Function must be pure (no side effects) and return a value

#### 4. Agent makes changes I don't want
- **Fix:** Use "Discard Changes" button in Save menu
- **Prevention:** Set agent to Read Only when exploring; only switch to Full when you know what you want
- **Safety:** Commit before major agent changes so you can rollback

#### 5. Build errors in preview
- **Fix:** Click "Show Preview Logs" → read error → attach file in AI Chat and ask agent to fix
- **Common errors:**
  - Missing imports: "Add import for View from 'react-native'"
  - Syntax errors: "Fix the syntax error on line 15"
  - Type mismatches: "Cast this value to string"

---

### Performance Tips

- **Keep component tree shallow** — avoid deeply nested containers
- **Use FlatList** for long lists, not ScrollView with many children
- **Memoize expensive calculations** with `useMemo`
- **Avoid inline functions** in render; define outside or use `useCallback`
- **Optimize images** — compress, use appropriate sizes
- **Lazy load screens** — navigation handles this automatically
- **Async operations** — use `useEffect` with cleanup; prevent memory leaks

---

### Working with the Agent Effectively

#### Good Communication Practices

1. **Be specific:** "Add a blue button with white text that says 'Submit' in the bottom right" not "Add a button"
2. **Reference files:** Use "+ Reference" to point to existing code so agent understands patterns
3. **One change per message:** Instead of "make everything pretty", do "increase padding on all cards" then "change background to light gray"
4. **Give feedback:** "That's close, but make the font size larger" — agent can iterate
5. **Save often:** Commit after agent completes a batch of changes you like

#### When to Use Read Only vs Full Mode

| Scenario | Recommended Mode |
|----------|-------------------|
| Exploring codebase to understand structure | Read Only |
| Asking "how would I implement X?" | Read Only |
| Actually making changes | Full |
| Code review | Read Only |
| Debugging with many iterations | Full (but commit first) |
| Trying a new feature | Full (branched project) |

---

### Version Control & Collaboration

- **Commit messages:** Be descriptive; agent actions are auto-labeled
- **Branching:** Create branches for experimental features (via Git integration)
- **Team roles:** Owner, Editor, Viewer — set appropriately
- **Shared workspaces:** All team members see same preview; agent changes visible in real-time
- **Code export:** When handing off to external developers, export and give them the ZIP

---

### Exporting & Aftermath

**What you get in export:**
- Full React Native project (Expo-based)
- All screens, components, assets
- package.json with all dependencies
- app.json with configuration
- Metro bundler setup

**Post-export tasks:**
1. Run `npm install` in project directory
2. Test on device/simulator: `npx expo start`
3. Inspect any TypeScript errors (Draftbit may not enforce strict TS)
4. Add native modules if needed (may require `pod install` for iOS)
5. Set up your own CI/CD if desired
6. Update app icons and splash screens (Draftbit provides placeholders)
7. Configure app store assets (screenshots, descriptions)

**Common post-export issues:**
- Missing fonts → add manually to project
- Custom fonts not bundled → check `app.json` `expo.fonts`
- API keys hardcoded → move to environment variables
- Third-party packages need native linking → follow package docs

---

## Resource Links

### Official Documentation
- **Draftbit Next:** https://draftbit.com/next
- **Features:** https://draftbit.com/features
- **Pricing:** https://draftbit.com/pricing
- **Help Center:** https://help.draftbit.com/
- **AI App Builder docs:** https://help.draftbit.com/features/ai-app-builder/
- **Code Editor docs:** https://help.draftbit.com/features/code-editor/
- **Writing initial prompts:** https://help.draftbit.com/intro/best-practices/writing-your-initial-prompt/
- **Community tutorials:** https://community.draftbit.com/c/tutorials/

### External Guides
- **Hasura Integration Tutorial:** https://hasura.io/blog/a-tutorial-using-hasura-with-draftbit-a-low-code-tool-for-building-mobile-apps
- **Building an App video series:** https://community.draftbit.com/c/tutorials/building-an-app-in-draftbit-video-series
- **Draftbit Review (Habit Tracker example):** https://www.unite.ai/draftbit-review/

### GitHub
- **Draftbit organization:** https://github.com/draftbit
- **Claude Code:** https://github.com/anthropics/claude-code

### Prompt Engineering Resources
- **Effective Prompts (MIT):** https://mitsloanedtech.mit.edu/ai/basics/effective-prompts/
- **Prompt Engineering Guide:** https://www.promptingguide.ai/
- **OpenAI best practices:** https://platform.openai.com/docs/guides/prompt-engineering

---

## Quick Reference Cheat Sheet

### AI Chat Commands (natural language)

| Goal | Example Prompt |
|------|----------------|
| Create screen | "Create a new screen called 'Settings' with a dark background" |
| Add component | "Add a button in the center that says 'Get Started'" |
| Style component | "Make the button blue with rounded corners and white text" |
| Navigation | "When the button is pressed, navigate to the Profile screen" |
| API integration | "Connect this list to the `/api/todos` endpoint and show title and status" |
| Data transformation | "Format the date to show as 'Mar 3, 2026'" |
| Custom code | "Create a utility function that formats currency" |
| Debugging | "Fix the error: 'undefined is not an object'" |
| Refactoring | "Extract this repeated code into a reusable component" |
| Export | "Download the React Native code" |

---

### File Tree Structure (typical)

```
app/
├── screens/
│   ├── HomeScreen.js
│   ├── SettingsScreen.js
│   └── ProfileScreen.js
├── components/
│   ├── common/
│   │   ├── Button.js
│   │   └── Card.js
│   └── custom/
│       └── AnimatedCard.js
├── utils/
│   ├── formatters.js
│   └── api.js
├── resources/
│   └── api-config.js (API endpoints)
├── assets/
│   ├── images/
│   └── icons/
├── App.js (root)
├── app.json
└── package.json
```

---

## Next Steps

1. **Sign up** for Draftbit Next beta: https://next.draftbit.com
2. **Read** the "Writing your initial prompt" guide thoroughly
3. **Practice** with a simple project (e.g., to-do list) using the templates above
4. **Experiment** with different AI agents (Claude Code vs Codex)
5. **Join** the community: https://community.draftbit.com
6. **Watch** the video tutorials in the community
7. **Review** the Hasura integration tutorial for backend patterns

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-03  
**Maintained By:** Zifnab (ola-claw-main)  
**Location:** `/data/openclaw/workspace/DRAFTBIT-NEXT-TRAINING.md`
