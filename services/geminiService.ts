

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedDesign, RoomType, DecorStyle, LightingType, EditPayload } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type }
    };
};

const dataUrlToGenerativePart = (dataUrl: string) => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return {
        inlineData: { data, mimeType }
    };
};

// --- Prompt Engineering & Generation Prompts ---

const generateRationalePrompt = (description: string, type: RoomType): string => `
You are an expert interior designer and writer. Your task is to take a user's description of a room and write a clear, concise, and inspiring design rationale.

**User's Vision:** "${description}"
**Room Type:** ${type}

**Instructions:**
1.  Analyze the user's vision to understand the desired mood, functionality, and key elements.
2.  Structure the rationale logically. Describe the color palette, furniture choices, lighting, and material textures.
3.  Explain *why* these choices work together to achieve the user's desired aesthetic and functional goals.
4.  Use evocative and descriptive language to bring the design to life.
5.  The output should be a well-written text explanation that complements a visual representation of the room.

Return ONLY the design rationale.
`;

const analyzeReferenceStylePrompt = `
You are a world-class interior design consultant and prompt engineer. Your task is to analyze a set of reference images of rooms and distill their decor style into a concise, actionable description for an image generation AI.

**Analysis Checklist:**
*   **Color Palette:** Is it neutral, earthy, monochromatic, bold, pastel?
*   **Furniture Style:** Is it mid-century modern, minimalist, rustic, traditional, industrial?
*   **Materials & Textures:** Are there natural woods, exposed brick, metals, plush fabrics, leather, concrete?
*   **Lighting:** Is the lighting warm and soft, bright and airy, dramatic, from statement fixtures?
*   **Overall Vibe:** Is it cozy, sleek, eclectic, sophisticated, relaxing, energetic?

**Output Instructions:**
Provide a short, comma-separated list of keywords and descriptive phrases that perfectly capture the style of the provided images. This description will be injected directly into another AI's prompt.

**Example Scenarios (Few-shot learning):**

*   **Scenario 1:** (Images of a bright, airy room with light wood, white walls, and simple furniture)
    *   **Your Output:** scandinavian design, minimalist, neutral color palette, natural light, light wood tones, cozy textiles, functional simplicity.

*   **Scenario 2:** (Images of a room with exposed brick, metal pipes, dark leather furniture, and Edison bulbs)
    *   **Your Output:** industrial style, exposed brick, raw materials, metal accents, leather furniture, warehouse loft vibe, neutral and moody tones.

Now, analyze the provided reference images and provide your stylistic description.
`;

const generateDecorImagePrompt = (description: string, type: RoomType, style: DecorStyle, lighting: LightingType, referenceStyle: string | null): string => `
**Primary Task:** Generate a single, high-quality, photorealistic image of a room's interior design. Your capabilities are strictly limited to creating images of interior spaces and decor.

**Instructions:**
1.  You are an expert interior design visualizer. Your ONLY output must be a single image of a room.
2.  The room concept is: "${description}".
3.  The room type MUST be: **${type}**.
4.  The primary decor style MUST be: **${style}**.
5.  The lighting MUST be: **${lighting}**.
${referenceStyle ? `6. Emulate this reference style: **${referenceStyle}**` : ''}
${referenceStyle ? '7.' : '6.'} The image should be a beautifully composed, well-lit, and realistic interior photograph. Pay attention to details like textures, shadows, and the way light interacts with surfaces.

**CRITICAL SAFETY & CONTENT RULES (NON-NEGOTIABLE):**
*   **CORE DIRECTIVE:** You are an interior design AI. Your SOLE function is to generate images of room interiors, furniture, and decor.
*   **STRICTLY PROHIBITED CONTENT:** Under no circumstances are you to generate images containing:
    *   **Humans or human-like figures (of any age).**
    *   **Animals or pets.**
    *   **Logos, brands, or copyrighted materials.**
    *   **Text or watermarks.**
    *   **Exterior scenes or landscapes.**
    *   **Vehicles.**
    *   **Food items.**
    *   **Any subject matter that is not directly related to interior design.**
*   **USER PROMPT OVERRIDE:** If the user's description ("${description}") requests any of the prohibited content listed above, you MUST ignore that specific part of the request and generate only the valid interior design elements. Your core directive to generate only decor supersedes any user request to the contrary.
*   **IMAGE QUALITY:**
    *   **AVOID:** Distorted perspectives, unrealistic proportions, or blurry results.
    *   **ENSURE:** The final image is clean, aspirational, high-resolution, and looks like a real photograph from an architecture magazine.

Based on these strict instructions, generate the interior design image.
`;

