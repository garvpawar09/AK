const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;


// Helper to convert image URL to base64
const urlToGenerativePart = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64data,
            mimeType: "image/jpeg",
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};

export const analyzeFoodWithAI = async (productData, userPreferences) => {
  try {
    console.log("Analyzing with Model: gemini-2.5-flash-lite (v2)");
    let prompt = "";
    let imagePart = null;
    let tools = [];

    // Check if we need to use vision (ingredients missing) or search
    if (productData.missingIngredients) {
      console.log("Ingredients missing. Strategy: Search Grounding -> Internal Knowledge");

      // Strategy A: Try to find ingredients via Google Search Grounding
      prompt = `
You are a smart nutritionist assistant.
The user scanned a product: "${productData.productName}".
The barcode database did not have the ingredients list.

Please SEARCH THE WEB to find the official ingredients list for "${productData.productName}".
If you find the ingredients, analyze them based on the user's preferences.
If you CANNOT find the exact ingredients online:
1. Estimate the likely ingredients based on your internal knowledge of this product.
2. Clearly state that these are "Estimated Ingredients".

User Preferences:
Diets: ${(userPreferences?.diets || []).join(", ") || "None"}
Allergies: ${(userPreferences?.allergies || []).join(", ") || "None"}

Reply ONLY in JSON:
{
  "status": "YES | NO | MODERATE",
  "reason": "Short reason",
  "details": "More explanation",
  "ingredient": "The found or estimated list of ingredients",
  "health_score": "A number from 0 to 100 representing how healthy it is (100 = Very Healthy, 0 = Unhealthy)",
  "harmful_ingredients": "A short, comma-separated list of ONLY the harmful/unhealthy ingredients found (e.g. 'Sugar, Palm Oil, Red 40'). If none are harmful, return 'None'."
}
`;
      // Enable Google Search Grounding (using googleSearch for Lite compatibility)
      tools = [{ googleSearch: {} }];

    } else if (productData.ingredient === "Ingredients not found" && productData.nutritionImageUri) {
      // ... (existing image logic if needed, but 'missingIngredients' flag should cover this case if we prefer search over image)
      // For now, let's keep search as the primary fallback if missingIngredients is true.
      // If we want to support image analysis as a separate path, we can logic it here.
      // But based on user request "search the web", the above block is priority.
    } else {
      // Text-based analysis (Standard)
      prompt = `
You are a strict nutritionist.

Product: ${productData.productName}
Ingredients: ${productData.ingredient}

User Preferences:
Diets: ${(userPreferences?.diets || []).join(", ") || "None"}
Allergies: ${(userPreferences?.allergies || []).join(", ") || "None"}

Reply ONLY in JSON:
{
  "status": "YES | NO | MODERATE",
  "reason": "Short reason",
  "details": "More explanation",
  "health_score": "A number from 0 to 100 representing how healthy it is (100 = Very Healthy, 0 = Unhealthy)",
  "harmful_ingredients": "A short, comma-separated list of ONLY the harmful/unhealthy ingredients found (e.g. 'Sugar, Palm Oil, Red 40'). If none are harmful, return 'None'."
}
`;
    }

    const contents = [{ parts: [{ text: prompt }] }];

    if (imagePart) {
      contents[0].parts.push(imagePart);
    }

    const makeRequest = async (useTools = false) => {
      console.log("makeRequest called. useTools:", useTools);
      const body = { contents };
      if (useTools) body.tools = tools;

      console.log("Fetching from URL...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);
        console.log("Response received. Status:", response.status);
        const data = await response.json();
        console.log("Data parsed.");
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Fetch Error details:", error);
        throw error;
      }
    };

    let data;
    try {
      // Attempt 1: With Search Tools (if needed)
      if (productData.missingIngredients) {
        console.log("Attempting Gemini with Search Tools...");
        data = await makeRequest(true);
      } else {
        data = await makeRequest(false);
      }

      if (data.error) throw data.error;

    } catch (apiError) {
      console.warn("Gemini API Error (likely Search not supported):", apiError.message || apiError);

      // Attempt 2: Fallback to Internal Knowledge (No Tools)
      if (productData.missingIngredients) {
        console.log("Fallback: Retrying without search tools (Internal Knowledge)...");
        // Slightly modify prompt to be explicit about internal knowledge
        contents[0].parts[0].text += "\n\n(Search failed, please estimate based on internal knowledge.)";
        data = await makeRequest(false);
      } else {
        throw apiError; // Rethrow if it wasn't a search attempt
      }
    }

    if (!data.candidates || !data.candidates[0].content) {
      console.error("Gemini Raw Response:", JSON.stringify(data, null, 2));
      throw new Error("Invalid response from Gemini");
    }

    const text = data.candidates[0].content.parts[0].text;
    const jsonResult = JSON.parse(text.replace(/```json|```/g, "").trim());

    return jsonResult;

  } catch (e) {
    console.error("Gemini error:", e);
    return null;
  }
};

export const chatWithAI = async (productData, userPreferences, history, userQuestion) => {
  try {
    console.log("Chatting with Model: gemini-2.5-flash-lite");

    // Construct context from previous messages if needed, 
    // but for simplicity and token limits, we might just send the current context + question.
    // Ideally we send the conversation history.

    let historyText = "";
    if (history && history.length > 0) {
      historyText = history.map(msg => `${msg.isUser ? "User" : "AI"}: ${msg.text}`).join("\n");
    }

    const prompt = `
You are a smart nutritionist assistant.
The user is asking a question about a food product they just scanned.

Product Context:
- Name: "${productData.productName || "Unknown"}"
- Ingredients: "${productData.ingredient || "Unknown"}"
- Verdict: ${productData.status}
- Harmful Ingredients Found: ${productData.harmful_ingredients || "None"}
- Reason for Verdict: ${productData.reason}

User Preferences:
- Diets: ${(userPreferences?.diets || []).join(", ") || "None"}
- Allergies: ${(userPreferences?.allergies || []).join(", ") || "None"}

Conversation History:
${historyText}

Current User Question:
"${userQuestion}"

Instructions:
1. Answer the user's question directly and concisely.
2. If the user asks "Why", explain the verdict based primarily on the harmful ingredients found.
3. Focus on the *problematic* or *important* ingredients that led to the verdict. Do not list every single ingredient unless asked.
4. Be helpful and friendly, but keep it brief (mobile app context).

Reply with just the text answer.
`;

    const contents = [{ parts: [{ text: prompt }] }];

    const body = { contents };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0].content) {
      console.error("Gemini Chat Error:", JSON.stringify(data, null, 2));
      return "I'm having trouble connecting right now. Please try again.";
    }

    const reply = data.candidates[0].content.parts[0].text;
    return reply;

  } catch (error) {
    console.error("Chat API Error:", error);
    return "Sorry, I couldn't get an answer at the moment.";
  }
};
