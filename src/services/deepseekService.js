import { formatDate } from '../utils/userUtils.js';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const callDeepseekAPI = async (messages, model = 'llama-3.1-8b-instant') => {
    if (!GROQ_API_KEY) {
        throw new Error("Groq API key is missing. Please check your .env file for VITE_GROQ_API_KEY.");
    }
    if (!GROQ_API_KEY.startsWith('gsk_')) {
        throw new Error("Invalid Groq API key format. It should start with 'gsk_'.");
    }

    const payload = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
    };

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Groq API Error Body:", errorBody);
            throw new Error(`Groq API Error: ${errorBody.error?.message || response.statusText}`);
        }

        const result = await response.json();

        if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
        } else {
            console.error("Groq Response Issue:", result);
            const reason = result.choices?.[0]?.finish_reason || "Unknown reason";
            throw new Error(`Failed to extract text from Groq. Finish reason: ${reason}`);
        }
    } catch (error) {
        console.error("Error calling Groq API:", error);
        throw new Error(error.message || "An unexpected error occurred calling the AI service.");
    }
};

export const getChatbotReply = async (chatHistory, systemPrompt) => {
    const messages = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.text
    }));

    const fullMessages = [
        { role: "system", content: systemPrompt },
        ...messages
    ];

    return callDeepseekAPI(fullMessages, 'llama-3.1-8b-instant');
};


export const generateAnnouncement = async ({ title, reason, area, time }) => {
    const prompt = `
        Generate a formal, clear public service announcement for AGWA Water Services.
        Use simple HTML formatting: <p>, <strong>, <ul>, <li>. Output only the HTML content.

        Details:
        - Title/Reason: ${title || reason}
        - Description: ${reason}
        - Affected Area(s): ${area || "All service areas"}
        - Date and Time: ${time || "Effective immediately"}

        Instructions:
        1. Main heading: <strong>${title || reason}</strong>
        2. Explain the situation in a <p> tag.
        3. List key details (Affected Areas, Date/Time) in a <ul> using <strong> for labels.
        4. If it's a service interruption, add a <p> advising customers to store water.
        5. Add a <p> apologizing for inconvenience.
        6. End with <p> containing contact info: "For inquiries, call 1627-AGWA."
        7. Tone: Professional, empathetic.
    `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages);
};

export const refineSupportTicketReply = async ({ ticketDescription, conversationHistory, draftReply, customerName }) => {
    const prompt = `
        You are a support agent for AGWA Water Services.
        Ticket Description: "${ticketDescription}"
        Conversation History (Plain Text):
        ${conversationHistory}
        My draft reply (may contain HTML): "${draftReply}"

        Refine the draft into a formal, clear, helpful response using simple HTML (<p>, <strong>, <ul>, <li>). Address the customer by name (${customerName || 'Valued Customer'}). Output only the refined HTML reply.
    `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages);
};

export const generateTicketSummary = async ({ ticketDescription, conversationHistory }) => {
     const prompt = `
        Summarize this AGWA support ticket interaction concisely (2-3 sentences). Focus on the issue and current status/resolution.
        Initial Issue: "${ticketDescription}"
        Conversation (Plain Text):
        ${conversationHistory}
        Provide only the summary text.
    `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages);
};

