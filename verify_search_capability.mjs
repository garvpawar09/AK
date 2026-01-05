const GEMINI_API_KEY = "AIzaSyDbqpaEqaDApwQbikSCUu1zkZaAzThgRdo";

const testSearch = async () => {
    const prompt = "What are the ingredients of 'Doritos Nacho Cheese'? List them.";

    const contents = [{ parts: [{ text: prompt }] }];
    const tools = [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.7 } } }];

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents, tools })
            }
        );

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
};

testSearch();
