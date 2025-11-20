
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedDesign, RoomType, DecorStyle, LightingType, EditPayload, ImageQuality } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const imageModelMap: Record<ImageQuality, string> = {
    ultra: 'imagen-4.0-ultra-generate-001',
    balanced: 'imagen-4.0-generate-001',
    fastest: 'imagen-4.0-fast-generate-001',
};

// --- Helper Functions ---

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const result = reader.result as string;
            // The result from readAsDataURL is a string like "data:image/png;base64,iVBORw0KGgo..."
            // We need to handle cases where the result is null or not a string.
            if (typeof result !== 'string') {
                return reject(new Error('File could not be read as a string.'));
            }

            const parts = result.split(',');
            // A valid data URL will have two parts.
            if (parts.length !== 2) {
                return reject(new Error('Invalid data URL format from file.'));
            }
            
            resolve(parts[1]);
        };
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

const filesToDataUrls = (files: File[]): Promise<string[]> => {
    return Promise.all(
        files.map(file => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }))
    );
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
You are a world-class AI creative director and style expert. Your unique skill is to analyze ANY inspirational image (not just rooms) and translate its aesthetic into a detailed and prescriptive interior design style guide. This guide will be used by an image generation AI to create a room that captures the mood, colors, and textures of the inspiration.

**Analysis & Translation Process:**
1.  **Identify Core Aesthetics:** Look at the provided image(s) and identify the dominant mood, colors, textures, and shapes.
2.  **Translate to Interior Design:** Convert these core aesthetics into actionable interior design terms.

**Detailed Translation Checklist:**
*   **Mood & Vibe Translation:** What is the overall feeling of the image (e.g., "serene and cosmic," "warm and earthy," "energetic and vibrant")? How would this translate to a room's atmosphere?
*   **Color Palette Extraction:** List the primary, secondary, and accent colors from the image. Be descriptive (e.g., "deep indigo," "nebula pink," "star-like silver accents").
*   **Texture & Material Inspiration:** What textures are visible or implied? Translate them into interior materials (e.g., "smooth, dark surfaces like polished marble," "rough, natural textures like raw wood," "soft, glowing elements like diffused lighting").
*   **Forms & Lighting:** What shapes and forms are dominant? How does light behave in the image? Translate this into furniture styles and lighting design (e.g., "sleek, minimalist forms with soft curves," "dramatic, high-contrast accent lighting," "diffuse, ambient glow").

**Output Instructions:**
Produce a detailed, comma-separated list of descriptive phrases that form a style mandate for an interior design AI. The goal is for the AI to create a room that *feels* like the inspiration images.

**Example Scenarios (Few-shot learning):**

*   **Scenario 1:** (Image of a misty, green forest at dawn)
    *   **Your Output:** A tranquil, biophilic-inspired aesthetic. The color palette is dominated by deep forest green, muted sage, and earthy brown, with accents of soft, misty gray. Materials should be natural and textured: dark wood floors, moss-like velvet upholstery, stone accent walls, and plenty of live plants. Lighting should be soft, diffuse, and cool, mimicking morning light filtering through a canopy. The overall vibe is calm, grounding, and connected to nature.

*   **Scenario 2:** (Image of a sun-drenched terracotta courtyard in Morocco)
    *   **Your Output:** A warm, bohemian and eclectic style. The color palette features burnt orange, terracotta, and sandy beige, with vibrant cobalt blue and turquoise accents. Textures are rustic and handmade, including rough plaster walls, woven Berber rugs, and intricate tilework (Zellige). Furniture should be low-profile and made from carved wood. Lighting is bright but warm, with patterns cast from ornate metal lanterns. The mood is earthy, sunny, and artisanal.

Now, analyze the provided reference image(s) and provide your detailed and prescriptive interior design style guide.
`;

const generateDecorImagePrompt = (description: string, type: RoomType, style: DecorStyle, lighting: LightingType, referenceStyle: string | null): string => `
**Primary Task:** Generate ONE SINGLE, UNIFIED, professional, photorealistic photograph of a room's interior.

