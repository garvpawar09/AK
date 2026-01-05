import { analyzeFoodWithAI } from './aiService';

// Fallback mock analysis if AI fails or for testing
const mockAnalyze = (product, userPreferences) => {
    // Simple logic: if vegan and product has milk -> NO
    const ingredients = (product.ingredients_text || "").toLowerCase();
    const { diets = [] } = userPreferences || {};

    let status = 'YES';
    let reason = 'Safe to consume based on your profile.';

    if (diets.includes('vegan')) {
        if (ingredients.includes('milk') || ingredients.includes('egg') || ingredients.includes('honey')) {
            status = 'NO';
            reason = 'Contains animal products (milk/egg/honey).';
        }
    }

    return {
        status,
        ingredient: product.ingredients_text || "Unknown Ingredients",
        reason,
        health_score: status === 'YES' ? 90 : (status === 'MODERATE' ? 50 : 20),
        harmful_ingredients: status === 'NO' ? "Contains allergens/unwanted ingredients" : "None"
    };
};

export const lookupProduct = async (barcodeData, userPreferences) => {
    try {
        console.log(`Fetching data for barcode: ${barcodeData}`);
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcodeData}.json`, {
            headers: {
                'User-Agent': 'FoodScannerApp/1.0 (expo-react-native) - Android'
            }
        });
        const data = await response.json();

        if (data.status === 1) {
            const product = data.product;

            // Debugging: Log available keys to help diagnose missing ingredients
            console.log("Product keys:", Object.keys(product).filter(k => k.includes('ingredient')));

            let ingredient = product.ingredients_text_en || product.ingredients_text;

            // Fallback: Try to construct from ingredients array if text is missing
            if (!ingredient && product.ingredients && Array.isArray(product.ingredients)) {
                console.log("Constructing ingredients from array...");
                ingredient = product.ingredients.map(i => i.text).join(", ");
            }

            if (!ingredient) {
                ingredient = "Ingredients not found";
            }

            const imageUri = product.image_url || product.image_front_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80";
            const nutritionImageUri = product.image_nutrition_url || product.image_nutrition_small_url || imageUri;
            const productName = product.product_name || "Unknown Product";

            const productData = {
                productName,
                ingredient,
                imageUri,
                nutritionImageUri,
                missingIngredients: ingredient === "Ingredients not found"
            };

            // Call AI Service
            console.log("Calling Gemini AI service");

            let aiResult = null;

            try {
                aiResult = await analyzeFoodWithAI(productData, userPreferences);

                if (!aiResult) {
                    throw new Error("Gemini returned null");
                }
            } catch (e) {
                console.log("Gemini AI failed, falling back to local logic.", e);
                aiResult = mockAnalyze(product, userPreferences);
            }


            return {
                imageUri,
                productName,
                ingredient, // Default (e.g. "Ingredients not found")
                ...aiResult // AI result overrides 'ingredient' if it found one
            };
        } else {
            console.log("Product not found in Open Food Facts");
            return null; // Product not found
        }
    } catch (error) {
        console.error("API Lookup Error:", error);
        return null;
    }
};

export const analyzeImage = async (imageUri) => {
    // Placeholder for image-based analysis (OCR) if implemented later
    return {
        status: 'MODERATE',
        ingredient: 'Image Analysis Not Implemented',
        reason: 'This feature is coming soon.'
    };
};
