import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

export interface LlamaResponse {
  text: string;
  confidence: number;
  category: string;
}

export class LlamaService {
  private static instance: LlamaService;
  private isAvailable: boolean = false;

  private constructor() {
    this.checkAvailability();
  }

  public static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  private async checkAvailability(): Promise<void> {
    try {
      // Check if API key is available
      const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
      this.isAvailable = !!(apiKey && apiKey !== 'your_huggingface_api_key_here');
      
      if (!this.isAvailable) {
        console.warn('Llama service disabled: VITE_HUGGINGFACE_API_KEY not configured');
      }
    } catch (error) {
      console.warn('Llama service not available:', error);
      this.isAvailable = false;
    }
  }

  public async generateResponse(
    userMessage: string,
    context: {
      category?: string;
      farmData?: any[];
      userPreferences?: any;
    } = {}
  ): Promise<LlamaResponse> {
    if (!this.isAvailable) {
      throw new Error('Llama service not available');
    }

    try {
      // Create a farming-specific prompt
      const systemPrompt = this.createSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

      // Use Llama model for text generation
      const response = await hf.textGeneration({
        model: 'meta-llama/Llama-2-7b-chat-hf',
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.1,
          return_full_text: false,
        },
      });

      // Extract and clean the response
      const generatedText = response.generated_text?.trim() || '';
      
      return {
        text: this.formatResponse(generatedText, userMessage),
        confidence: 0.85,
        category: this.detectCategory(userMessage),
      };
    } catch (error) {
      console.error('Llama generation error:', error);
      // Don't throw error, let the calling code handle fallback
      throw error;
    }
  }

  private createSystemPrompt(context: any): string {
    return `You are FarmBot, an expert AI agricultural assistant specializing in South African farming. You provide practical, actionable advice for farmers.

Your expertise includes:
- Crop management and cultivation
- Livestock health and breeding
- Pest and disease control
- Soil management and fertilization
- Weather-based farming decisions
- Market prices and agricultural economics
- Government schemes and funding
- Sustainable farming practices

Guidelines:
- Provide specific, actionable advice
- Use South African context (climate, crops, markets)
- Include practical tips and recommendations
- Mention specific products, suppliers, or contacts when relevant
- Be concise but comprehensive
- Use farming terminology appropriately
- Consider local seasons and conditions

${context.category ? `Focus on: ${context.category}` : ''}
${context.farmData ? `Use this farm data for insights: ${JSON.stringify(context.farmData.slice(0, 3))}` : ''}

Respond as a knowledgeable farming expert would.`;
  }

  private formatResponse(text: string, userMessage: string): string {
    // Clean up the response
    let formatted = text
      .replace(/^(Assistant:|AI:|Bot:)/i, '')
      .trim();

    // Add farming-specific formatting
    if (formatted.length < 50) {
      // If response is too short, add more context
      formatted = this.expandShortResponse(formatted, userMessage);
    }

    // Add emojis for better readability
    formatted = this.addFarmingEmojis(formatted);

    return formatted;
  }

  private expandShortResponse(text: string, userMessage: string): string {
    const category = this.detectCategory(userMessage);
    
    const expansions = {
      crop: "For optimal crop management, consider soil testing, proper irrigation scheduling, and integrated pest management practices.",
      livestock: "Ensure regular health checkups, proper nutrition, and maintain clean living conditions for your livestock.",
      weather: "Monitor weather patterns closely and adjust farming activities accordingly. Consider climate-smart agriculture practices.",
      market: "Stay updated with market trends and consider value-addition opportunities to maximize profits.",
      pest: "Implement integrated pest management (IPM) combining biological, cultural, and chemical controls.",
      soil: "Regular soil testing and organic matter addition are key to maintaining soil health and productivity."
    };

    return text + " " + (expansions[category as keyof typeof expansions] || "Consider consulting with local agricultural extension services for personalized advice.");
  }

  private addFarmingEmojis(text: string): string {
    return text
      .replace(/\b(crop|plant|seed|grow)\b/gi, '🌱 $1')
      .replace(/\b(cattle|cow|livestock)\b/gi, '🐄 $1')
      .replace(/\b(weather|rain|drought)\b/gi, '🌦️ $1')
      .replace(/\b(market|price|sell)\b/gi, '💰 $1')
      .replace(/\b(pest|insect|disease)\b/gi, '🐛 $1')
      .replace(/\b(soil|fertilizer)\b/gi, '🌾 $1');
  }

  private detectCategory(message: string): string {
    const keywords = {
      crop: ['crop', 'plant', 'seed', 'harvest', 'grow', 'maize', 'wheat', 'tomato'],
      livestock: ['cattle', 'cow', 'sheep', 'goat', 'chicken', 'livestock', 'animal'],
      pest: ['pest', 'disease', 'insect', 'bug', 'fungus', 'rot', 'blight'],
      weather: ['weather', 'rain', 'drought', 'temperature', 'climate'],
      market: ['price', 'market', 'sell', 'buy', 'profit', 'cost'],
      soil: ['soil', 'fertilizer', 'compost', 'nutrients', 'ph'],
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        return category;
      }
    }
    
    return 'general';
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

export const llamaService = LlamaService.getInstance();