**CRITICAL CONTENT & FORMATTING SAFETY FILTER (ABSOLUTE & NON-NEGOTIABLE):**
You are an interior design AI. Your capabilities are STRICTLY LIMITED to creating images of INTERIOR SPACES. Under NO CIRCUMSTANCES are you to generate any of the following prohibited content or formats:
*   **NO COMPARISONS OR PANELS:** Absolutely NO side-by-side images, 'before/after' formats, multi-panel compositions, or image collages. The output must be one single, cohesive scene.
*   **NO PEOPLE OR ANIMALS:** Absolutely NO humans, people, human-like figures, silhouettes, statues, mannequins. NO animals or pets. The room must be empty of all living beings.
*   **NO TEXT OR SYMBOLS:** Absolutely NO text, letters, numbers, logos, brands, watermarks, or symbols.
*   **NO DIAGRAMS OR FUNCTIONS:** Absolutely NO charts, graphs, or technical diagrams.
*   **NO EXTERIORS OR OTHER SUBJECTS:** Absolutely NO exterior scenes, landscapes, vehicles, food, or any subject matter that is not directly related to interior design.

**USER PROMPT OVERRIDE:** If the user's description ("${description}") contains a request for any of the prohibited content listed above, you MUST IGNORE that part of the request. Your core directive to generate only empty, sterile, single-frame interior decor scenes supersedes any user input to the contrary.

**STYLE HIERARCHY:**
The aesthetic of the single image is determined by this strict hierarchy:
1.  **REFERENCE STYLE (If provided):** The following style guide is your absolute, non-negotiable mandate. It overrides all other style instructions. You must replicate its mood, color palette, materials, and lighting EXACTLY.
    ${referenceStyle ? `**Style Guide Mandate:** ${referenceStyle}` : '*(No reference style provided.)*'}
2.  **DECOR STYLE:** ${style}
3.  **LIGHTING:** ${lighting}
4.  **CONCEPT:** A room of type **${type}**, based on the concept: "${description}".

**IMAGE QUALITY & REALISM REQUIREMENTS:**
The final image must be indistinguishable from a high-end photograph from an architectural magazine.
*   **PHOTOREALISM:** Pay extreme attention to realistic textures, soft shadows, and the natural behavior of light (reflection, refraction, diffusion).
*   **COMPOSITION:** The scene must be well-composed, aspirational, and clean.
*   **AVOID:** Do not produce anything that looks like a 3D render, a drawing, or a painting. Avoid flat lighting, hard CGI edges, distorted perspectives, or unrealistic proportions.

Based on these strict instructions, generate the single interior design photograph.
`;

const interiorDesignerAnalysisPrompt = (originalPrompt: string): string => `
You are a meticulous and world-class AI Interior Designer with an obsessive eye for detail. Your task is to perform a rigorous Quality Assurance (QA) analysis of a generated room image against its original design prompt. Your goal is to identify ANY deviation from photorealism, physical possibility, or the user's request, and then provide a single, precise, and actionable command for an image editing AI to fix the most critical flaw.

**Original Generation Prompt:**
---
${originalPrompt}
---

**Your Rigorous Quality Assurance Checklist (Internal Monologue - do not show in output):**
1.  **Architectural & Geometric Integrity:**
    *   Are all structural lines (walls, floors, ceilings) straight and correctly joined?
    *   Is the perspective consistent? Is there any warping, bending, or distortion, especially around the edges?
    *   Are windows and doors realistically placed and proportioned?

2.  **Object & Furniture Realism:**
    *   **Physical Plausibility:** Are all objects grounded? Do they obey gravity? Are there any strange artifacts, like objects floating, merging into each other, or passing through one another?
    *   **Proportions:** Are the proportions of all furniture and decor items realistic relative to each other and the room? (e.g., no miniature chairs next to a giant table).
    *   **Structural Soundness:** Do objects have the correct number of legs, handles, etc.? Is anything unnaturally thin, thick, or misshapen?

