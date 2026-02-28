import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function koreanizeImage(base64Image: string): Promise<string> {
  try {
    // Remove header if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const model = "gemini-2.5-flash-image";
    const prompt = "Transform the person in this photo to wear traditional Korean Hanbok clothing. " +
      "Detect if the person is a man, woman, boy, or girl and apply the appropriate style. " +
      "STRICTLY MAINTAIN the person's original facial structure, identity, and unique features. DO NOT change their ethnicity or facial traits. " +
      "The person should look exactly like themselves, just wearing a high-quality traditional Hanbok. " +
      "The background should be a blurred traditional Korean palace or nature scene. " +
      "Photorealistic, high quality, 8k resolution, cinematic lighting.";

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    // Extract the image from the response
    // The response structure for image generation usually contains the image in the parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content generated");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image generated in response");
  } catch (error) {
    console.error("Error koreanizing image:", error);
    throw error;
  }
}