export const explainBillWithAI = async ({ billDetails, charges, customerName, serviceType }) => {
    const prompt = `
        You are Agie, AGWA's friendly AI assistant. Explain this water bill to ${customerName || 'Valued Customer'}. Use simple HTML (<p>, <strong>, <ul>, <li>). Output only the HTML explanation.

        Bill Details:
        - Period: ${billDetails.monthYear}
        - Total Due: <strong>₱${billDetails.amount.toFixed(2)}</strong>
        - Due Date: ${formatDate(billDetails.dueDate)}
        - Consumption: <strong>${billDetails.consumption} m³</strong>

        Breakdown:
        <p>Here's a breakdown for ${billDetails.monthYear}:</p>
        <ul>
            <li><strong>Basic Charge (₱${charges.basicCharge.toFixed(2)})</strong>: Cost for ${billDetails.consumption} m³ water used at your '${serviceType}' rate.</li>
            <li><strong>Other Charges</strong>: Includes standard adjustments and fees:
                <ul>
                    <li>FCDA: ₱${charges.fcda.toFixed(2)}</li>
                    <li>Environmental Charge: ₱${charges.environmentalCharge.toFixed(2)}</li>
                    <li>Maintenance Service Charge: ₱${charges.maintenanceServiceCharge.toFixed(2)}</li>
                     ${charges.sewerageCharge > 0 ? `<li>Sewerage Charge: ₱${charges.sewerageCharge.toFixed(2)}</li>` : ''}
                </ul>
            </li>
            <li><strong>Value Added Tax (VAT 12%): ₱${charges.vat.toFixed(2)}</strong></li>
            ${billDetails.previousUnpaidAmount > 0 ? `<li><strong>Previous Unpaid Balance</strong>: ₱${(billDetails.previousUnpaidAmount || 0).toFixed(2)}</li>` : ''}
             ${billDetails.seniorCitizenDiscount > 0 ? `<li><strong>Senior/PWD Discount</strong>: <strong style="color: green;">-₱${(billDetails.seniorCitizenDiscount || 0).toFixed(2)}</strong></li>` : ''}
        </ul>
        <p>Adding these up results in your <strong>Total Amount Due: ₱${billDetails.amount.toFixed(2)}</strong>.</p>
        <p>Please pay by the due date: <strong>${formatDate(billDetails.dueDate)}</strong>.</p>
    `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages);
};

export const categorizeTicketWithAI = async (description, availableCategories) => {
     const categoriesString = availableCategories.join('", "');
     const prompt = `
        Analyze the issue description for AGWA Water Services.
        Choose the single best category from this list: ["${categoriesString}"].
        Respond with *only* the exact category name. If unsure, choose "Other Concern".

        Issue Description: "${description}"
        Category:
     `;
     try {
         const messages = [{ role: "user", content: prompt }];
         let category = await callDeepseekAPI(messages, 'llama-3.1-8b-instant');
         category = category.replace(/["'.*]/g, "").trim();
         if (availableCategories.includes(category)) {
             return category;
         }
         return "Other Concern";
     } catch (error) {
         console.error("AI Categorization failed:", error);
         return "Other Concern";
     }
};

export const draftIssueDescriptionWithAI = async (userInput) => {
     const prompt = `
        Assist an AGWA customer writing an issue report based on their input.
        Elaborate on the input to create a clear, detailed, polite description using simple HTML (<p>, <strong>, <ul>, <li>).
        Ask clarifying questions if needed (e.g., "Please specify the location..."). Output only the HTML description.

        User input: "${userInput}"
        Drafted Description:
     `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages);
};

export const generateChartAnalysis = async (chartTitle, chartData) => {
    const dataString = Array.isArray(chartData) 
        ? JSON.stringify(chartData)
        : JSON.stringify(Object.entries(chartData).map(([key, value]) => ({ [key]: value })));
    const prompt = `
        You are a formal, senior business analyst for AGWA Water Services, writing an internal report.
        Analyze the following dataset for a specific chart and provide a concise, data-driven analysis (2-3 sentences).
        
        - Do NOT use markdown headers (like ##) or titles.
        - The response MUST start with "<strong>Analysis:</strong>".
        - Use a professional, corporate, and technical tone.
        - Explain what the data *implies* for business operations, revenue, or user behavior.
        - Use simple HTML (<p>, <strong>, <em>) for formatting.

        Chart Title: "${chartTitle}"
        Data: ${dataString}
    `;
    const messages = [{ role: "user", content: prompt }];
    return callDeepseekAPI(messages, 'llama-3.1-8b-instant');
};