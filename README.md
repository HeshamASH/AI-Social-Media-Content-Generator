# Multivra

> Describe your design, and let the AI agents collaborate to design a stunning concept and a detailed rationale for it.

---

## ✨ Key Features

This application transforms your text-based ideas into professional, photorealistic, and inspiring room designs.

-   **Text-to-Design:** Describe your ideal room, and the AI generates a corresponding high-quality image and a detailed design rationale.
-   **Multiple Room Types:** Choose from a variety of common residential spaces, including Living Rooms, Bedrooms, Kitchens, and more.
-   **Customizable Decor Styles:** Select a visual style for your room, such as Modern, Scandinavian, Bohemian, or Minimalist.
-   **Reference-Based Styling:** Upload your own inspiration photos. The AI will analyze their decor style and apply it to your new creation.
-   **AI Interior Designer for Automated Refinement:** An optional advanced workflow where a specialized "Interior Designer" agent (`gemini-2.5-pro`) analyzes the generated room for quality, accuracy, and aesthetics, then issues commands to an editing AI for automated improvements.
-   **Interactive AI Editing:**
    -   **Image Editor:** Modify the generated design with simple text prompts. Ask to "make the sofa green" or "add a gallery wall."
    -   **Text Editor:** Refine the generated design rationale with AI assistance. Tell it to "make this sound more luxurious" or "explain the choice of lighting."
-   **Search Grounding:** Ensure your design rationale incorporates the latest trends. An optional toggle uses Google Search to ground the AI's explanation in current information.

---

## 🚀 How to Use

1.  **Describe Your Vision:** Enter a detailed description of the room you want to visualize.
2.  **Select Room & Style:** Choose the most appropriate room type and a decor style from the provided options.
3.  **Upload Inspiration (Optional):** Upload one or more existing room photos. The AI will analyze their style (colors, furniture, materials) and use it as inspiration.
4.  **Choose Advanced Options (Optional):**
    -   Toggle **"Use Latest Trends"** to ground the design rationale in recent Google Search results.
    -   Toggle **"AI Interior Designer Review"** to enable the AI designer workflow for higher quality (note: this is slower).
5.  **Generate:** Click the "Generate My Design" button.
6.  **Review & Refine:** Use the "✏️ Edit" buttons to make AI-powered adjustments to the final design and its rationale. Save the final image to your computer.

---
## 🧠 AI Agent Workflow

This application uses a sophisticated multi-agent workflow to transform your description into a polished room design.

```
[User Input: Description, Room, Style, Options, Inspiration Images]
           |
           v
[App Orchestrator]
    |
    +-----> [IF Inspiration Images exist] -> [Agent 1: Style Analyst (gemini-2.5-flash)]
    |                                            |
    |                                            v
    |                                            Analyzes images -> Outputs [Style Description]
    |                                                                       |
    |                                                                       v
    +--------------------------------> [Agent 2: Design Writer (gemini-2.5-flash)] ---------> [Design Rationale]
    |                                    (Optionally uses Google Search)      |
    |                                                                         |
    |                                                                         v
    +--------------------------------> [Constructs Final Image Prompt] <-------+
                                                   |
                                                   v
          [Agent 3: Visualizer (imagen-4.0-generate-001)] -> Creates [Base Design Image]
                                                   |
    +--(If 'AI Review' is OFF)-----------+------------------------------------------> [Final Design]
    |
    +--(If 'AI Review' is ON) --> [Agent 4: Interior Designer (gemini-2.5-pro)]
                                                     |
                                                     v
                                                     Analyzes [Base Design] -> Outputs ("PERFECT" or "Edit Prompt")
                                                     |
                                                     +-- (If "PERFECT") ---------------------> [Final Design]
                                                     |
                                                     +-- (If "Edit Prompt") --> [Agent 5: Image Editor (gemini-2.5-flash-image)] -> [Refined Design] -> [Final Design]


[Final Output Displayed to User]
    |
    +-----> [User Edits Rationale] -> [Agent 6: Text Editor (gemini-2.5-flash)] -> [Updated Rationale]
    |
    +-----> [User Edits Design] ----> [Agent 5: Image Editor (gemini-2.5-flash-image)] -> [Updated Design]
```

