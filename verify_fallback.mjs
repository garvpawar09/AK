const { analyzeFoodWithAI } = await import('./services/aiService.js');
const fs = await import('fs');

const log = (...args) => {
    let msg = args.map(arg => {
        try {
            return (typeof arg === 'string') ? arg : JSON.stringify(arg, null, 2);
        } catch (e) {
            return '[Circular/Error]';
        }
    }).join(' ');

    // console.log(msg); 
    try {
        fs.appendFileSync('verif_log.txt', msg + '\n');
    } catch (e) { }
};

console.log = log;
console.error = (...args) => log("ERROR_LOG:", ...args);
console.warn = (...args) => log("WARN_LOG:", ...args);

const runTest = async () => {
    fs.writeFileSync('verif_log.txt', ''); // Clear file
    log("--- Testing Missing Ingredients Fallback ---");

    // Simulate a product with missing ingredients
    const productData = {
        productName: "Coca-Cola Zero Sugar",
        ingredient: "Ingredients not found",
        missingIngredients: true
    };

    const userPreferences = {
        diets: ["vegan"],
        allergies: []
    };

    log(`Analyzing product: ${productData.productName}`);
    try {
        const result = await analyzeFoodWithAI(productData, userPreferences);

        log("\n--- Result ---");
        if (result) {
            log("Status: " + result.status);
            log("Reason: " + result.reason);
            log("Ingredients Found/Estimated: " + (result.ingredient ? "YES" : "NO"));
            log("Ingredient Text: " + (result.ingredient || "N/A"));
        } else {
            log("FAILED: Result is null");
        }
    } catch (e) {
        log("ERROR: " + e.message);
        log(e.stack);
    }
};

runTest();