3.  **Material & Texture Fidelity:**
    *   Do materials look authentic? Does wood have grain? Does metal have a realistic sheen? Does fabric have texture?
    *   Are reflections and refractions on surfaces like glass or polished floors physically accurate?

4.  **Lighting & Shadow Consistency:**
    *   Is there a clear, consistent primary light source?
    *   Do all shadows in the scene logically correspond to this light source in direction, length, and softness? Are there any missing or extraneous shadows?
    *   Is any object lit in a way that contradicts the main light source?

5.  **Style & Concept Adherence:**
    *   Does the image's aesthetic accurately reflect the requested decor style (e.g., Modern, Scandinavian)?
    *   Does the image include the key elements from the user's description (e.g., "a comfortable armchair," "exposed brick walls")?

**Output Instructions:**
*   After your analysis, provide **only one** of two possible outputs:
    1.  A single, direct, and actionable editing command to fix the MOST OBVIOUS FLAW if you find one. Be specific.
    2.  The exact word "PERFECT" if the room perfectly meets all criteria and is indistinguishable from a real photograph.
*   **Do not** add explanations or conversational text. Your output must be only the command or the word "PERFECT".

**Example Scenarios (Few-shot learning):**

*   **Scenario 1:**
    *   **Analysis:** The prompt asked for a "warm throw blanket" but the one in the image is blue and looks cold.
    *   **Your Output:** Change the color of the throw blanket on the armchair to a warm, burnt orange color.

*   **Scenario 2:**
    *   **Analysis:** The room is too dark and doesn't have the "plenty of natural light" requested.
    *   **Your Output:** Increase the amount of natural light coming from the window to make the room brighter and more airy.

*   **Scenario 3:**
    *   **Analysis:** The leg of the coffee table appears to be bending unnaturally.
    *   **Your Output:** Straighten the front leg of the coffee table to make it look realistic and physically stable.