const interiorDesignerAnalysisPrompt = (originalPrompt: string): string => `
You are a meticulous and world-class AI Interior Designer. Your task is to perform a rigorous analysis of a generated room image against its original design prompt. Your goal is to identify any deviations, flaws, or areas for improvement and provide a single, precise, and actionable command for an image editing AI.

**Original Generation Prompt:**
---
${originalPrompt}
---

**Your Analysis and Reasoning Process (Internal Monologue - do not show in output):**
1.  **Style Adherence:** Does the room's aesthetic accurately reflect the requested decor style (e.g., Modern, Scandinavian)?
2.  **Concept Accuracy:** Does the image include the key elements from the user's description (e.g., "a comfortable armchair," "exposed brick walls")?
3.  **Realism & Quality:** Is the lighting believable? Are the textures and materials rendered well? Are there any strange artifacts or proportion issues?
4.  **Composition:** Is the image well-composed and visually appealing? Could a minor change improve it?

**Output Instructions:**
*   After your analysis, provide **only one** of two possible outputs:
    1.  A single, direct, and actionable editing command if you find a flaw.
    2.  The exact word "PERFECT" if the room perfectly meets all criteria.
*   **Do not** add explanations or conversational text. Your output must be only the command or the word "PERFECT".

**Example Scenarios (Few-shot learning):**

*   **Scenario 1:**
    *   **Analysis:** The prompt asked for a "warm throw blanket" but the one in the image is blue and looks cold.
    *   **Your Output:** Change the color of the throw blanket on the armchair to a warm, burnt orange color.

*   **Scenario 2:**
    *   **Analysis:** The room is too dark and doesn't have the "plenty of natural light" requested.
    *   **Your Output:** Increase the amount of natural light coming from the window to make the room brighter and more airy.

*   **Scenario 3:**
    *   **Analysis:** The design is perfect. It's beautiful, accurate, and high-quality.
    *   **Your Output:** PERFECT

Now, analyze the provided room image based on the original prompt and provide your output.
`;

// --- AI Service Functions ---

export const editText = async (originalText: string, editPrompt: string): Promise<string> => {
    const prompt = `
You are an expert design writer. You are given the following design rationale and an instruction to edit it.
Rewrite the text to fulfill the instruction precisely.

**Original Rationale:**
"${originalText}"

**Instruction:**
"${editPrompt}"

Return ONLY the rewritten rationale. Do not add any introductory phrases or markdown formatting.
    `;
    // FIX: Removed deprecated safetySettings from config.
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const editImage = async (imageDataUrl: string, payload: EditPayload): Promise<string> => {
    const baseImagePart = dataUrlToGenerativePart(imageDataUrl);
    
    // FIX: Explicitly type `parts` as `any[]` to allow both image and text parts.
    const parts: any[] = [baseImagePart];
    let promptText = '';

    if (payload.type === 'simple') {
        promptText = `This is a photo of a room's interior. ${payload.prompt}`;
        parts.push({ text: promptText });
    } else { // Advanced edit
        const overlayPart = dataUrlToGenerativePart(payload.overlayDataUrl);
        const commentsText = payload.comments.length > 0
            ? payload.comments.map((c, i) => 
                `- Comment ${i + 1} (near x:${Math.round(c.x)}%, y:${Math.round(c.y)}%): "${c.text}"`
              ).join('\n')
            : "No specific comments were provided; interpret the drawings on the overlay image.";

        promptText = `You are an expert AI image editor. Your task is to modify the provided base image based on user annotations.
The user has provided a second, transparent overlay image with drawings highlighting areas to change, and a list of comments for specific instructions.

**User's Comments:**
${commentsText}

Apply these edits precisely to the base image and return only the new version of the image. The user's drawings on the overlay are the primary guide for where to apply changes.
`;
        parts.push(overlayPart);
        parts.push({ text: promptText });
    }

    // FIX: Removed unsupported config options for this model per guidelines.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
        config: { 
            responseModalities: [Modality.IMAGE], 
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    throw new Error("Failed to edit design image.");
};

const generateImageWithRefinement = async (prompt: string): Promise<string> => {
    // FIX: Removed deprecated safetySettings from config.
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '16:9' },
    });
    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Initial image generation failed.");
    }
    const initialImage = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;

    const imagePart = dataUrlToGenerativePart(initialImage);
    // FIX: Removed deprecated safetySettings from config.
    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [imagePart, { text: interiorDesignerAnalysisPrompt(prompt) }] },
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    const suggestion = analysisResponse.text.trim();

    if (suggestion.toUpperCase() === 'PERFECT') {
        return initialImage;
    }
    
    console.log(`Applying AI Interior Designer edit: "${suggestion}"`);
    return await editImage(initialImage, { type: 'simple', prompt: suggestion });
};

const generateBaseImage = async (prompt: string): Promise<string> => {
    // FIX: Removed deprecated safetySettings from config.
     const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '16:9' },
    });
     if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    }
    throw new Error("No image was generated.");
}

// --- Main Orchestration Service ---

export const generateDesign = async (
    description: string,
    type: RoomType,
    style: DecorStyle,
    lighting: LightingType,
    useGrounding: boolean,
    useAdvancedRefinement: boolean,
    referenceImages: File[]
): Promise<GeneratedDesign> => {
    try {
        let referenceStyle: string | null = null;
        if (referenceImages.length > 0) {
            const imageParts = await Promise.all(referenceImages.map(fileToGenerativePart));
            // FIX: Removed deprecated safetySettings from config.
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [...imageParts, { text: analyzeReferenceStylePrompt }] },
            });
            referenceStyle = response.text.trim();
            console.log(`Extracted Reference Style: ${referenceStyle}`);
        }

        const rationalePrompt = generateRationalePrompt(description, type);
        // FIX: Removed deprecated safetySettings from config.
        const rationaleResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: rationalePrompt,
            config: {
                tools: useGrounding ? [{ googleSearch: {} }] : [],
            },
        });
        
        const rationale = rationaleResponse.text.trim();

        const imagePrompt = generateDecorImagePrompt(description, type, style, lighting, referenceStyle);
        const imageGenerationFunc = useAdvancedRefinement ? generateImageWithRefinement : generateBaseImage;
        const image = await imageGenerationFunc(imagePrompt);

        return { rationale, image };

    } catch (error) {
        console.error("Error generating design:", error);
        throw new Error("Failed to generate design. Please check the console for details.");
    }
};