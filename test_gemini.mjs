import { analyzeFoodWithAI } from './services/aiService.js';

const mockProduct = {
    productName: "Test Product",
    ingredient: "Sugar, Water, Artificial Flavor"
};

const mockPreferences = {
    diets: ["vegan"],
    allergies: []
};

console.log("Testing Gemini Integration...");
try {
    const result = await analyzeFoodWithAI(mockProduct, mockPreferences);
    console.log("Result:", JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error:", error);
}