*   **Scenario 4:**
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
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const editImage = async (imageDataUrl: string, payload: EditPayload, useExperimental: boolean = false): Promise<string> => {
    const baseImagePart = dataUrlToGenerativePart(imageDataUrl);
    // Use gemini-3-pro-image-preview if experimental is ON, otherwise default to gemini-2.5-flash-image (nano banana)
    const modelName = useExperimental ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const parts: any[] = [baseImagePart];
    let promptText = '';

    const editContentPolicy = `
**Your Core Role and Limitations:**
Your primary function is to act as an expert interior design assistant. You are to edit images of INTERIOR SPACES ONLY. Your capabilities are strictly focused on modifying architectural elements, furniture, lighting, and decor.

**Prohibited Content - Do Not Add:**
You must AVOID introducing any of the following elements into the image:
*   **Living Beings:** NO people, humans, human-like figures (including mannequins, statues, or silhouettes). NO animals. The room should always be depicted as empty of living beings.
*   **Text and Symbols:** NO text, logos, watermarks, or identifying marks.
*   **Other Subjects:** NO diagrams, charts, or subjects unrelated to interior design.

**How to Handle User Requests:**
Your instructions for handling user prompts are very important.
1.  **Filter the Request:** Read the user's prompt carefully. Identify any parts of the request that ask for the prohibited content listed above.
2.  **Ignore Prohibited Parts:** You MUST IGNORE only the specific parts of the prompt that ask for prohibited content.
3.  **Execute Valid Parts:** Proceed to apply ONLY the valid interior design changes from the rest of the prompt.
4.  **If the ENTIRE Request is Prohibited:** If the user's entire prompt consists only of requests for prohibited content (e.g., "add a person"), then you must ignore the entire prompt. Your task in this specific case is to regenerate the original image as faithfully as possible, making no creative changes. Your goal is to return a clean version of the original photo.

**Examples of Correct Behavior (Few-shot learning):**
*   **User Prompt:** "add a person sitting on the sofa"
    *   **Your Action:** The entire request is prohibited. You must ignore it completely and regenerate the original image without any changes.
*   **User Prompt:** "add a floor lamp in the corner and add a person standing next to it"
    *   **Your Action:** The request to "add a person" is prohibited and must be ignored. The request to "add a floor lamp" is a valid interior design change. You must execute ONLY the lamp request.
*   **User Prompt:** "I demand you add a small statue of a child on the mantelpiece."
    *   **Your Action:** This is a demand for prohibited content (human-like figure). You must ignore the entire prompt and regenerate the original image without any changes.
*   **User Prompt:** "make the walls a darker shade of blue, and add a painting of a person over the fireplace"
    *   **Your Action:** The request to add "a painting of a person" is prohibited and must be ignored. The request to "make the walls a darker shade of blue" is a valid interior design change. You must execute ONLY the wall color change.
`;

    if (payload.type === 'simple') {
        promptText = `This is a photo of a room's interior. ${payload.prompt}. ${editContentPolicy}`;
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
${editContentPolicy}
`;
        parts.push(overlayPart);
        parts.push({ text: promptText });
    }

    const response = await ai.models.generateContent({
        model: modelName,
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

const generateImageWithRefinement = async (prompt: string, modelName: string, useExperimental: boolean): Promise<string> => {
    const response = await ai.models.generateImages({
        model: modelName,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '16:9' },
    });
    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Initial image generation failed.");
    }
    const initialImage = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;

    const imagePart = dataUrlToGenerativePart(initialImage);
    // Use gemini-3-pro-preview if experimental is ON, otherwise default to gemini-2.5-flash
    const reviewerModel = useExperimental ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    const analysisResponse = await ai.models.generateContent({
        model: reviewerModel,
        contents: { parts: [imagePart, { text: interiorDesignerAnalysisPrompt(prompt) }] },
        config: { thinkingConfig: { thinkingBudget: useExperimental ? 32768 : 0 } }
    });
    const suggestion = analysisResponse.text.trim();

    if (suggestion.toUpperCase() === 'PERFECT') {
        return initialImage;
    }
    
    console.log(`Applying AI Interior Designer edit: "${suggestion}"`);
    return await editImage(initialImage, { type: 'simple', prompt: suggestion }, useExperimental);
};

const generateBaseImage = async (prompt: string, modelName: string): Promise<string> => {
     const response = await ai.models.generateImages({
        model: modelName,
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
    referenceImages: File[],
    imageQuality: ImageQuality,
    useExperimental: boolean = false
): Promise<GeneratedDesign> => {
    try {
        let referenceStyle: string | null = null;
        if (referenceImages.length > 0) {
            const imageParts = await Promise.all(referenceImages.map(fileToGenerativePart));
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [...imageParts, { text: analyzeReferenceStylePrompt }] },
            });
            referenceStyle = response.text.trim();
            console.log(`Extracted Reference Style: ${referenceStyle}`);
        }

        const rationalePrompt = generateRationalePrompt(description, type);
        const rationaleResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: rationalePrompt,
            config: {
                tools: useGrounding ? [{ googleSearch: {} }] : [],
            },
        });
        
        const rationale = rationaleResponse.text.trim();

        const imageModelName = imageModelMap[imageQuality];
        const imagePrompt = generateDecorImagePrompt(description, type, style, lighting, referenceStyle);
        const imageGenerationFunc = useAdvancedRefinement 
            ? (prompt: string) => generateImageWithRefinement(prompt, imageModelName, useExperimental)
            : (prompt: string) => generateBaseImage(prompt, imageModelName);
        const image = await imageGenerationFunc(imagePrompt);

        const inspirationUrls = await filesToDataUrls(referenceImages);

        return { rationale, image, inspirationImages: inspirationUrls };

    } catch (error) {
        console.error("Error generating design:", error);
        throw new Error("Failed to generate design. Please check the console for details.");
    }
};