**Workflow Explanation:**

1.  **Orchestration:** The app gathers all user inputs.
2.  **Style Analysis (Optional):** If inspiration images are provided, a `gemini-2.5-flash` agent analyzes them to create a concise stylistic description (e.g., "scandinavian, minimalist, light wood tones").
3.  **Rationale Generation:** A `gemini-2.5-flash` agent writes a detailed design rationale based on the user's description, using Google Search if requested, to incorporate current trends.
4.  **Image Prompt Construction:** A master prompt is assembled from the user's description, the chosen styles, and the optional AI-generated style description.
5.  **Design Generation:**
    -   The `imagen-4.0-generate-001` agent creates a high-quality base image of the room.
    -   If **"AI Interior Designer Review"** is active:
        -   The `gemini-2.5-pro` agent acts as an **Interior Designer**, analyzing the base image for quality, accuracy, and adherence to the design brief.
        -   It either approves the design ("PERFECT") or issues a concise editing command (e.g., "Change the color of the sofa to a deep navy blue").
        -   If an edit is required, the `gemini-2.5-flash-image` agent executes the command to produce the final, refined design.
6.  **Interactive Editing:** After generation, the user can initiate further refinement loops with dedicated text and image editing agents.

---

## 🛠️ Technology Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **AI Engine:** Google Gemini API
-   **Core Models Used:**
    -   `gemini-2.5-pro`: For advanced design analysis (AI Interior Designer).
    -   `gemini-2.5-flash`: For text generation, style analysis, and AI text editing.
    -   `imagen-4.0-generate-001`: For high-quality base image generation.
    -   `gemini-2.5-flash-image`: For powerful, prompt-based image editing.

---

## 🤖 Core Prompts

### 1. Decor Image Generation

This prompt is sent to `imagen-4.0-generate-001` to produce a photorealistic room image.

```
**Primary Task:** Generate a single, high-quality, photorealistic image of a room's interior design.

**Instructions:**
1.  You are an expert interior design visualizer. Your ONLY output must be a single image of a room.
2.  The room concept is: "${description}".
3.  The room type MUST be: **${type}**.
4.  The primary decor style MUST be: **${style}**.
5.  Emulate this reference style: **${referenceStyle}**
6.  The image should be a beautifully composed, well-lit, and realistic interior photograph. Pay attention to details like textures, shadows, and the way light interacts with surfaces.

**CRITICAL RULES & NEGATIVE PROMPTS:**
*   **DO NOT RENDER ANY TEXT ON THE IMAGE.** No watermarks, labels, or text of any kind.
*   **ABSOLUTELY NO:** people, pets, or clutter unless specifically requested. The focus is on the design.
*   **AVOID:** Distorted perspectives, unrealistic proportions, or blurry results. The image must look like a real photograph from an architecture magazine.
```

### 2. AI Interior Designer Analysis

This prompt gives `gemini-2.5-pro` a strict framework to analyze the generated room and provide precise, actionable edits.

```
You are a meticulous and world-class AI Interior Designer. Your task is to perform a rigorous analysis of a generated room image against its original design prompt. Your goal is to identify any deviations, flaws, or areas for improvement and provide a single, precise, and actionable command for an image editing AI.

**Original Generation Prompt:**
---
${originalPrompt}
---

**Your Analysis and Reasoning Process:**
1.  **Style Adherence:** Does the room's aesthetic accurately reflect the requested decor style?
2.  **Concept Accuracy:** Does the image include the key elements from the user's description?
3.  **Realism & Quality:** Is the lighting believable? Are the textures and materials rendered well?

**Output Instructions:**
*   Provide **only one** of two possible outputs:
    1.  A single, actionable editing command if you find a flaw.
    2.  The exact word "PERFECT" if the room is flawless.
*   **Do not** add explanations or conversational text.

**Example Scenarios (Few-shot learning):**

*   **Scenario 1:** (Analysis: The prompt asked for a "warm throw blanket" but the one in the image is blue.)
    *   **Your Output:** Change the color of the throw blanket on the armchair to a warm, burnt orange color.

*   **Scenario 2:** (Analysis: The design is perfect.)
    *   **Your Output:** PERFECT

Now, analyze the provided room image and provide your output.
```